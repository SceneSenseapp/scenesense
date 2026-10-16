import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODELS = {
  FAST: "gemini-2.5-flash",   // Cost-effective beta user tier
  POWER: "gemini-2.5-pro",    // Heavy reasoning tier
};

export async function generateSceneResponse({ prompt, usePro = false } = {}) {
  const selectedModel = usePro ? MODELS.POWER : MODELS.FAST;

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
    });

    return {
      success: true,
      text: response.text,
      modelUsed: selectedModel,
    };
  } catch (error) {
    console.error(`Error generating content with ${selectedModel}:`, error);
    return { success: false, error: error.message || "Unknown error" };
  }
}