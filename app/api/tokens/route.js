// File: app/api/tokens/route.js
import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Force dynamic execution so Next.js build never evaluates static environment variables
export const dynamic = 'force-dynamic';

function getFirebaseAdmin() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      initializeApp();
    }
  }

  return getFirestore();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, amount, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const tokenChange = Number(amount) || 0;
    const db = getFirebaseAdmin();
    const userRef = db.collection('users').doc(userId);

    if (action === 'deduct') {
      await userRef.set(
        {
          tokens: FieldValue.increment(-Math.abs(tokenChange)),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      // Default: credit/add tokens
      await userRef.set(
        {
          tokens: FieldValue.increment(Math.abs(tokenChange)),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const updatedDoc = await userRef.get();
    const currentTokens = updatedDoc.data()?.tokens ?? 0;

    return NextResponse.json({
      success: true,
      userId,
      tokens: currentTokens,
    });
  } catch (error) {
    console.error('Tokens API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const db = getFirebaseAdmin();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ userId, tokens: 0 });
    }

    return NextResponse.json({
      userId,
      tokens: userDoc.data()?.tokens ?? 0,
    });
  } catch (error) {
    console.error('Tokens Fetch Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}