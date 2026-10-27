// File: app/api/checkout/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Payment gateway configuration offline (missing STRIPE_SECRET_KEY).' },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const body = await req.json().catch(() => ({}));
    const { amount, userId, userEmail } = body;

    // Resolve tip amount (minimum $1.00 USD, default $5.00)
    const tipAmount = typeof amount === 'number' && amount >= 1 ? amount : 5;
    const unitAmountCents = Math.round(tipAmount * 100);

    // Resolve dynamic request origin for return URLs
    const requestOrigin = req.headers.get('origin') || 
                          process.env.NEXT_PUBLIC_BASE_URL || 
                          'https://scenesense.app';

    // Voluntary Community Support Session (One-time donation complying with TMDB terms)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: userId || undefined,
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'SceneSense Studio Fuel // Community Support',
              description: 'Voluntary contribution to offset hosting, domain, and server operational costs. Does not purchase media subscriptions or unlock TMDB data.',
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId || 'anonymous',
        donationType: 'voluntary_fuel_tip',
        amount: String(tipAmount),
      },
      success_url: `${requestOrigin}/profile?tip=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${requestOrigin}/?tip=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Support Checkout session creation failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Unable to initiate contribution uplink.' },
      { status: 500 }
    );
  }
}