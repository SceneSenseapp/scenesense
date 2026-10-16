// File: app/api/summarize/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function POST(request) {
  try {
    const { threadText, type = 'summary', channelName = 'general-cinema' } = await request.json();

    if (!threadText || !threadText.trim()) {
      return NextResponse.json({ error: 'Thread text payload is empty.' }, { status: 400 });
    }

    if (!apiKey) {
      console.error("AI Error: GEMINI_API_KEY or GOOGLE_API_KEY missing from environment.");
      return NextResponse.json({ error: 'Mainframe AI key is not configured.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    // Archetype 1: The Auteur (Script Doctor) vs. Archetype 2: The Studio Bureaucrat (DirectorBot)
    const prompt = type === 'script_doctor'
      ? `You are an elite, uncompromising arthouse cinema Auteur and Narrative Consultant overseeing sector #${channelName}.
You view the operatives' discussion as raw, chaotic screenplay material.
Analyze the following discussion thread and provide 3 sharp, pretentious, yet brilliantly insightful screenwriting notes.
Emphasize emotional stakes, subtext, pacing ruthlessness, and narrative tension.
Treat channel rules not as etiquette, but as psychological survival.
End your transmission with a dry, slightly chilling corporate pleasantry: "We hope you enjoy the platform."

Thread to diagnose:
${threadText}`
      : `You are DirectorBot, a harried, literal-minded Studio Executive and compliance bureaucrat assigned to sector #${channelName}.
You do not care about "art" — you care about test-audience approval, runtime bloat, NDAs, budget overages, and corporate liability.
Provide a crisp, 3-bullet executive summary of the thread, pointing out narrative and compliance risks.
Sign off curtly: "Per Legal & Executive Oversight: We hope you enjoy the platform."

Thread to summarize:
${threadText}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("DirectorBot/ScriptDoctor API Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to generate summary from mainframe.' }, { status: 500 });
  }
}