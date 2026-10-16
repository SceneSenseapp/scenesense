// File: app/api/webhooks/stripe/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/firebase";
import { doc, setDoc, serverTimestamp, increment } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;

        // Skip recording to Firestore if it's an unauthenticated guest
        if (userId && userId !== "anonymous_operative" && userId !== "anonymous") {
          const userRef = doc(db, "users", userId);
          
          await setDoc(
            userRef,
            {
              hasFuelSupporterBadge: true,
              lastFueledAt: serverTimestamp(),
              totalFueledUSD: increment(amountTotal),
              stripeCustomerId: session.customer || null,
            },
            { merge: true }
          );

          console.log(`[Stripe] Radar fuel logged: $${amountTotal} for operative ID: ${userId}`);
        } else {
          console.log(`[Stripe] Anonymous radar fuel received: $${amountTotal}`);
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Stripe Webhook Error]:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}