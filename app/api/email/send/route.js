// app/api/email/send/route.js
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { GoogleGenAI } from '@google/genai';

// Basic email validation regex
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, message, name } = body;

    // 1. Validate input parameters defensively
    if (!email || !message || typeof email !== 'string' || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Valid email and transmission message are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim().slice(0, 4000); // Prevent token overflow
    const cleanName = (name || cleanEmail.split('@')[0] || 'Operative').trim().slice(0, 100);

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format.' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Mail dispatch uplink offline (missing RESEND_API_KEY).' },
        { status: 503 }
      );
    }

    const resend = new Resend(resendApiKey);

    // 2. Autonomous Analysis via Gemini (with graceful offline fallback)
    let analysis = {
      urgencyScore: 5,
      summary: 'Inquiry received through contact terminal.',
      shouldNotifyCommander: true,
      autoReplyDraft: `Greetings ${cleanName},\n\nThank you for reaching out to SceneSense Studio. We have received your dispatch and are reviewing your message.\n\nBest regards,\nSceneSense Studio Support`,
    };

    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const systemInstruction = `You are the autonomous AI Mail Officer for SceneSense Studio (scenesense.app), created by Commander Matt.
A user has submitted an inquiry through the web terminal.
Analyze urgency (1-10), produce a one-sentence summary for Commander Matt, and draft a polite, helpful studio auto-reply.
Adhere strictly to the requested JSON schema.`;

        const prompt = `User Name: ${cleanName}
User Email: ${cleanEmail}
Message:
${cleanMessage}`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const parsed = JSON.parse(aiResponse.text || '{}');
        if (parsed.autoReplyDraft) {
          analysis = {
            urgencyScore: Number(parsed.urgencyScore) || 5,
            summary: parsed.summary || analysis.summary,
            shouldNotifyCommander: Boolean(parsed.shouldNotifyCommander) || Number(parsed.urgencyScore) >= 7,
            autoReplyDraft: parsed.autoReplyDraft,
          };
        }
      } catch (aiErr) {
        console.warn('AI analysis fallback triggered:', aiErr);
      }
    }

    // 3. Dispatch Auto-Reply via Resend
    const senderDomain = process.env.RESEND_FROM_EMAIL || 'SceneSense Studio <support@scenesense.app>';

    await resend.emails.send({
      from: senderDomain,
      to: [cleanEmail],
      subject: 'Re: Your Transmission to SceneSense Studio',
      text: `${analysis.autoReplyDraft}\n\n---\nSceneSense Autonomous Mail Officer (v2.6)\nhttps://scenesense.app`,
    });

    // 4. Alert Commander Matt if high priority
    if (analysis.shouldNotifyCommander || analysis.urgencyScore >= 7) {
      await sendCommanderAlert({
        sender: cleanName,
        email: cleanEmail,
        message: cleanMessage,
        summary: analysis.summary,
        score: analysis.urgencyScore,
      });
    }

    return NextResponse.json(
      {
        success: true,
        summary: analysis.summary,
        urgency: analysis.urgencyScore,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email transmission error:', error);
    return NextResponse.json(
      { error: error.message || 'Transmission failed.' },
      { status: 500 }
    );
  }
}

// Helper to push urgent transmissions to Commander Matt via Telegram
async function sendCommanderAlert(data) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !chatId) return;

  const text = `🚨 *SCENESENSE CONTACT DISPATCH* 🚨\n\n` +
    `👤 *From:* ${data.sender} (\`${data.email}\`)\n` +
    `⭐ *Urgency:* ${data.score}/10\n\n` +
    `📝 *Summary:* ${data.summary}\n\n` +
    `💬 *Original:* "${data.message.slice(0, 300)}${data.message.length > 300 ? '...' : ''}"`;

  try {
    await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (tgErr) {
    console.warn('Telegram alert dispatch notice:', tgErr);
  }
}