// File: app/api/watchlist/route.js
import { NextResponse } from "next/server";
import {
  getAdminServices,
  FieldValue,
  verifyCallerIdentity,
} from "@/lib/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Fetch user's watchlist from Firestore (verified caller only)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    const { authorized, uid } = await verifyCallerIdentity(
      request,
      requestedUserId || null
    );
    if (!authorized || !uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = uid === "internal-system" ? requestedUserId : uid;
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const { db } = getAdminServices();
    if (!db) {
      return NextResponse.json(
        { error: "Firestore Admin unavailable" },
        { status: 503 }
      );
    }

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("watchlist")
      .orderBy("addedAt", "desc")
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      count: items.length,
      watchlist: items,
    });
  } catch (error) {
    console.error("Watchlist fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

// POST: Add or update movie entry in user's watchlist
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId: explicitUserId, movie } = body;

    if (!movie?.id) {
      return NextResponse.json(
        { error: "Valid movie object required" },
        { status: 400 }
      );
    }

    const { authorized, uid } = await verifyCallerIdentity(
      request,
      explicitUserId || null
    );
    if (!authorized || !uid) {
      return NextResponse.json(
        { error: "Unauthorized uplink" },
        { status: 401 }
      );
    }

    const userId = uid === "internal-system" ? explicitUserId : uid;
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const { db } = getAdminServices();
    if (!db) {
      return NextResponse.json(
        { error: "Firestore Admin unavailable" },
        { status: 503 }
      );
    }

    const docRef = db
      .collection("users")
      .doc(userId)
      .collection("watchlist")
      .doc(String(movie.id));

    const resolvedFolder = movie.categoryTag || movie.folder || "Watch Next";

    const payload = {
      id: movie.id,
      movieId: movie.id,
      title: movie.title || movie.name || "Untitled",
      name: movie.name || movie.title || "Untitled",
      media_type: movie.media_type || (movie.first_air_date ? "tv" : "movie"),
      poster_path: movie.poster_path || "",
      backdrop_path: movie.backdrop_path || "",
      release_date: movie.release_date || movie.first_air_date || "",
      vote_average: movie.vote_average
        ? Number(Number(movie.vote_average).toFixed(1))
        : 0,
      genre: movie.genre || "",
      folder: resolvedFolder,
      categoryTag: resolvedFolder,
      watched: Boolean(movie.watched),
      ...(movie.userRating !== undefined
        ? { userRating: Number(movie.userRating) }
        : {}),
      ...(movie.userReview !== undefined
        ? { userReview: String(movie.userReview) }
        : {}),
      ...(movie.reviewTag !== undefined
        ? { reviewTag: String(movie.reviewTag) }
        : {}),
      ...(movie.isSpoiler !== undefined
        ? { isSpoiler: Boolean(movie.isSpoiler) }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const existing = await docRef.get();
    if (!existing.exists) {
      payload.addedAt = FieldValue.serverTimestamp();
    }

    await docRef.set(payload, { merge: true });

    return NextResponse.json({ success: true, movie: payload });
  } catch (error) {
    console.error("Watchlist save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update watchlist" },
      { status: 500 }
    );
  }
}

// DELETE: Remove item from watchlist
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const explicitUserId = searchParams.get("userId");
    const movieId = searchParams.get("movieId");

    if (!movieId) {
      return NextResponse.json(
        { error: "movieId required" },
        { status: 400 }
      );
    }

    const { authorized, uid } = await verifyCallerIdentity(
      request,
      explicitUserId || null
    );
    if (!authorized || !uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = uid === "internal-system" ? explicitUserId : uid;
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { db } = getAdminServices();
    if (!db) {
      return NextResponse.json(
        { error: "Firestore Admin unavailable" },
        { status: 503 }
      );
    }

    await db
      .collection("users")
      .doc(userId)
      .collection("watchlist")
      .doc(String(movieId))
      .delete();

    return NextResponse.json({ success: true, removedId: movieId });
  } catch (error) {
    console.error("Watchlist delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}
