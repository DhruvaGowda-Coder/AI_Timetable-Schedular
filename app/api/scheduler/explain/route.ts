import { NextResponse } from "next/server";
import { env, hasGroqApi } from "@/lib/env";
import { getSystemUserId } from "@/lib/system-user";
import { getUserBillingSummary } from "@/lib/subscription";
import type {
  AIExplanation,
  SchedulerConstraints,
  TimetableVariant,
} from "@/lib/types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are an expert academic timetable analyst. The user will give you a generated timetable and the constraints used to create it. Your job is to explain the timetable in plain English.

Respond with valid JSON only, using this exact shape:
{
  "summary": "2-3 sentences explaining the overall quality and structure of this timetable.",
  "highlights": ["3-5 bullet points about notable scheduling decisions — which faculty got which slots and why, how conflicts were avoided, how room utilization was balanced"],
  "warnings": ["0-3 warnings about potential issues — overloaded faculty, underutilized rooms, tight scheduling, etc. Empty array if none."]
}

Be specific and reference actual subject names, faculty names, and room names from the data. Keep language concise and professional.`;

function buildUserPrompt(
  variant: TimetableVariant,
  constraints: SchedulerConstraints
) {
  const constraintSummary = {
    days: constraints.days,
    slotsPerDay: constraints.slotsPerDay,
    subjects: constraints.subjects.map((s) => `${s.name} (${s.weeklyHours}hrs/wk)`),
    faculty: constraints.faculties.map(
      (f) => `${f.name} teaches [${f.canTeach.join(", ")}]${f.unavailableDays?.length ? ` (unavailable: ${f.unavailableDays.join(", ")})` : ""}`
    ),
    rooms: constraints.rooms.map((r) => `${r.name} (cap: ${r.capacity})`),
  };

  return `TIMETABLE VARIANT: "${variant.name}" (Score: ${variant.score}%)
SLOTS: ${JSON.stringify(variant.slots)}
CONSTRAINTS: ${JSON.stringify(constraintSummary)}`;
}

export async function POST(request: Request) {
  try {
    if (!hasGroqApi) {
      return NextResponse.json(
        { message: "AI insights are not configured. Please add a GROQ_API_KEY to your environment." },
        { status: 503 }
      );
    }

    const userId = await getSystemUserId();
    const billing = await getUserBillingSummary(userId);

    if (!billing.features.aiExplanations) {
      return NextResponse.json(
        { message: "AI Explanations require a Pro plan or above.", locked: true },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body?.variant || !body?.constraints) {
      return NextResponse.json(
        { message: "Missing variant or constraints data." },
        { status: 400 }
      );
    }

    const variant = body.variant as TimetableVariant;
    const constraints = body.constraints as SchedulerConstraints;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(variant, constraints) },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text().catch(() => "Unknown error");
      console.error("Groq API error:", groqResponse.status, errorText);
      return NextResponse.json(
        { message: "AI service temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content ?? "";

    let explanation: AIExplanation;
    try {
      const parsed = JSON.parse(content);
      explanation = {
        summary: typeof parsed.summary === "string" ? parsed.summary : "Unable to generate summary.",
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.filter((h: unknown) => typeof h === "string") : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter((w: unknown) => typeof w === "string") : [],
      };
    } catch {
      explanation = {
        summary: content.slice(0, 500) || "AI analysis completed but could not be structured.",
        highlights: [],
        warnings: [],
      };
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("AI explain route error:", error);
    return NextResponse.json(
      { message: "Failed to generate AI insights." },
      { status: 500 }
    );
  }
}


