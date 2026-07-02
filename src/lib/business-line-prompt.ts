import type { EmbedLevel } from "@/lib/types";
import { formatEmbedLevelForPrompt } from "@/lib/embed-level";

type AnyRecord = Record<string, unknown>;

function toArray(value: unknown): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

export function resolveBrandName(businessLine?: string): string {
  const line = String(businessLine || "weisec").toLowerCase();
  return line === "licaitong" || line === "lct" || line === "理财通" ? "腾讯理财通" : "腾讯微证券";
}

export function isLicaitongLine(businessLine?: string): boolean {
  const line = String(businessLine || "").toLowerCase();
  return line === "licaitong" || line === "lct" || line === "理财通";
}

/** 运行时覆盖 personas/ 里写死的微证券/理财通 CTA，避免串品牌 */
export function buildBusinessLineRuntimeLock(
  businessLine?: string,
  brandVoice?: AnyRecord,
  embedLevel?: EmbedLevel | string,
): string {
  const embedGuide = formatEmbedLevelForPrompt(embedLevel || "low");
  const paths = toArray(brandVoice?.standardConversionPaths).slice(0, 2);

  if (isLicaitongLine(businessLine)) {
    const pathHint = paths.length ? paths.join("；") : "微信 → 我 → 服务 → 理财通";
    return [
      "【业务线锁定 · 理财通 — 覆盖人设模板中的默认 CTA】",
      "- 本篇 ONLY 推广「腾讯理财通」，禁止出现：腾讯微证券、微证券、搜微证券、开户、热股榜、问元宝（证券语境）等微证券专属表述。",
      `- 若需要 CTA，仅允许：${pathHint}；或口语「微信里搜理财通看看」。`,
      "- 产品能力只能来自运行时注入的 selectedFeatures（如严选专区、虚拟理财金、AI 辅助等），禁止编造未提供的功能。",
      "- 正文必须先有完整的生活/故事/观点/干货（至少 200 字），CTA/interactionGuide 最多 1 句，不得用 CTA 代替正文。",
      "- 禁止把理财通与微证券写在同一句 CTA 里。",
      embedGuide,
    ].join("\n");
  }

  const pathHint = paths.length ? paths.join("；") : "微信搜索腾讯微证券进入官方小程序";
  return [
    "【业务线锁定 · 微证券 — 覆盖人设模板中的默认 CTA】",
    "- 本篇 ONLY 推广「腾讯微证券」，禁止出现理财通、固收+严选专区、申购基金（理财通语境）等理财通专属表述。",
    `- 若需要 CTA，仅允许：${pathHint}；或口语「微信里搜腾讯微证券」。`,
    "- 产品能力只能来自运行时注入的 selectedFeatures。",
    "- 正文必须先有完整内容（至少 200 字），CTA 最多 1 句，不得用 CTA 代替正文。",
    embedGuide,
  ].join("\n");
}

const WEISEC_MARKERS = ["腾讯微证券", "微证券", "搜微证券", "热股榜", "问元宝"];
const LCT_MARKERS = ["腾讯理财通", "理财通", "严选专区", "固收+"];

export function detectMixedBrandCopy(text: string): string | null {
  const normalized = String(text || "");
  if (!normalized.trim()) return null;
  const hasWeisec = WEISEC_MARKERS.some((m) => normalized.includes(m));
  const hasLct = LCT_MARKERS.some((m) => normalized.includes(m));
  if (hasWeisec && hasLct) {
    return "同一段文案同时出现微证券与理财通表述，属于串品牌";
  }
  return null;
}

export function validateGeneratedBody(
  content: string,
  businessLine?: string,
): { ok: boolean; reason?: string } {
  const body = String(content || "").trim();
  if (!body) return { ok: false, reason: "正文为空" };

  const mixed = detectMixedBrandCopy(body);
  if (mixed) return { ok: false, reason: mixed };

  if (body.length < 80) {
    return { ok: false, reason: "正文过短，疑似只有 CTA 或风险提示，缺少真诚内容主体" };
  }

  const ctaOnly =
    /^👉/.test(body) &&
    body.length < 120 &&
    (body.includes("微信搜") || body.includes("微信 →"));
  if (ctaOnly) {
    return { ok: false, reason: "正文几乎只有导流句，请先写生活/故事/观点再轻点产品" };
  }

  if (isLicaitongLine(businessLine)) {
    if (WEISEC_MARKERS.some((m) => body.includes(m))) {
      return { ok: false, reason: "理财通内容中出现了微证券品牌或能力表述" };
    }
  } else if (LCT_MARKERS.some((m) => body.includes("严选专区") || m === "固收+")) {
    if (body.includes("严选专区") || body.includes("固收+")) {
      return { ok: false, reason: "微证券内容中出现了理财通专属产品表述" };
    }
  }

  return { ok: true };
}
