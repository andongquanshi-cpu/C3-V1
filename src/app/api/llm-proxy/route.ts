import { NextResponse } from "next/server";
import { callChatCompletions } from "@/lib/llm";
import { getTextLlmConfig } from "@/lib/server-api-config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = getTextLlmConfig();
    if (!config.apiKey) {
      return NextResponse.json({ error: "服务端未配置 LLM_API_KEY，请联系管理员在 .env 中设置" }, { status: 503 });
    }
    const data = await callChatCompletions({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      model: config.model,
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
