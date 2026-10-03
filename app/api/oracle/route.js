import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { mood, recentMovies } = await req.json();
    
    // Initialize the Gemini link using a stable, existing model version
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are The Oracle, a highly advanced, slightly cynical cinematic AI in a cyberpunk universe.
      The operative is currently feeling: "${mood}".
      Their recently watched movies are: ${recentMovies?.length > 0 ? recentMovies.join(", ") : "None on record"}.
      
      Based on this psychological state and their watch history, recommend ONE specific movie they should watch next. 
      Do not break character. Keep the reason under 3 sentences.
      
      You must respond strictly in the following JSON format without any markdown blocks or extra text:
      {
        "title": "Exact Movie Title",
        "reason": "Your badass, in-character explanation of why this fits their mood and history."
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Strip markdown formatting if Gemini wraps the JSON block
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleanJson));
  } catch (error) {
    console.error("Oracle Connection Failed:", error);
    return NextResponse.json(
      { error: "Neural link severed. The Oracle is temporarily overloaded. Retrying transmission shortly." }, 
      { status: 500 }
    );
  }
}