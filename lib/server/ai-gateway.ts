// File: lib/server/ai-gateway.ts
import "server-only";
import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODELS = {
  PRIMARY: "gemini-3.8-flash",
  FAST_FALLBACK: "gemini-3.5-flash-lite",
  REASONING: "gemini-4-argon",
} as const;

export interface ModelAttempt {
  name: string;
  timeoutMs: number;
}

export const DEFAULT_MODEL_CASCADE: ModelAttempt[] = [
  { name: GEMINI_MODELS.PRIMARY, timeoutMs: 28000 },
  { name: GEMINI_MODELS.FAST_FALLBACK, timeoutMs: 16000 },
];

export function resolveGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) return null;
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedKey = apiKey;
  }
  return cachedClient;
}

export function extractResponseText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const res = response as {
    text?: string | (() => string);
    output_text?: string;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (typeof res.output_text === "string" && res.output_text) return res.output_text;
  if (typeof res.text === "function") return res.text();
  if (typeof res.text === "string") return res.text;
  return res.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
}

export function safeParseJson<T = Record<string, unknown>>(rawText: string): T | null {
  if (!rawText) return null;
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const objStart = cleaned.indexOf("{");
    const objEnd = cleaned.lastIndexOf("}");
    if (objStart !== -1 && objEnd > objStart) {
      try {
        return JSON.parse(cleaned.slice(objStart, objEnd + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface GenerateCascadeOptions {
  contents: unknown;
  systemInstruction?: string;
  responseMimeType?: "application/json" | "text/plain";
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  googleSearch?: boolean;
  models?: ModelAttempt[];
}

export interface GenerateCascadeResult {
  success: boolean;
  text: string;
  modelUsed: string | null;
  groundingSources: Array<{ title: string; url: string }>;
  error?: string;
}

export async function generateWithCascade(
  options: GenerateCascadeOptions
): Promise<GenerateCascadeResult> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      success: false,
      text: "",
      modelUsed: null,
      groundingSources: [],
      error: "GEMINI_API_KEY is not configured.",
    };
  }

  const cascade = options.models || DEFAULT_MODEL_CASCADE;
  let lastError = "All Gemini models failed to respond.";

  for (const { name, timeoutMs } of cascade) {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(
          () => reject(new Error(`Model ${name} timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      });

      const config: Record<string, unknown> = {
        temperature: options.temperature ?? 0.7,
      };
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options.responseMimeType && !options.googleSearch) {
        config.responseMimeType = options.responseMimeType;
      }
      if (options.responseSchema && !options.googleSearch) {
        config.responseSchema = options.responseSchema;
      }
      if (options.googleSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await Promise.race([
        ai.models.generateContent({
          model: name,
          contents: options.contents as never,
          config: config as never,
        }),
        timeoutPromise,
      ]);

      const text = extractResponseText(response);
      if (text.trim()) {
        const rawChunks =
          (
            response as {
              candidates?: Array<{
                groundingMetadata?: {
                  groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
                };
              }>;
            }
          )?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        const groundingSources = rawChunks
          .filter((c) => Boolean(c.web?.uri))
          .map((c) => ({
            title: c.web?.title || "Verified Web Citation",
            url: c.web!.uri!,
          }))
          .slice(0, 8);

        return {
          success: true,
          text,
          modelUsed: name,
          groundingSources,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[AI Gateway] ${name} fallback triggered:`, lastError);
    } finally {
      if (timerId) clearTimeout(timerId);
    }
  }

  return {
    success: false,
    text: "",
    modelUsed: null,
    groundingSources: [],
    error: lastError,
  };
}
