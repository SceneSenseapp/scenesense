import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { threadText } = await request.json();

    if (!threadText) {
      return NextResponse.json({ error: 'Thread text payload missing.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Summarize the core film arguments and consensus of this chat thread in 3 concise bullet points:\n\n${threadText}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("DirectorBot API Error:", error.message);
    return NextResponse.json({ error: 'Failed to generate summary from mainframe.' }, { status: 500 });
  }
}