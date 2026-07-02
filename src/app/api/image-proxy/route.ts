import { NextResponse } from "next/server";
import { getImageConfig } from "@/lib/server-api-config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size } = body;
    const config = getImageConfig();

    if (!prompt) return NextResponse.json({ error: "缺少 prompt 参数" }, { status: 400 });
    if (!config.apiKey) {
      return NextResponse.json({ error: "服务端未配置 IMAGE_API_KEY" }, { status: 503 });
    }

    const requestBody =
      config.format === "volcengine"
        ? {
            model: config.model,
            prompt,
            size: size || "2K",
            response_format: "url",
            watermark: false,
          }
        : { model: config.model, prompt, size: size || "1024x1792", n: 1 };

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
      const message = upstreamMessage
        ? `${upstreamMessage}（HTTP ${response.status}）`
        : `图片 API 请求失败：${response.status}，请检查 IMAGE_API_URL 是否含 /images/generations 及 IMAGE_MODEL 是否与方舟控制台一致`;
      return NextResponse.json({ error: message }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image proxy failed" }, { status: 500 });
  }
}
