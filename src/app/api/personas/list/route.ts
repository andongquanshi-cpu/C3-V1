import { NextResponse } from "next/server";
import { listActivePersonas, loadAudiences } from "@/lib/persona-loader";

export async function GET() {
  try {
    return NextResponse.json({
      personas: listActivePersonas(),
      audiences: loadAudiences(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "人设库加载失败" },
      { status: 500 },
    );
  }
}
