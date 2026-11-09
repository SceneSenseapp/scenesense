// File: lib/server/firebase-admin.ts
import "server-only";
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

export { FieldValue };

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

export function getFirebaseAdminApp(): App | null {
  try {
    if (getApps().length > 0) {
      return getApps()[0]!;
    }

    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && rawKey) {
      const privateKey = rawKey
        .replace(/^["']|["']$/g, "")
        .replace(/\\n/g, "\n");
      return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    }

    if (projectId) {
      return initializeApp({ projectId });
    }

    return null;
  } catch (error) {
    console.warn("[FirebaseAdmin] Initialization warning:", error);
    return null;
  }
}

export function getAdminServices(): { db: Firestore | null; auth: Auth | null } {
  const app = getFirebaseAdminApp();
  if (!app) {
    return { db: null, auth: null };
  }
  try {
    return {
      db: getFirestore(app),
      auth: getAuth(app),
    };
  } catch (error) {
    console.warn("[FirebaseAdmin] Service resolution warning:", error);
    return { db: null, auth: null };
  }
}

export async function verifyCallerIdentity(
  request: Request,
  expectedUserId?: string | null
): Promise<{ authorized: boolean; uid: string | null }> {
  const internalSecret = request.headers.get("x-internal-secret");
  const expectedSecret =
    process.env.INTERNAL_SERVICE_KEY || process.env.NEXTAUTH_SECRET;

  if (expectedSecret && internalSecret && internalSecret === expectedSecret) {
    return { authorized: true, uid: expectedUserId || "internal-system" };
  }

  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { authorized: false, uid: null };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { authorized: false, uid: null };
  }

  const { auth } = getAdminServices();
  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(token);
      if (expectedUserId && decoded.uid !== expectedUserId) {
        return { authorized: false, uid: decoded.uid };
      }
      return { authorized: true, uid: decoded.uid };
    } catch (error) {
      console.warn("[FirebaseAdmin] ID token verification warning:", error);
    }
  }

  return { authorized: false, uid: null };
}
