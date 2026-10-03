import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    // Read the request body ONCE safely
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Fallback if body is empty or malformed
    }

    const { priceId, userId, userEmail } = body;
    const origin = request.headers.get('origin') || 'https://scenesense.ai';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ui_mode: 'hosted',
      customer_email: userEmail || undefined,
      success_url: `${origin}/profile?success=true`,
      cancel_url: `${origin}/profile?canceled=true`,
      line_items: [
        {
          price: priceId || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_VIP,
          quantity: 1,
        },
      ],
      billing_address_collection: 'auto',
      payment_method_collection: 'always',
      allow_promotion_codes: false,
      metadata: {
        userId: userId || 'anonymous',
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}