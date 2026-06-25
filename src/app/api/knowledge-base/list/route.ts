import { NextResponse } from "next/server";
import { buildKnowledgeBaseListView } from "@/lib/knowledge-retriever";

export async function GET() {
  try {
    return NextResponse.json(buildKnowledgeBaseListView());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Knowledge base failed" }, { status: 500 });
  }
}
