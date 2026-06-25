import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size, format = "volcengine", apiKey, apiUrl, model } = body;

    if (!prompt) return NextResponse.json({ error: "缺少 prompt 参数" }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: "请先配置图片 API Key" }, { status: 400 });

    const targetUrl = format === "volcengine"
      ? apiUrl || "https://ark.cn-beijing.volces.com/api/v3/images/generations"
      : apiUrl || "https://api.openai.com/v1/images/generations";
    const modelName = model || (format === "volcengine" ? "doubao-seedream-3.0-t2i" : "dall-e-3");
    const requestBody = format === "volcengine"
      ? { model: modelName, prompt, size: size || "1728x2304", response_format: "url" }
      : { model: modelName, prompt, size: size || "1024x1792", n: 1 };

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof data.error === "string" ? data.error : data.error?.message || `图片 API 请求失败：${response.status}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image proxy failed" }, { status: 500 });
  }
}
