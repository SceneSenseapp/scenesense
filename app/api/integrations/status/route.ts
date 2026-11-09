// File: app/api/integrations/status/route.ts
import { NextResponse } from "next/server";
import { GEMINI_MODELS, resolveGeminiApiKey } from "@/lib/server/ai-gateway";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { SUPPORTED_REGIONS } from "@/lib/movie-apis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface IntegrationStatusItem {
  id: string;
  name: string;
  category: "ai" | "media" | "commerce" | "cloud" | "comms";
  status: "online" | "hybrid" | "standby";
  modeLabel: string;
  capabilities: string[];
}

export async function GET() {
  const hasGemini = Boolean(resolveGeminiApiKey());
  const hasTmdbCustom = Boolean(
    process.env.TMDB_ACCESS_TOKEN ||
      process.env.TMDB_READ_ACCESS_TOKEN ||
      process.env.TMDB_API_KEY ||
      process.env.NEXT_PUBLIC_TMDB_API_KEY
  );
  const hasWatchmode = Boolean(process.env.WATCHMODE_API_KEY);
  const hasOmdb = Boolean(process.env.OMDB_API_KEY);
  const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const hasStripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const hasFirebaseClient = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  const hasFirebaseAdmin = isFirebaseAdminConfigured();
  const hasPostgres = Boolean(
    process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL
  );
  const hasResend = Boolean(process.env.RESEND_API_KEY);

  const integrations: IntegrationStatusItem[] = [
    {
      id: "gemini-neural-core",
      name: "Gemini 3.8 Neural Suite",
      category: "ai",
      status: hasGemini ? "online" : "hybrid",
      modeLabel: hasGemini
        ? `Live (${GEMINI_MODELS.PRIMARY} + Vision & Grounding)`
        : "Curated Safeguard Engine",
      capabilities: [
        "11 Director Personas & Anti-Repeat Oracle",
        "Multimodal Frame & Script Scene Analyzer",
        "CineMind Context-Aware Dossier Assistant",
        "Google Search Grounded Live Showtimes",
      ],
    },
    {
      id: "tmdb-cinema-graph",
      name: "TMDB Cinema Graph Proxy",
      category: "media",
      status: "online",
      modeLabel: hasTmdbCustom ? "Authenticated Edge Proxy" : "Built-in Verified Key",
      capabilities: [
        "Single-Request Enriched Media Dossiers",
        "Official Trailers, Cast & Crew Filmographies",
        "Zero Client API Key Exposure",
      ],
    },
    {
      id: "streaming-radar",
      name: "Multi-Region Streaming Deep-Links",
      category: "media",
      status: hasWatchmode ? "online" : "hybrid",
      modeLabel: hasWatchmode
        ? `Watchmode 4K + TMDB (${SUPPORTED_REGIONS.join("/")})`
        : `TMDB Regional Deep-Links (${SUPPORTED_REGIONS.join("/")})`,
      capabilities: [
        `7 Regions (${SUPPORTED_REGIONS.join(", ")})`,
        "Direct Platform Launch (Netflix, Prime, Max, Disney+, Apple TV, Crave)",
        "Subscription / Free / Rent / Buy Filtering",
      ],
    },
    {
      id: "omdb-critic-scores",
      name: "OMDb Critic & Box Office Aggregator",
      category: "media",
      status: hasOmdb ? "online" : "hybrid",
      modeLabel: hasOmdb ? "IMDb + Rotten Tomatoes + Metacritic" : "TMDB Verified Audience Telemetry",
      capabilities: [
        "Rotten Tomatoes Tomatometer",
        "IMDb & Metacritic Scores",
        "Academy Awards & Box Office Ledger",
      ],
    },
    {
      id: "stripe-commerce",
      name: "Stripe VIP & Community Tip Ledger",
      category: "commerce",
      status: hasStripe ? "online" : "standby",
      modeLabel: hasStripe
        ? hasStripeWebhook
          ? "Live Checkout + Verified Webhooks"
          : "Live Checkout Active"
        : "Standby Gateway",
      capabilities: [
        "One-Time Community Tip Jar (/api/stripe/tip)",
        "VIP Founder Subscriptions (/api/checkout)",
        "Automated Supporter Frame & SceneCents Minting",
      ],
    },
    {
      id: "firebase-realtime",
      name: "Firebase Realtime Vault & Rooms",
      category: "cloud",
      status: hasFirebaseClient ? "online" : "standby",
      modeLabel:
        hasFirebaseClient && hasFirebaseAdmin
          ? "Client Realtime + Admin Verified"
          : hasFirebaseClient
            ? "Client Realtime Sync"
            : "Local Session Vault",
      capabilities: [
        "Deduplicated Session & Watchlist Sync",
        "Synchronized Watch Party Screening Rooms",
        "Live Collaborative Movie Night Swipe Matcher",
      ],
    },
    {
      id: "postgres-resend",
      name: "Prisma Postgres & Autonomous Mail",
      category: "comms",
      status: hasPostgres || hasResend ? "online" : "hybrid",
      modeLabel: [
        hasPostgres ? "Postgres Connected" : null,
        hasResend ? "Resend Dispatch Active" : "AI Triage Ready",
      ]
        .filter(Boolean)
        .join(" • "),
      capabilities: [
        "Relational User & Mood Contract Schema",
        "AI Urgency Triage & Auto-Reply Drafting",
      ],
    },
  ];

  const onlineCount = integrations.filter((i) => i.status !== "standby").length;

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      summary: {
        activeCount: onlineCount,
        totalCount: integrations.length,
        primaryModel: GEMINI_MODELS.PRIMARY,
        fallbackModel: GEMINI_MODELS.FAST_FALLBACK,
        supportedRegions: SUPPORTED_REGIONS,
      },
      integrations,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
