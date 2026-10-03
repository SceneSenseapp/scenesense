import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } else {
      event = JSON.parse(payload);
    }
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId), {
          tier: 'pro',
          stripeCustomerId: session.customer,
          updatedAt: new Date(),
        }, { merge: true });
        console.log(`Operative ${userId} successfully upgraded to VIP Pro via webhook.`);
      } catch (dbError) {
        console.error("Failed to update user tier in Firestore:", dbError);
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}