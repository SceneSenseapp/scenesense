// File: app/api/checkout/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { priceId, userId, userEmail } = body;

    // Resolves priceId from payload or falls back to server env STRIPE_PRICE_ID_VIP
    const activePriceId = priceId || process.env.STRIPE_PRICE_ID_VIP;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId telemetry: User must be authenticated.' },
        { status: 400 }
      );
    }

    if (!activePriceId) {
      return NextResponse.json(
        { error: 'Configuration error: STRIPE_PRICE_ID_VIP is not defined in server environment.' },
        { status: 500 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      client_reference_id: userId,
      customer_email: userEmail || undefined,
      line_items: [
        {
          price: activePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan: 'vip_founder',
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
      success_url: `${origin}/profile?session_id={CHECKOUT_SESSION_ID}&vip_upgrade=success`,
      cancel_url: `${origin}/profile?vip_upgrade=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout session creation failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Unable to initiate checkout uplink.' },
      { status: 500 }
    );
  }
}