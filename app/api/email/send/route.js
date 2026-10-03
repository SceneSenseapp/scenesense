import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { GoogleGenAI } from '@google/genai';

export async function POST(request) {
  try {
    const { email, message } = await request.json();

    if (!email || !message) {
      return NextResponse.json({ error: 'Email and message are required.' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!resendApiKey || !geminiApiKey) {
      return NextResponse.json({ error: 'Studio communication keys not configured.' }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // 1. Generate AI Auto-Reply and Urgency Assessment using Gemini
    const prompt = `
      You are the autonomous AI Mail Officer for SceneSense Studio.
      A user has submitted an inquiry through the contact terminal.
      
      User Email: ${email}
      Message: ${message}

      Provide your response strictly in the following JSON format without markdown ticks:
      {
        "urgencyScore": <number from 1 to 10 where 10 is critical business/legal/VIP>,
        "summary": "One sentence summary of the inquiry for Commander Matt.",
        "shouldNotifyCommander": <boolean true if urgencyScore >= 7>,
        "autoReplyDraft": "A professional, polite AI response addressing their inquiry as the SceneSense Studio support assistant."
      }
    `;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const analysis = JSON.parse(aiResponse.text.trim());

    // 2. Send the AI Auto-Reply back to the user via Resend
    await resend.emails.send({
      from: 'SceneSense Studio <onboarding@resend.dev>',
      to: [email],
      subject: 'Re: Your Transmission to SceneSense Studio',
      text: `${analysis.autoReplyDraft}\n\n---\nSceneSense Autonomous Mail Officer (v2.6)`,
    });

    return NextResponse.json({ 
      success: true, 
      summary: analysis.summary,
      urgency: analysis.urgencyScore 
    }, { status: 200 });

  } catch (error) {
    console.error('Email transmission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}