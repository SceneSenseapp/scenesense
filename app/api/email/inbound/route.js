// app/api/email/inbound/route.js
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Clean email addresses from formats like "Jane Doe <jane@example.com>"
function extractEmail(rawFrom) {
  if (!rawFrom) return null;
  const match = rawFrom.match(/<([^>]+)>/) || rawFrom.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].trim().toLowerCase() : rawFrom.trim().toLowerCase();
}

// Check for automated/bounce senders to stop infinite reply loops
function isAutomatedOrNoReply(email, subject = '') {
  if (!email) return true;
  const lowerEmail = email.toLowerCase();
  const lowerSub = subject.toLowerCase();

  const blockedPrefixes = [
    'no-reply', 'noreply', 'mailer-daemon', 'postmaster', 
    'bounce', 'notifications', 'donotreply', 'auto-confirm'
  ];

  if (blockedPrefixes.some(prefix => lowerEmail.startsWith(prefix))) return true;
  if (lowerSub.includes('auto-reply') || lowerSub.includes('automatic reply') || lowerSub.includes('delivery status notification')) {
    return true;
  }

  return false;
}

export async function POST(request) {
  try {
    // 1. Webhook Secret Authentication (Recommended)
    const url = new URL(request.url);
    const incomingSecret = url.searchParams.get('secret') || request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;

    if (expectedSecret && incomingSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized uplink' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    
    // 2. Extract payload defensively
    const rawFrom = payload.from || payload.sender || '';
    const senderEmail = extractEmail(rawFrom);
    const senderName = payload.sender_name || payload.from_name || senderEmail?.split('@')[0] || 'Operative';
    const emailSubject = payload.subject || 'SceneSense Transmission';
    const emailBody = (payload.text || payload.html || payload.stripped_text || '').toString().slice(0, 5000);

    if (!senderEmail || !emailBody.trim()) {
      return NextResponse.json({ message: 'Omitted: Missing sender or body' }, { status: 200 });
    }

    // 3. Skip automated notifications and daemon bounces
    if (isAutomatedOrNoReply(senderEmail, emailSubject)) {
      return NextResponse.json({ message: 'Ignored automated or daemon sender' }, { status: 200 });
    }

    // 4. Initialize Gemini Analysis with Structured JSON Output
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY unconfigured' }, { status: 503 });
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const systemInstruction = `You are the automated AI Mail Officer for SceneSense Studio (scenesense.app), created by Commander Matt.
Analyze incoming emails from users, collaborators, or partners.
Evaluate urgency, summarize the core intent for Commander Matt, and draft a polite, helpful reply.
Adhere strictly to the requested JSON structure.`;

    const prompt = `Analyze this incoming transmission:
Sender: ${senderName} (${senderEmail})
Subject: ${emailSubject}
Body:
${emailBody}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    let analysis = {};
    try {
      analysis = JSON.parse(response.text || '{}');
    } catch (parseErr) {
      console.warn("JSON parse fallback on Gemini output:", parseErr);
      analysis = {
        urgencyScore: 5,
        summary: "Inbound inquiry received regarding SceneSense platform.",
        shouldNotifyCommander: true,
        autoReplyDraft: "Thank you for reaching out to SceneSense Studio. We have received your transmission and are reviewing your message."
      };
    }

    const urgencyScore = Number(analysis.urgencyScore) || 5;
    const shouldNotify = Boolean(analysis.shouldNotifyCommander) || urgencyScore >= 7;

    // 5. Send automated reply back via Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    const verifiedFromDomain = process.env.RESEND_FROM_EMAIL || 'SceneSense Studio <support@scenesense.app>';

    if (resendApiKey && analysis.autoReplyDraft) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: verifiedFromDomain,
            to: [senderEmail],
            subject: `Re: ${emailSubject.replace(/^Re:\s*/i, '')}`,
            text: `${analysis.autoReplyDraft}\n\n---\nSceneSense Autonomous Mail Officer (v2.6)\nhttps://scenesense.app`,
          }),
        });
      } catch (mailErr) {
        console.error("Resend delivery failed:", mailErr);
      }
    }

    // 6. Alert Commander Matt if high priority
    if (shouldNotify) {
      await sendCommanderAlert({
        sender: senderName,
        email: senderEmail,
        subject: emailSubject,
        summary: analysis.summary || 'No summary provided',
        score: urgencyScore,
      });
    }

    return NextResponse.json({ success: true, analysis }, { status: 200 });
  } catch (error) {
    console.error("Inbound email pipeline failure:", error);
    return NextResponse.json({ error: error.message || 'Pipeline failed' }, { status: 500 });
  }
}

// Telegram dispatch helper
async function sendCommanderAlert(data) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !chatId) return;

  const message = `🚨 *HIGH-PRIORITY SCENESENSE TRANSMISSION* 🚨\n\n` +
    `👤 *Sender:* ${data.sender} (\`${data.email}\`)\n` +
    `📌 *Subject:* ${data.subject}\n` +
    `⭐ *Urgency Score:* ${data.score}/10\n\n` +
    `📝 *Intel Brief:* ${data.summary}`;

  try {
    await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (tgErr) {
    console.error("Telegram alert dispatch failed:", tgErr);
  }
}