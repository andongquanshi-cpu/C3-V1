import { NextResponse } from "next/server";
import { getHotspotApiKey } from "@/lib/server-api-config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      query,
      maxResults = 5,
      topic,
      timeRange,
      searchDepth,
      includeAnswer = false,
      includeRawContent = false,
      includeDomains,
      excludeDomains,
    } = body;

    const apiKey = getHotspotApiKey();
    if (!query) return NextResponse.json({ error: "缺少 query 参数" }, { status: 400 });
    if (!apiKey) {
      return NextResponse.json({ error: "服务端未配置 TAVILY_API_KEY" }, { status: 503 });
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        ...(topic ? { topic } : {}),
        ...(timeRange ? { time_range: timeRange } : {}),
        ...(searchDepth ? { search_depth: searchDepth } : {}),
        include_answer: includeAnswer,
        include_raw_content: includeRawContent,
        ...(Array.isArray(includeDomains) && includeDomains.length ? { include_domains: includeDomains } : {}),
        ...(Array.isArray(excludeDomains) && excludeDomains.length ? { exclude_domains: excludeDomains } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error || data.message || `Tavily API 请求失败：${response.status}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tavily proxy failed" }, { status: 500 });
  }
}
