import { NextResponse } from "next/server";
import { buildEastMoneySearchQueries } from "@/lib/eastmoney-hotspot";
import { searchEastMoneyNewsViaMcp } from "@/lib/eastmoney-mcp-client";
import { getEastMoneyApiKey } from "@/lib/server-api-config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body.query || "").trim();
    if (!query) return NextResponse.json({ error: "缺少 query 参数" }, { status: 400 });

    const apiKey = getEastMoneyApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "服务端未配置 EASTMONEY_API_KEY（东财 MCP em_api_key）" },
        { status: 503 },
      );
    }

    const items = await searchEastMoneyNewsViaMcp(query, apiKey);
    return NextResponse.json({ query, items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "East Money MCP failed" },
      { status: 500 },
    );
  }
}

/** 批量搜索：供工作台一次拉多个分类 query */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "trending";
  const topic = searchParams.get("topic") || "";
  const businessLine = searchParams.get("businessLine") || "weisec";
  const custom = searchParams.get("custom") || "";

  const apiKey = getEastMoneyApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "未配置 EASTMONEY_API_KEY" }, { status: 503 });
  }

  const queries = buildEastMoneySearchQueries(tab, topic, custom, businessLine);
  const errors: string[] = [];
  const items = [];

  for (const query of queries) {
    try {
      const batch = await searchEastMoneyNewsViaMcp(query, apiKey);
      items.push(...batch);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "搜索失败");
    }
  }

  if (!items.length && errors.length) {
    return NextResponse.json({ error: errors[0], queries }, { status: 500 });
  }

  return NextResponse.json({ queries, items, errors });
}
