// File: app/api/summarize/route.js
import { NextResponse } from 'next/server';
import { generateWithCascade } from '@/lib/server/ai-gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  let threadType = 'summary';
  let sector = 'general-cinema';

  try {
    const body = await request.json().catch(() => ({}));
    const rawThread = (body.threadText || body.text || '').trim();
    threadType = body.type === 'script_doctor' ? 'script_doctor' : 'summary';
    sector = (body.channelName || 'general-cinema').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);

    if (!rawThread) {
      return NextResponse.json({ error: 'Thread text payload is empty.' }, { status: 400 });
    }

    const sanitizedThread = rawThread.slice(0, 4000);

    const systemInstruction = threadType === 'script_doctor'
      ? `You are an uncompromising cinema Auteur and Narrative Consultant overseeing discussion sector #${sector} in SceneSense Studio.
Analyze the discussion thread and deliver 3 sharp, insightful screenwriting notes emphasizing emotional stakes, subtext, pacing, and narrative tension.
End your response with: "We hope you enjoy the platform."`
      : `You are DirectorBot, a crisp Studio Executive assigned to discussion sector #${sector} in SceneSense Studio.
Provide a concise 3-bullet executive summary of the thread, highlighting key takeaways, consensus points, and debate highlights.
Sign off: "Per Studio Oversight: We hope you enjoy the platform."`;

    const result = await generateWithCascade({
      contents: `Channel Sector: #${sector}\n\nDiscussion Log:\n${sanitizedThread}`,
      systemInstruction,
      temperature: 0.65,
    });

    return NextResponse.json({
      success: true,
      summary: result.success && result.text.trim()
        ? result.text.trim()
        : getFallbackSummary(threadType, sector),
      modelUsed: result.modelUsed,
    });
  } catch (error) {
    console.error("DirectorBot/ScriptDoctor API Error:", error.message || error);
    return NextResponse.json({ 
      success: true, 
      summary: getFallbackSummary(threadType, sector) 
    });
  }
}

function getFallbackSummary(type, channel) {
  if (type === 'script_doctor') {
    return `### [Sector #${channel} // Script Diagnosis]\n` +
      `1. **Subtextual Focus:** Discussion centers on literal plot mechanics—dig deeper into the underlying thematic tension.\n` +
      `2. **Pacing Momentum:** Secondary arguments can be tightened to highlight the core character stakes.\n` +
      `3. **Dramatic Payoff:** Elevate the emotional resonance of the third-act turning points.\n\n` +
      `We hope you enjoy the platform.`;
  }

  return `### [DirectorBot // Sector #${channel} Executive Briefing]\n` +
    `• **Key Consensus:** Viewers highlight strong visual craft and atmosphere across the featured title.\n` +
    `• **Open Debate:** Pacing and third-act interpretation remain active points of discussion.\n` +
    `• **Audience Signal:** Engagement remains constructive across all active replies.\n\n` +
    `Per Studio Oversight: We hope you enjoy the platform.`;
}
