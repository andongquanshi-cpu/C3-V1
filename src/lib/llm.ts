export interface LlmProxyInput {
  apiUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: unknown;
  /** 0-1，控制核采样阈值。传入后会覆盖服务商默认值。 */
  topP?: number;
  /** -2.0~2.0，DeepSeek/OpenAI 兼容参数，抑制重复 token。 */
  frequencyPenalty?: number;
  /** -2.0~2.0，DeepSeek/OpenAI 兼容参数，鼓励新话题。 */
  presencePenalty?: number;
  /** 整数种子，DeepSeek 新版 & OpenAI 支持；同 seed + 同参数会更接近同结果。 */
  seed?: number;
}

export async function callChatCompletions(input: LlmProxyInput) {
  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
    temperature: input.temperature ?? 0.8,
    max_tokens: input.maxTokens ?? 4096,
  };
  if (input.topP !== undefined) body.top_p = input.topP;
  if (input.frequencyPenalty !== undefined) body.frequency_penalty = input.frequencyPenalty;
  if (input.presencePenalty !== undefined) body.presence_penalty = input.presencePenalty;
  if (input.seed !== undefined) body.seed = input.seed;
  if (input.responseFormat) body.response_format = input.responseFormat;

  const response = await fetch(input.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : data.error?.message || `LLM API 请求失败：${response.status}`;
    throw new Error(message);
  }
  return data;
}
