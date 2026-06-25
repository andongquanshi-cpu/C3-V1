import { NextResponse } from "next/server";
import {
  buildComplianceReviewPrompt,
  buildContentGenerationPrompt,
  buildCoverSuggestionsPrompt,
  buildCreativeAnglesPrompt,
  buildPersonaContentGenerationPrompt,
} from "@/lib/prompt-engine";

const builders = {
  creativeAngles: buildCreativeAnglesPrompt,
  contentGeneration: buildContentGenerationPrompt,
  personaContent: buildPersonaContentGenerationPrompt,
  complianceReview: buildComplianceReviewPrompt,
  coverSuggestions: buildCoverSuggestionsPrompt,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as keyof typeof builders;
    const builder = builders[action];
    if (!builder) return NextResponse.json({ error: "未知 prompt action" }, { status: 400 });
    return NextResponse.json(builder(body.input || {}));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Prompt engine failed" }, { status: 500 });
  }
}
