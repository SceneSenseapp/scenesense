// File: src/lib/gemini.js
import { GEMINI_MODELS, generateWithCascade } from "@/lib/server/ai-gateway";

export const MODELS = {
  FAST: GEMINI_MODELS.PRIMARY,
  LITE: GEMINI_MODELS.FAST_FALLBACK,
  POWER: GEMINI_MODELS.REASONING,
};

export async function generateSceneResponse({ prompt, usePro = false } = {}) {
  const selectedModel = usePro ? MODELS.POWER : MODELS.FAST;

  const res = await generateWithCascade({
    contents: prompt,
    models: [
      { name: selectedModel, timeoutMs: 28000 },
      { name: MODELS.LITE, timeoutMs: 16000 },
    ],
  });

  if (!res.success) {
    return { success: false, error: res.error || "Unknown error" };
  }

  return {
    success: true,
    text: res.text,
    modelUsed: res.modelUsed,
  };
}
