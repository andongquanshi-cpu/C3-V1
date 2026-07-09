import { NextResponse } from "next/server";
import { getImageConfig } from "@/lib/server-api-config";

// Seedream 5.0 pro 首图耗时约 60–80s，需将 Route Handler 超时抬到 120s。
// Node 运行时（非 Edge）才支持 maxDuration。
export const runtime = "nodejs";
export const maxDuration = 120;

function formatFetchError(error: unknown, apiUrl: string) {
  const cause =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
  if (error instanceof Error && error.message === "fetch failed") {
    let host = apiUrl;
    try {
      host = new URL(apiUrl).host;
    } catch {
      // keep raw apiUrl
    }
    return `无法连接图片服务（${host}），请检查 IMAGE_API_URL、网络/代理，以及改 .env 后是否已重启 dev${cause ? `：${cause}` : ""}`;
  }
  return error instanceof Error ? error.message : "Image proxy failed";
}

/**
 * 将「整体把控提示词 + 视觉计划单张 prompt + 画面文案」合成为最终 prompt。
 * 复用同样的合规兜底句，避免上游 LLM 忘记禁项。
 */
function assembleFinalPrompt({
  overallStyle,
  prompt,
  coverText,
  role,
}: {
  overallStyle?: string;
  prompt: string;
  coverText?: string;
  role?: string;
}): string {
  const parts: string[] = [];
  parts.push("小红书竖版 3:4 卡片");
  if (overallStyle && overallStyle.trim()) {
    parts.push(`【整体视觉规范】\n${overallStyle.trim()}`);
  }
  parts.push(`【本张画面】\n${prompt.trim()}`);
  if (coverText && coverText.trim()) {
    const label = role === "cover" ? "封面大字" : "画面内文案";
    parts.push(`【${label}】\n在画面显著位置醒目呈现文字：「${coverText.trim()}」，字体清晰易读、留有充足留白，禁止出现错别字。`);
  }
  parts.push(
    "【合规约束】不出现真实人物正脸特写；禁止：股票代码、具体收益数字、承诺性文案、暴富金币、满屏红绿 K 线、二维码、水印、明星肖像。",
  );
  return parts.join("\n\n");
}

export async function POST(request: Request) {
  const config = getImageConfig();
  try {
    const body = await request.json();
    const {
      prompt,
      size,
      overallStyle,
      coverText,
      role,
    }: {
      prompt?: string;
      size?: string;
      overallStyle?: string;
      coverText?: string;
      role?: string;
    } = body || {};

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "缺少 prompt 参数" }, { status: 400 });
    }
    if (!config.apiKey) {
      return NextResponse.json({ error: "服务端未配置 IMAGE_API_KEY" }, { status: 503 });
    }

    const finalPrompt = assembleFinalPrompt({ overallStyle, prompt, coverText, role });

    const requestBody =
      config.format === "volcengine"
        ? {
            model: config.model,
            prompt: finalPrompt,
            size: size || "2K",
            response_format: "url",
            watermark: false,
          }
        : { model: config.model, prompt: finalPrompt, size: size || "1024x1792", n: 1 };

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const upstreamMessage =
        typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || data.error?.code;
      const modelHint =
        response.status === 404
          ? `；404 多为 IMAGE_MODEL 未开通或与方舟控制台「模型 ID / 推理接入点 ep-xxx」不一致（当前：${config.model}）`
          : "";
      const message = upstreamMessage
        ? `${upstreamMessage}（HTTP ${response.status}）${modelHint}`
        : `图片 API 请求失败：${response.status}，请检查 IMAGE_API_URL（应为 .../api/v3/images/generations）及 IMAGE_MODEL${modelHint}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }
    return NextResponse.json({ ...data, finalPrompt });
  } catch (error) {
    return NextResponse.json({ error: formatFetchError(error, config.apiUrl) }, { status: 500 });
  }
}
