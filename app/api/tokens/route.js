// File: app/api/tokens/route.js
import { NextResponse } from "next/server";
import {
  getAdminServices,
  FieldValue,
  verifyCallerIdentity,
} from "@/lib/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLIENT_REWARD_COINS = 50;
const MAX_CLIENT_REWARD_XP = 100;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      userId: explicitUserId,
      amount = 0,
      action = "reward",
      reason = "gameplay",
      xpGain = 0,
      recipientUid,
    } = body;

    const { authorized, uid: callerUid } = await verifyCallerIdentity(
      request,
      explicitUserId || null
    );

    if (!authorized || !callerUid) {
      return NextResponse.json(
        { error: "Unauthorized operative identity" },
        { status: 401 }
      );
    }

    const isInternal = callerUid === "internal-system";
    const targetUserId = isInternal ? explicitUserId : callerUid;

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "Missing operative identity" },
        { status: 400 }
      );
    }

    const { db } = getAdminServices();
    if (!db) {
      return NextResponse.json(
        { error: "Firestore Admin service unavailable" },
        { status: 503 }
      );
    }

    const rawAmount = Math.abs(Number(amount) || 0);
    const rawXp = Math.abs(Number(xpGain) || 0);
    const isMintAction =
      action === "reward" || action === "credit" || action === "add";

    const tokenChange =
      isMintAction && !isInternal
        ? Math.min(rawAmount, MAX_CLIENT_REWARD_COINS)
        : rawAmount;
    const xpChange = !isInternal
      ? Math.min(rawXp, MAX_CLIENT_REWARD_XP)
      : rawXp;

    const userRef = db.collection("users").doc(targetUserId);

    if (tokenChange === 0 && xpChange === 0) {
      const userDoc = await userRef.get();
      const currentCoins = userDoc.exists
        ? userDoc.data()?.coins ?? userDoc.data()?.tokens ?? 100
        : 100;
      const currentXp = userDoc.exists ? userDoc.data()?.xp ?? 0 : 0;
      return NextResponse.json({
        success: true,
        userId: targetUserId,
        coins: currentCoins,
        tokens: currentCoins,
        xp: currentXp,
        delta: 0,
      });
    }

    // Atomic transaction ensures balances never drop below zero and prevents race conditions
    const finalResult = await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(userRef);
      const data = docSnap.exists ? docSnap.data() : {};
      const currentCoins =
        typeof data?.coins === "number"
          ? data.coins
          : typeof data?.tokens === "number"
          ? data.tokens
          : 100;
      const currentXp = typeof data?.xp === "number" ? data.xp : 0;

      let newCoins = currentCoins;
      const newXp = currentXp + xpChange;

      if (action === "deduct") {
        if (currentCoins < tokenChange) {
          throw new Error("INSUFFICIENT_TOKENS");
        }
        newCoins = currentCoins - tokenChange;
      } else if (isMintAction) {
        newCoins = currentCoins + tokenChange;
      } else if (action === "tip") {
        if (
          !recipientUid ||
          typeof recipientUid !== "string" ||
          recipientUid === targetUserId
        ) {
          throw new Error("MISSING_RECIPIENT");
        }
        if (currentCoins < tokenChange) {
          throw new Error("INSUFFICIENT_TOKENS");
        }
        newCoins = currentCoins - tokenChange;

        const recipientRef = db.collection("users").doc(recipientUid);
        const recipientSnap = await transaction.get(recipientRef);
        const recipientData = recipientSnap.exists ? recipientSnap.data() : {};
        const recipientCoins =
          typeof recipientData?.coins === "number"
            ? recipientData.coins
            : typeof recipientData?.tokens === "number"
            ? recipientData.tokens
            : 100;

        transaction.set(
          recipientRef,
          {
            coins: recipientCoins + tokenChange,
            tokens: recipientCoins + tokenChange,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      transaction.set(
        userRef,
        {
          coins: newCoins,
          tokens: newCoins,
          xp: newXp,
          walletBalance: newCoins,
          lastTokenAction: action,
          lastTokenReason: String(reason || "gameplay").slice(0, 80),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { coins: newCoins, xp: newXp };
    });

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      coins: finalResult.coins,
      tokens: finalResult.coins,
      xp: finalResult.xp,
      delta:
        action === "deduct" || action === "tip" ? -tokenChange : tokenChange,
    });
  } catch (error) {
    if (error.message === "INSUFFICIENT_TOKENS") {
      return NextResponse.json(
        { error: "Insufficient credits in studio reserve." },
        { status: 402 }
      );
    }
    if (error.message === "MISSING_RECIPIENT") {
      return NextResponse.json(
        { error: "Valid recipient operative UID required for tip transaction." },
        { status: 400 }
      );
    }

    console.error("Tokens API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    const { authorized, uid: callerUid } = await verifyCallerIdentity(
      request,
      requestedUserId || null
    );

    if (!authorized || !callerUid) {
      return NextResponse.json(
        { error: "Unauthorized token ledger query" },
        { status: 401 }
      );
    }

    const userId =
      callerUid === "internal-system" ? requestedUserId : callerUid;
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const { db } = getAdminServices();
    if (!db) {
      return NextResponse.json(
        { error: "Firestore Admin service unavailable" },
        { status: 503 }
      );
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ userId, coins: 100, tokens: 100, xp: 0 });
    }

    const data = userDoc.data() || {};
    const coins =
      typeof data.coins === "number"
        ? data.coins
        : typeof data.tokens === "number"
        ? data.tokens
        : 100;
    const xp = typeof data.xp === "number" ? data.xp : 0;

    return NextResponse.json(
      { userId, coins, tokens: coins, xp },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Tokens Fetch Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
