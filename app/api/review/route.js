import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { movieTitle, movieOverview, genres } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const systemInstruction = "You are an elite film critic. Generate a punchy 2-sentence personal review and a realistic rating out of 10 for the given movie. Format your response strictly as JSON with keys: 'rating' (number 1-10) and 'review' (string). No markdown backticks, just raw JSON.";

    const prompt = `Movie: ${movieTitle}\nOverview: ${movieOverview}\nGenres: ${genres}`;

    let text;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash", systemInstruction });
      const result = await model.generateContent(prompt);
      text = result.response.text();
    } catch (primaryError) {
      console.warn("⚠️ Flash model overloaded on review, falling back to standard gemini-1.5-flash...", primaryError);
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
      const fallbackResult = await fallbackModel.generateContent(prompt);
      text = fallbackResult.response.text();
    }
    
    // Clean and parse JSON response safely
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedText);

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI Review Error:", error);
    // Graceful fallback response so the UI always opens
    return NextResponse.json({ 
      rating: 8, 
      review: "A compelling cinematic journey that delivers striking visuals and gripping narrative depth from start to finish." 
    });
  }
}