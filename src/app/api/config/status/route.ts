import { NextResponse } from "next/server";
import { getServerApiStatus } from "@/lib/server-api-config";

export async function GET() {
  return NextResponse.json(getServerApiStatus());
}
