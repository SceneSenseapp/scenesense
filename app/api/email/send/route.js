// File: app/api/email/send/route.js
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  generateWithCascade,
  safeParseJson,
  resolveGeminiApiKey,
} from "@/lib/server/ai-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").trim();
    const message = (body.message || "").trim();

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    let analysis = {
      urgencyScore: 5,
      summary: `Support inquiry received from ${email}.`,
      shouldNotifyCommander: false,
      autoReplyDraft:
        "Greetings Operative,\n\nYour transmission has been received by SceneSense Studio Command. Our support team has logged your inquiry and will follow up shortly.",
    };

    if (resolveGeminiApiKey()) {
      const prompt = `You are the autonomous AI Mail Officer for SceneSense Studio.
A user has submitted an inquiry through the contact terminal.

User Email: ${email}
Message: ${message.slice(0, 3000)}

Provide your response strictly in JSON format:
{
  "urgencyScore": 5,
  "summary": "One sentence summary of the inquiry for Studio Support.",
  "shouldNotifyCommander": false,
  "autoReplyDraft": "A professional, polite AI response addressing their inquiry as the SceneSense Studio support assistant."
}`;

      const aiRes = await generateWithCascade({
        contents: prompt,
        responseMimeType: "application/json",
        temperature: 0.4,
      });

      const parsed = safeParseJson(aiRes.text);
      if (parsed && parsed.autoReplyDraft) {
        analysis = parsed;
      }
    }

    let emailDispatched = false;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "SceneSense Studio <onboarding@resend.dev>",
          to: [email],
          subject: "Re: Your Inquiry to SceneSense Studio",
          text: `${analysis.autoReplyDraft}\n\n---\nSceneSense Studio Support (support@scenesense.app)`,
        });
        emailDispatched = true;
      } catch (sendErr) {
        console.warn("Resend outbound notice:", sendErr.message);
      }
    }

    return NextResponse.json(
      {
        success: true,
        emailDispatched,
        summary: analysis.summary,
        urgency: analysis.urgencyScore,
        autoReply: analysis.autoReplyDraft,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email transmission error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
