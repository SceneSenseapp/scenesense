import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const payload = await request.json();
    
    // Extract incoming email details (structure depends on Resend/SendGrid inbound payload)
    const senderEmail = payload.from;
    const senderName = payload.sender_name || 'Operative';
    const emailSubject = payload.subject;
    const emailBody = payload.text || payload.html;

    // 1. Ask Gemini to analyze, draft a reply, and score urgency (1-10)
    const prompt = `
      You are the automated AI Mail Officer for SceneSense Studio. 
      Analyze the following incoming email from a user.
      
      Sender: ${senderName} (${senderEmail})
      Subject: ${emailSubject}
      Message: ${emailBody}

      Provide your response strictly in the following JSON format without markdown ticks:
      {
        "urgencyScore": <number from 1 to 10 where 10 is critical/VIP/business deal/legal issue>,
        "summary": "One sentence summary of what this email is about for Commander Matt.",
        "shouldNotifyCommander": <boolean true if urgencyScore >= 7 or requires personal attention>,
        "autoReplyDraft": "A professional, polite AI response addressing their inquiry, acting as the SceneSense Studio support assistant."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const analysis = JSON.parse(response.text.trim());

    // 2. Send the automated response back to the user (using Resend API)
    if (analysis.autoReplyDraft) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'SceneSense Studio <support@scenesense.ai>',
          to: [senderEmail],
          subject: `Re: ${emailSubject}`,
          text: `${analysis.autoReplyDraft}\n\n---\nSceneSense Autonomous Mail Officer (v2.6)`,
        }),
      });
    }

    // 3. If high priority, ping Commander (via Telegram / Discord / or internal DB log)
    if (analysis.shouldNotifyCommander) {
      await sendCommanderAlert({
        sender: senderName,
        email: senderEmail,
        subject: emailSubject,
        summary: analysis.summary,
        score: analysis.urgencyScore,
      });
    }

    return NextResponse.json({ success: true, analysis }, { status: 200 });
  } catch (error) {
    console.error("Inbound email processing failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to push high-priority alerts to Commander's personal feed
async function sendCommanderAlert(data) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !chatId) return;

  const message = `🚨 **HIGH-PRIORITY SCENESENSE EMAIL** 🚨\n\n` +
    `👤 **Sender:** ${data.sender} (${data.email})\n` +
    `📌 **Subject:** ${data.subject}\n` +
    `⭐ **Urgency Score:** ${data.score}/10\n\n` +
    `📝 **Summary:** ${data.summary}`;

  await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  });
}