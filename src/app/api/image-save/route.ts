import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// 下载大图 + 落地写盘，最坏情况 30-60s，保底 90s。
export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * 把上游图片 URL 下载并落地到 public/generated/{contentId}/，返回本地相对路径。
 * 供前端在生图成功后立刻二次持久化，避免上游 URL 24h 过期。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = String(body.url || "").trim();
    const contentId = String(body.contentId || "misc")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 64) || "misc";
    const imageIndex = Number.isFinite(Number(body.imageIndex)) ? Number(body.imageIndex) : 0;

    if (!url) return NextResponse.json({ error: "缺少 url" }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "url 必须是 http/https" }, { status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `下载图片失败：HTTP ${response.status}` },
        { status: 502 },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = response.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("png")
          ? "png"
          : "img";

    const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 8);
    const stamp = Date.now();
    const filename = `${imageIndex}_${stamp}_${hash}.${ext}`;

    const dir = path.join(process.cwd(), "public", "generated", contentId);
    await fs.mkdir(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buffer);

    const localPath = `/generated/${contentId}/${filename}`;
    return NextResponse.json({ localPath, size: buffer.byteLength, contentType });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存图片失败" },
      { status: 500 },
    );
  }
}
