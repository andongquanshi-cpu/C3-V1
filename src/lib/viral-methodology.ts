import fs from "node:fs";
import path from "node:path";
import { resolveKnowledgeBasePath } from "@/lib/knowledge-retriever";
import type { CreativeAngle } from "@/lib/types";
import type { VideoScriptModules } from "@/lib/video-script-routing";

type AnyRecord = Record<string, unknown>;

export interface ViralMethodologyDoc {
  userPsychology?: string[];
  antiAiVoice?: {
    neverOpenWith?: string[];
    neverUsePhrases?: string[];
    mustSoundLike?: string[];
  };
  titleModules?: Record<string, AnyRecord>;
  hookModules?: Record<string, AnyRecord>;
  bodyModules?: Record<string, AnyRecord>;
  ctaModules?: Record<string, string>;
  softProductIntegration?: { structure?: string; rules?: string[] };
  complianceAsTrust?: { rules?: string[] };
  videoShotGuidance?: Record<string, string>;
  referenceDirections?: Array<{ name?: string; hook?: string; logic?: string }>;
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
