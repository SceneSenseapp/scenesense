import NextAuthModule from "next-auth";
import GoogleProviderModule from "next-auth/providers/google";

const NextAuth = NextAuthModule?.default?.default || NextAuthModule?.default || NextAuthModule;
const GoogleProvider = GoogleProviderModule?.default?.default || GoogleProviderModule?.default || GoogleProviderModule;

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "scenesense-google-client-id",
      clientSecret: process.env.GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "scenesense-google-client-secret",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "scenesense_studio_fallback_secret_v2",
};

const handler = (req, ctx) => NextAuth(req, ctx, authOptions);

export { handler as GET, handler as POST };
