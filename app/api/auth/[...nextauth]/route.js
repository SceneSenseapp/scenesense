import NextAuthModule from "next-auth";
import GoogleProviderModule from "next-auth/providers/google";

const NextAuth = NextAuthModule?.default?.default || NextAuthModule?.default || NextAuthModule;
const GoogleProvider = GoogleProviderModule?.default?.default || GoogleProviderModule?.default || GoogleProviderModule;

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!googleClientId || !googleClientSecret || !nextAuthSecret) {
  throw new Error(
    "Missing required auth configuration: GOOGLE_CLIENT_ID/GOOGLE_ID, GOOGLE_CLIENT_SECRET/GOOGLE_SECRET, and NEXTAUTH_SECRET must be set."
  );
}

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  secret: nextAuthSecret,
};

const handler = (req, ctx) => NextAuth(req, ctx, authOptions);

export { handler as GET, handler as POST };
