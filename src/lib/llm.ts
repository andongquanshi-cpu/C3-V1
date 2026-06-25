export interface LlmProxyInput {
  apiUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: unknown;
}

export async function callChatCompletions(input: LlmProxyInput) {
  const response = await fetch(input.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.8,
      max_tokens: input.maxTokens ?? 4096,
      ...(input.responseFormat ? { response_format: input.responseFormat } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : data.error?.message || `LLM API 请求失败：${response.status}`;
    throw new Error(message);
  }
  return data;
}
