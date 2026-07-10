import type { EmbedLevel, GenerationMode } from "@/lib/types";
import { formatEmbedLevelForPrompt, normalizeEmbedLevel } from "@/lib/embed-level";
import { buildNarrativeAntiTemplateLock } from "@/lib/narrative-anti-template";
import { isSkeletonVideoScript } from "@/lib/video-script-quality";

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
  generationMode?: GenerationMode | string,
  narrativeOptions?: { creationScene?: string; personaId?: string },
): string {
  const embed = normalizeEmbedLevel(embedLevel || "medium");
  if (embed === "none") {
    const brandName = resolveBrandName(businessLine);
    const narrativeLock = buildNarrativeAntiTemplateLock(
      isLicaitongLine(businessLine) ? "licaitong" : "weisec",
      {
        creationScene: narrativeOptions?.creationScene,
        personaId: narrativeOptions?.personaId,
        generationMode,
      },
    );
    return [
      "【纯内容档位 · 覆盖业务线默认推广与人设 CTA】",
      "- 本篇是经历/观点/情绪/干货分享，不是品牌帖或产品帖。",
      `- 正文禁止出现：${brandName}、平台名、产品名、功能名、操作路径、开户/申购/搜索引导。`,
      "- 标题与开头围绕生活/情绪/困惑，禁止从第一句就写产品或品牌。",
      "- 禁止 CTA、interactionGuide、「微信搜 XX」类导流。",
      narrativeLock,
      formatEmbedLevelForPrompt("none"),
    ].join("\n");
  }

  const embedGuide = formatEmbedLevelForPrompt(embedLevel || "medium");
  const paths = toArray(brandVoice?.standardConversionPaths).slice(0, 2);
  const isVideo = generationMode === "video-script";
  const isHighEmbed = normalizeEmbedLevel(embedLevel || "medium") === "high";
  const bodyRule = isVideo
    ? "- 必须先有完整分镜与口播主体，CTA/interactionGuide 最多 1 句，不得用 CTA 代替脚本。"
    : isHighEmbed
      ? "- high 档位：正文须满足约 40% 场景铺垫 + 60% 产品/功能组合说明；CTA/interactionGuide 最多 1 句。"
      : "- 正文必须先有完整的生活/故事/观点/干货（至少 200 字），CTA/interactionGuide 最多 1 句，不得用 CTA 代替正文。";

  const narrativeLock = buildNarrativeAntiTemplateLock(
    isLicaitongLine(businessLine) ? "licaitong" : "weisec",
    {
      creationScene: narrativeOptions?.creationScene,
      personaId: narrativeOptions?.personaId,
      generationMode,
    },
  );

  if (isLicaitongLine(businessLine)) {
    const pathHint = paths.length ? paths.join("；") : "微信 → 我 → 服务 → 理财通";
    return [
      "【业务线锁定 · 理财通 — 覆盖人设模板中的默认 CTA】",
      "- 本篇 ONLY 推广「腾讯理财通」，禁止出现：腾讯微证券、微证券、搜微证券、开户、热股榜、问元宝（证券语境）等微证券专属表述。",
      `- 若需要 CTA，仅允许：${pathHint}；或口语「微信里搜理财通看看」。`,
      "- 产品能力只能来自运行时注入的 selectedFeatures（如严选专区、虚拟理财金、AI 辅助等），禁止编造未提供的功能。",
      bodyRule,
      "- 禁止把理财通与微证券写在同一句 CTA 里。",
      narrativeLock,
      embedGuide,
    ].join("\n");
  }

  const pathHint = paths.length ? paths.join("；") : "微信搜索腾讯微证券进入官方小程序";
  const weisecBodyRule = isVideo
    ? "- 必须先有完整分镜与口播主体，CTA 最多 1 句，不得用 CTA 代替脚本。"
    : "- 正文必须先有完整内容（至少 200 字），CTA 最多 1 句，不得用 CTA 代替正文。";
  return [
    "【业务线锁定 · 微证券 — 覆盖人设模板中的默认 CTA】",
    "- 本篇 ONLY 推广「腾讯微证券」，禁止出现理财通、固收+严选专区、申购基金（理财通语境）等理财通专属表述。",
    `- 若需要 CTA，仅允许：${pathHint}；或口语「微信里搜腾讯微证券」。`,
    "- 产品能力只能来自运行时注入的 selectedFeatures。",
    weisecBodyRule,
    narrativeLock,
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
  generationMode?: GenerationMode | string,
): { ok: boolean; reason?: string } {
  const body = String(content || "").trim();
  if (!body) return { ok: false, reason: "正文为空" };

  const mixed = detectMixedBrandCopy(body);
  if (mixed) return { ok: false, reason: mixed };

  const isVideo = generationMode === "video-script";
  const minLength = isVideo ? 40 : 80;
  if (body.length < minLength) {
    return isVideo
      ? { ok: false, reason: "视频脚本过短，疑似缺少分镜口播主体" }
      : { ok: false, reason: "正文过短，疑似只有 CTA 或风险提示，缺少真诚内容主体" };
  }

  if (isVideo) {
    if (isSkeletonVideoScript(body)) {
      return {
        ok: false,
        reason: "视频脚本只有镜头时长占位，缺少口播和画面（请重试或换角度）",
      };
    }
    const voiceChars = (body.match(/[\u4e00-\u9fff]/g) || []).length;
    if (voiceChars < 35) {
      return { ok: false, reason: `视频脚本口播内容过短（约${voiceChars}字），疑似未生成完整分镜` };
    }
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
