// File: app/api/webhooks/stripe/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminServices, FieldValue } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    console.error("[Stripe Webhook] Server configuration missing secret keys.");
    return NextResponse.json({ error: "Gateway unconfigured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { db } = getAdminServices();
  if (!db) {
    return NextResponse.json({ error: "Firestore Admin unavailable" }, { status: 503 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        const transactionType = session.metadata?.type;
        const isSubscription =
          session.mode === "subscription" || session.metadata?.plan === "vip_founder";

        if (userId && userId !== "anonymous_operative" && userId !== "anonymous") {
          const userRef = db.collection("users").doc(userId);

          if (isSubscription) {
            await userRef.set(
              {
                tier: "pro",
                isPro: true,
                isVip: true,
                stripeCustomerId: session.customer || null,
                stripeSubscriptionId: session.subscription || null,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            console.log(`[Stripe] Operative ${userId} upgraded to VIP Pro subscription.`);
          } else if (transactionType === "community_tip" || amountTotal > 0) {
            const bonusCoins = Math.max(50, Math.round(amountTotal * 100));
            await userRef.set(
              {
                isSupporter: true,
                hasFuelSupporterBadge: true,
                equippedTitle: "Patron of the Grid",
                equippedFrame: "frame_solar_gold",
                lastFueledAt: FieldValue.serverTimestamp(),
                totalFueledUSD: FieldValue.increment(amountTotal),
                totalTippedUsd: FieldValue.increment(amountTotal),
                coins: FieldValue.increment(bonusCoins),
                tokens: FieldValue.increment(bonusCoins),
                walletBalance: FieldValue.increment(bonusCoins),
                stripeCustomerId: session.customer || null,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            await db.collection("studio_tips").add({
              userId,
              sessionId: session.id,
              amount: amountTotal,
              currency: session.currency || "usd",
              customerEmail: session.customer_details?.email || session.customer_email || null,
              createdAt: FieldValue.serverTimestamp(),
            });

            console.log(`[Stripe] Supporter tip recorded: $${amountTotal} USD for ${userId}`);
          }
        } else {
          console.log(`[Stripe] Anonymous tip received: $${amountTotal} USD`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const snapshot = await db
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            tier: "free",
            isPro: false,
            isVip: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`[Stripe] Subscription ended. Operative ${userDoc.id} returned to free tier.`);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Stripe Webhook Error]:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
