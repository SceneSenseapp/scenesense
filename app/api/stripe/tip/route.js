// File: app/api/stripe/tip/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Payment gateway configuration offline (missing STRIPE_SECRET_KEY).' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { amount, userId, userEmail } = body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      return NextResponse.json(
        { error: 'Invalid contribution amount. Minimum tip is $1.00 USD.' },
        { status: 400 }
      );
    }

    // Defensive Origin Resolution
    let origin = req.headers.get('origin');
    if (!origin && req.headers.get('referer')) {
      try {
        origin = new URL(req.headers.get('referer')).origin;
      } catch {
        origin = null;
      }
    }
    origin = origin || process.env.NEXT_PUBLIC_BASE_URL || 'https://scenesense.app';

    const stripe = new Stripe(stripeKey);
    const unitAmountCents = Math.round(parsedAmount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'SceneSense Studio // Community Server Tip',
              description:
                'Voluntary community tip to support server hosting, domain operations, and Gemini intelligence models. Does not purchase commercial media or gate TMDB services.',
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      client_reference_id: userId || 'anonymous_operative',
      metadata: {
        userId: userId || 'anonymous',
        type: 'community_tip',
        amount: String(parsedAmount),
      },
      success_url: `${origin}/profile?tip_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?tip_cancelled=true`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error('Stripe Tip Checkout Error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment uplink failed.' },
      { status: 500 }
    );
  }
}