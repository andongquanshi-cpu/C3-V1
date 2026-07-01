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
        ? { model: config.model, prompt, size: size || "1728x2304", response_format: "url" }
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
      const message =
        typeof data.error === "string" ? data.error : data.error?.message || `图片 API 请求失败：${response.status}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image proxy failed" }, { status: 500 });
  }
}
