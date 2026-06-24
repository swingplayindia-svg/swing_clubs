import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";

const SPORT_PERSONALITIES: Record<string, string> = {
  football:   "passionate football commentator in the style of a Premier League broadcast",
  cricket:    "energetic cricket commentator with deep knowledge of the game",
  basketball: "high-energy NBA-style commentator",
  padel:      "enthusiastic padel commentator",
  badminton:  "sharp badminton commentator with technical insight",
  pickleball: "lively pickleball commentator",
  tennis:     "authoritative tennis commentator",
  default:    "professional sports commentator",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sport = "football", homeTeam, awayTeam, homeScore, awayScore, period, recentEvent, context } = body;

    const personality = SPORT_PERSONALITIES[sport.toLowerCase()] ?? SPORT_PERSONALITIES.default;

    const systemPrompt = `You are a ${personality}. Generate ONE single line of exciting live match commentary (max 180 characters). Be vivid, dramatic, and authentic. Never use hashtags or emoji. Return only the commentary text, nothing else.`;

    const userPrompt = `Match: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
Period: ${period ?? "match"}
${recentEvent ? `Recent event: ${recentEvent}` : ""}
${context ? `Context: ${context}` : ""}

Generate commentary:`;

    const completion = await getGroqClient().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0.9,
    });

    const commentary = completion.choices[0]?.message?.content?.trim() ?? "What a moment in this match!";
    return NextResponse.json({ commentary });
  } catch (err) {
    console.error("AI commentary error:", err);
    return NextResponse.json({ error: "Failed to generate commentary" }, { status: 500 });
  }
}
