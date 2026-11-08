// File: app/api/email/inbound/route.js
import { NextResponse } from 'next/server';
import { generateWithCascade, safeParseJson } from '@/lib/server/ai-gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));

    const senderEmail = (payload.from || payload.email || '').trim();
    const senderName = (payload.sender_name || payload.name || 'Viewer').trim();
    const emailSubject = (payload.subject || 'General Studio Inquiry').trim();
    const emailBody = (payload.text || payload.html || payload.message || '').trim();

    if (!senderEmail || !emailBody) {
      return NextResponse.json(
        { error: 'Sender email and message body are required.' },
        { status: 400 }
      );
    }

    let analysis = {
      urgencyScore: 4,
      summary: `Inbound message received from ${senderName} regarding "${emailSubject}".`,
      shouldNotifyTeam: false,
      autoReplyDraft: `Hello ${senderName},\n\nThank you for reaching out regarding "${emailSubject}". Your message has been logged by SceneSense Studio Support and our team will follow up shortly.`,
    };

    const prompt = `You are the automated AI Mail Officer for SceneSense Studio.
Analyze the following incoming inquiry from a user.

Sender: ${senderName} (${senderEmail})
Subject: ${emailSubject}
Message: ${emailBody.slice(0, 3000)}

Provide your response strictly in JSON format:
{
  "urgencyScore": 5,
  "summary": "One sentence summary of what this email is about for the SceneSense support team.",
  "shouldNotifyTeam": false,
  "autoReplyDraft": "A polite, helpful response addressing their inquiry on behalf of SceneSense Studio Support."
}`;

    const aiResult = await generateWithCascade({
      contents: prompt,
      responseMimeType: 'application/json',
      temperature: 0.35,
    });

    const parsed = aiResult.success ? safeParseJson(aiResult.text) : null;
    if (parsed && parsed.autoReplyDraft) {
      analysis = {
        urgencyScore: Number(parsed.urgencyScore) || 4,
        summary: parsed.summary || analysis.summary,
        shouldNotifyTeam: Boolean(parsed.shouldNotifyTeam ?? parsed.shouldNotifyCommander),
        autoReplyDraft: parsed.autoReplyDraft,
      };
    }

    if (analysis.autoReplyDraft && process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'SceneSense Studio <support@scenesense.app>',
            to: [senderEmail],
            subject: `Re: ${emailSubject}`,
            text: `${analysis.autoReplyDraft}\n\n---\nSceneSense Studio Support`,
          }),
        });
      } catch (resendErr) {
        console.warn('Resend dispatch notice:', resendErr.message);
      }
    }

    if (analysis.shouldNotifyTeam) {
      await sendTeamAlert({
        sender: senderName,
        email: senderEmail,
        subject: emailSubject,
        summary: analysis.summary,
        score: analysis.urgencyScore,
      });
    }

    return NextResponse.json({ success: true, analysis }, { status: 200 });
  } catch (error) {
    console.error('Inbound email processing failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendTeamAlert(data) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !chatId) return;

  const message =
    `🚨 **HIGH-PRIORITY SCENESENSE INQUIRY**\n\n` +
    `👤 **Sender:** ${data.sender} (${data.email})\n` +
    `📌 **Subject:** ${data.subject}\n` +
    `⭐ **Urgency Score:** ${data.score}/10\n\n` +
    `📝 **Summary:** ${data.summary}`;

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
  } catch (err) {
    console.warn('Telegram alert dispatch warning:', err.message);
  }
}
