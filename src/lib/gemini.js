import { GoogleGenAI } from "@google/genai";

const apiKey = 
  process.env.GEMINI_API_KEY || 
  process.env.GOOGLE_GENAI_API_KEY || 
  process.env.GOOGLE_API_KEY || 
  process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const MODELS = {
  FAST: "gemini-3.8-flash",   // Default high-efficiency, fast response tier
  POWER: "gemini-4-carbon",   // Frontier reasoning tier
};

export async function generateSceneResponse({ prompt, usePro = false } = {}) {
  const selectedModel = usePro ? MODELS.POWER : MODELS.FAST;

  if (!ai) {
    console.error("Gemini API key is not configured in environment.");
    return { success: false, error: "Missing Gemini API key" };
  }

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
