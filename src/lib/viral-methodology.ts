import fs from "node:fs";
import path from "node:path";
import { resolveKnowledgeBasePath } from "@/lib/knowledge-retriever";
import type { CreativeAngle } from "@/lib/types";
import type { VideoScriptModules } from "@/lib/video-script-routing";

type AnyRecord = Record<string, unknown>;

export interface ViralMethodologyDoc {
  sourcePolicy?: {
    productFacts?: string;
    methodology?: string;
    forbiddenEvidence?: string[];
  };
  userPsychology?: string[];
  antiAiVoice?: {
    neverOpenWith?: string[];
    neverUsePhrases?: string[];
    mustSoundLike?: string[];
  };
  titleModules?: Record<string, AnyRecord>;
  hookModules?: Record<string, AnyRecord>;
  bodyModules?: Record<string, AnyRecord>;
  contentFormats?: Record<string, AnyRecord>;
  tagStrategy?: {
    principle?: string;
    count?: { min?: number; target?: number; max?: number };
    buckets?: string[];
    businessLines?: Record<
      string,
      {
        core?: string[];
        brand?: string[];
        featureMap?: Record<string, string[]>;
        offerMap?: Record<string, string[]>;
      }
    >;
    forbidden?: string[];
  };
  ctaModules?: Record<string, string>;
  softProductIntegration?: { structure?: string; rules?: string[] };
  complianceAsTrust?: { rules?: string[] };
  videoShotGuidance?: Record<string, string>;
  referenceDirections?: Array<{ name?: string; hook?: string; logic?: string }>;
}

export interface TagStrategyContext {
  businessLine?: string;
  offerId?: string;
  selectedFeatureIds?: string[];
  embedLevel?: string;
}

let cachedDoc: ViralMethodologyDoc | null = null;

export function loadViralMethodologyDoc(): ViralMethodologyDoc | null {
  if (cachedDoc) return cachedDoc;
  try {
    const kbPath = resolveKnowledgeBasePath();
    const filePath = path.join(
      kbPath,
      "layers/L3-content-pattern/a_shared/xhs-viral-methodology.json",
    );
    if (!fs.existsSync(filePath)) return null;
    cachedDoc = JSON.parse(fs.readFileSync(filePath, "utf8")) as ViralMethodologyDoc;
    return cachedDoc;
  } catch {
    return null;
  }
}

function pickModule<T extends AnyRecord>(pool: Record<string, T> | undefined, key: string): T | null {
  if (!pool || !pool[key]) return null;
  return pool[key];
}

export function formatViralMethodologyForVideoPrompt(
  modules: VideoScriptModules,
  angle?: CreativeAngle | Record<string, unknown>,
): string {
  const doc = loadViralMethodologyDoc();
  if (!doc) return "";

  const titleMod = pickModule(doc.titleModules, modules.titleType);
  const hookMod = pickModule(doc.hookModules, modules.hookType);
  const bodyMod = pickModule(doc.bodyModules, modules.bodyStructure);
  const ctaText = doc.ctaModules?.[modules.ctaStyle] || modules.ctaGuidance;
  const durationKey = String(modules.shotCountHint || "").includes("15") ? "15s" : String(modules.shotCountHint || "").includes("60") ? "60s" : "30s";
  const shotGuide = doc.videoShotGuidance?.[durationKey] || "";

  const angleRecord = (angle || {}) as CreativeAngle;
  const refDirection = doc.referenceDirections?.find((item) =>
    angleRecord.coreIdea ? String(angleRecord.coreIdea).includes(String(item.name)) : false,
  );

  const parts = [
    "【爆文范式库 · 微证券团队 script1+script2，本篇按需取用，禁止整段照搬】",
    "",
    "▸ 读者心理（至少命中1条）",
    ...(doc.userPsychology || []).map((item) => `  - ${item}`),
    "",
    `▸ 本篇标题范式：${modules.titleTypeLabel}`,
    titleMod?.formula ? `  公式：${titleMod.formula}` : "",
    titleMod?.whenToUse ? `  适用：${titleMod.whenToUse}` : "",
    ...(Array.isArray(titleMod?.examples) ? (titleMod.examples as string[]).slice(0, 2).map((e) => `  参考语气（须改写）：${e}`) : []),
    "",
    `▸ 本篇开篇：${modules.hookTypeLabel}`,
    "  （开场风格按本篇路由，强钩子不是默认；软开场/直接干货同样合格）",
    hookMod?.guidance ? `  ${hookMod.guidance}` : modules.hookGuidance,
    ...(Array.isArray(hookMod?.oralExamples) ? (hookMod.oralExamples as string[]).slice(0, 2).map((e) => `  口播气质参考：${e}`) : []),
    "",
    `▸ 本篇骨架构：${modules.bodyStructureLabel}`,
    bodyMod?.guidance ? `  ${bodyMod.guidance}` : modules.bodyGuidance,
    ...(Array.isArray(bodyMod?.oralExamples) ? (bodyMod.oralExamples as string[]).slice(0, 2).map((e) => `  口播气质参考：${e}`) : []),
    "",
    `▸ CTA：${ctaText}`,
    shotGuide ? `▸ 分镜节奏：${shotGuide}` : `▸ 分镜节奏：${modules.shotCountHint}`,
    "",
    "▸ 软植入（script1）",
    doc.softProductIntegration?.structure ? `  结构：${doc.softProductIntegration.structure}` : "",
    ...(doc.softProductIntegration?.rules || []).map((r) => `  - ${r}`),
    "",
    "▸ 去 AI 味（硬性）",
    "  禁止开篇：" + (doc.antiAiVoice?.neverOpenWith || []).slice(0, 6).join("、"),
    "  禁止套话：" + (doc.antiAiVoice?.neverUsePhrases || []).slice(0, 5).join("、"),
    ...(doc.antiAiVoice?.mustSoundLike || []).map((r) => `  - ${r}`),
  ];

  if (refDirection) {
    parts.push("", "▸ 选题方向参考（改写融入，勿照抄）", `  钩子气质：${refDirection.hook}`, `  叙事逻辑：${refDirection.logic}`);
  }

  if (angleRecord.coreIdea) {
    parts.push("", `▸ 本篇角度主线：${angleRecord.coreIdea}`);
  }
  if (angleRecord.userPainPoint) {
    parts.push(`▸ 读者痛点：${angleRecord.userPainPoint}`);
  }

  return parts.filter(Boolean).join("\n");
}

