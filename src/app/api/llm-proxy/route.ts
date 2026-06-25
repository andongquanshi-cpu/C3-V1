import { NextResponse } from "next/server";
import { callChatCompletions } from "@/lib/llm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await callChatCompletions({
      apiUrl: body.apiUrl,
      apiKey: body.apiKey,
      model: body.model,
      messages: body.messages || [],
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      responseFormat: body.responseFormat,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "LLM proxy failed" }, { status: 500 });
  }
}
