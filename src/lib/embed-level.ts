import type { EmbedLevel } from "@/lib/types";

/** 植入强度：纯内容 / 场景桥接 / 强硬植入 */
export interface EmbedLevelOption {
  value: EmbedLevel;
  label: string;
  hint: string;
}

export const EMBED_LEVEL_OPTIONS: EmbedLevelOption[] = [
  {
    value: "none",
    label: "纯内容",
    hint: "几乎不提产品，只写经历/观点/干货",
  },
  {
    value: "medium",
    label: "场景桥接",
    hint: "痛点故事里自然带出，像真人分享，不硬写产品",
  },
  {
    value: "high",
    label: "强硬植入",
    hint: "约 40% 场景 + 60% 产品/子功能路径说明",
  },
];

const EMBED_LABELS: Record<EmbedLevel, string> = {
  none: "纯内容",
  medium: "场景桥接",
  high: "强硬植入",
};

/** 历史 low（自然带过）映射为 medium */
export function normalizeEmbedLevel(value: unknown): EmbedLevel {
  const raw = String(value || "medium").trim().toLowerCase();
  if (raw === "low") return "medium";
  if (raw === "none" || raw === "medium" || raw === "high") return raw;
  return "medium";
}

export function getEmbedLevelLabel(level: EmbedLevel | string | undefined): string {
  return EMBED_LABELS[normalizeEmbedLevel(level)];
}

function buildEmbedSharedGuide(embed: EmbedLevel, label: string): string {
  if (embed === "high") {
    return [
      "【high · 强硬植入】",
      "- 篇幅分配：前约 40% 场景/痛点铺垫，后约 60% 须清晰展开平台→主推产品→子功能的路径与分工。",
      "- 必须写全 Brief 勾选的主推产品及其子功能，须有结构（体验→筛选→了解等），但仍须口语化。",
      "- 仅本档位可参考 strongInsertPhrases；禁止荐基、收益承诺、催促申购。",
      "",
      `【当前植入强度：${label}（${embed}）】`,
    ].join("\n");
  }

  if (embed === "medium") {
    return [
      "【medium · 场景桥接】",
      "- 读者先被故事/情绪/干货吸引；产品信息像真人分享里顺口带出，不是写作任务。",
      "- 可在解决痛点的句子里轻点平台/产品/子功能，全文 1–2 句即可，不必写全层级，不必像教程。",
      "- 禁止：功能清单、操作步骤、标题围绕产品名、为植入而植入。",
      "",
      `【当前植入强度：${label}（${embed}）】`,
    ].join("\n");
  }

  return [
    "【none · 纯内容】",
    "- 这篇笔记首先必须像小红书真人分享：有具体场景、情绪或判断，读者愿意看完、收藏、评论。",
    "- 正文可以不出现任何产品名、功能名或操作路径。",
    "- 若 Brief 已勾选主推功能，不要为了「植入」额外编造未提供的卖点。",
    "",
    `【当前植入强度：${label}（${embed}）】`,
  ].join("\n");
}

export function formatEmbedLevelForPrompt(level: EmbedLevel | string | undefined): string {
  const embed = normalizeEmbedLevel(level);
  const label = getEmbedLevelLabel(embed);
  const shared = buildEmbedSharedGuide(embed, label);

  const tierRules: Record<EmbedLevel, string> = {
    none: [
      "- 价值来自经历、复盘、观点、避坑或信息整理；转化靠文末一句「想了解可自行搜索」类轻提示即可（可选）。",
      "- 标题和开头钩子围绕生活/情绪/困惑，不要围绕产品名。",
    ].join("\n"),
    medium: [
      "- 主线 90%+ 是真人故事/情绪/干货；产品只在「刚好聊到」时出现，像朋友顺口一提。",
      "- 全文产品相关表述建议 ≤2 句、≤20% 篇幅；可只轻点平台名，或顺带一句主推产品/子功能，**不强制写全**。",
      "- 理解产品层级（平台→主推产品→子功能），但写作时不要像填表；读者感受应是「先好看，顺便知道理财通/固收+」。",
      "- 可用 softInsertPhrases 改写参考；禁止 strongInsertPhrases、禁止步骤教程口吻。",
    ].join("\n"),
    high: [
      "- 前约 40%：场景+痛点+判断铺垫；后约 60%：强硬但合规地展开平台→主推产品→全部子功能的路径说明。",
      "- 必须写清主推产品及其子功能的分工（体验/筛选/了解等），须有可跟随的结构。",
      "- insertStrength 必须填 high；缺主推产品或缺任一勾选子功能视为不合格。",
    ].join("\n"),
  };

  return `${shared}\n${tierRules[embed]}`;
}

export function resolveFeatureInjectionLimit(
  embedLevel: EmbedLevel | string | undefined,
  selectedFeatureIds: string[] = [],
): number {
  return capSelectedFeaturesByEmbedLevel(embedLevel, selectedFeatureIds);
}

export function capSelectedFeaturesByEmbedLevel(
  embedLevel: EmbedLevel | string | undefined,
  selectedFeatureIds: string[] = [],
): number {
  const limits: Record<EmbedLevel, number> = {
    none: 0,
    medium: 2,
    high: 4,
  };
  const cap = limits[normalizeEmbedLevel(embedLevel)];
  if (selectedFeatureIds.length === 0) return cap;
  return Math.min(selectedFeatureIds.length, cap);
}

export function shouldIncludeStrongInsertPhrases(embedLevel: EmbedLevel | string | undefined): boolean {
  return normalizeEmbedLevel(embedLevel) === "high";
}

/** 正文质检：仅 high 强制命中全部子功能 */
export function resolveMinRequiredBriefFeatures(
  embedLevel: EmbedLevel | string | undefined,
  briefFeatureCount: number,
): number {
  if (briefFeatureCount <= 0) return 0;
  if (normalizeEmbedLevel(embedLevel) === "high") return briefFeatureCount;
  return 0;
}

/** 仅 high 强制正文出现主推产品且走完整层级 */
export function requiresStrictProductHierarchy(embedLevel: EmbedLevel | string | undefined): boolean {
  return normalizeEmbedLevel(embedLevel) === "high";
}

/** @deprecated 使用 requiresStrictProductHierarchy */
export function requiresOfferInBody(embedLevel: EmbedLevel | string | undefined): boolean {
  return requiresStrictProductHierarchy(embedLevel);
}