export function formatXhsContentMethodologyForPrompt(): string {
  const doc = loadViralMethodologyDoc();
  if (!doc) return "无额外方法论";

  const titleLines = Object.values(doc.titleModules || {})
    .slice(0, 4)
    .map((item) => `- ${String(item.label || "标题类型")}：${String(item.formula || "")}`);
  const formatLines = Object.values(doc.contentFormats || {})
    .slice(0, 4)
    .map((item) => `- ${String(item.label || "内容结构")}：${String(item.structure || item.whenToUse || "")}`);

  return [
    "【小红书内容方法论 · 仅吸收结构，不引用外部未核验数据】",
    doc.sourcePolicy?.methodology || "",
    "标题四模块：",
    ...titleLines,
    "正文可选结构（只选最贴合场景的一个）：",
    ...formatLines,
    "软植入：" + (doc.softProductIntegration?.structure || "痛点→场景→解决路径→个人感受→风险提示"),
    "去 AI 味：" + (doc.antiAiVoice?.mustSoundLike || []).slice(0, 3).join("；"),
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatTagStrategyForPrompt(context: TagStrategyContext): string {
  const strategy = loadViralMethodologyDoc()?.tagStrategy;
  if (!strategy) return "话题必须与正文强相关。";

  const line = context.businessLine === "licaitong" ? "licaitong" : "weisec";
  const lineStrategy = strategy.businessLines?.[line];
  const featureTags = (context.selectedFeatureIds || []).flatMap(
    (featureId) => lineStrategy?.featureMap?.[featureId] || [],
  );
  const offerTags = context.offerId ? lineStrategy?.offerMap?.[context.offerId] || [] : [];
  const brandTags = context.embedLevel === "none" ? [] : lineStrategy?.brand || [];

  return [
    "【话题策略 · 强相关而非堆砌】",
    strategy.principle || "",
    `- 数量：${strategy.count?.min || 8}-${strategy.count?.max || 10} 个，目标 ${strategy.count?.target || 9} 个`,
    ...(strategy.buckets || []).map((item) => `- ${item}`),
    `- 本业务线核心词候选：${(lineStrategy?.core || []).join("、")}`,
    offerTags.length ? `- 当前 Offer 词：${offerTags.join("、")}` : "",
    featureTags.length ? `- 已选功能词：${[...new Set(featureTags)].join("、")}` : "",
    brandTags.length ? `- 品牌直连词（须保留 2-3 个）：${brandTags.join("、")}` : "- none 植入：不强制品牌词",
    `- 禁止：${(strategy.forbidden || []).join("；")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
