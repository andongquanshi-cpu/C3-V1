export interface ApiStatus {
  ready: boolean;
  text: boolean;
  image: boolean;
  imageModel?: string;
  hotspot: boolean;
  model?: string;
}

export interface PromptMessages {
  system: string;
  user: string;
}

export type MatrixConfirmedStage = "elements" | "angles" | "content";

export interface MatrixWorkflowContext {
  mode: "matrix";
  confirmed: true;
  confirmedStage: MatrixConfirmedStage;
  snapshotId: string;
}

export interface TextGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
}

export interface ImageGenerationInput {
  prompt: string;
  overallStyle?: string;
  coverText?: string;
  role?: string;
  workflowContext?: MatrixWorkflowContext;
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}

export async function fetchApiStatus(): Promise<ApiStatus> {
  const response = await fetch("/api/config/status");
  return readJsonResponse<ApiStatus>(response, "服务状态读取失败");
}

export async function fetchKnowledgeBase<T>(): Promise<T> {
  const response = await fetch("/api/knowledge-base/list");
  return readJsonResponse<T>(response, "知识库加载失败");
}

export async function buildPromptApi(
  action: string,
  input: Record<string, unknown>,
): Promise<PromptMessages> {
  const response = await fetch("/api/prompt-engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, input }),
  });
  return readJsonResponse<PromptMessages>(response, "Prompt Engine 失败");
}

export async function generateTextApi(
  prompt: PromptMessages,
  options: TextGenerationOptions = {},
): Promise<string> {
  const response = await fetch("/api/llm-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 4096,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      seed: options.seed,
    }),
  });
  const data = await readJsonResponse<{
    choices?: Array<{ message?: { content?: string } }>;
  }>(response, "文字生成失败");
  return data.choices?.[0]?.message?.content || "";
}

export async function generateImageApi(input: ImageGenerationInput): Promise<string> {
  const response = await fetch("/api/image-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse<{
    data?: Array<{ url?: string }>;
    url?: string;
  }>(response, "图片生成失败");
  const url = data.data?.[0]?.url || data.url || "";
  if (!url) throw new Error("图片服务未返回图片地址");
  return url;
}

export async function persistGeneratedImageApi(input: {
  url: string;
  contentId: string;
  imageIndex: number;
}): Promise<string | undefined> {
  const response = await fetch("/api/image-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return undefined;
  const data = (await response.json().catch(() => ({}))) as { localPath?: string };
  return data.localPath;
}
