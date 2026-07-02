import type { EmbedLevel } from "@/lib/types";

/** 内容优先：植入档位描述的是「产品出现方式」，不是「推销力度」 */
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
    value: "low",
    label: "自然带过",
    hint: "正文 1 处轻点，像真人分享里顺带一句",
  },
  {
    value: "medium",
    label: "场景桥接",
    hint: "痛点故事里自然出现，不抢主线（推荐）",
  },
  {
    value: "high",
    label: "步骤说明",
    hint: "仍先写人感内容，文末再清晰说怎么用",
  },
];

const LEGACY_LABELS: Record<EmbedLevel, string> = {
  none: "纯内容",
  low: "自然带过",
  medium: "场景桥接",
  high: "步骤说明",
};

export function normalizeEmbedLevel(value: unknown): EmbedLevel {
  const raw = String(value || "low").trim().toLowerCase();
  if (raw === "none" || raw === "low" || raw === "medium" || raw === "high") return raw;
  return "low";
}

export function getEmbedLevelLabel(level: EmbedLevel | string | undefined): string {
  const normalized = normalizeEmbedLevel(level);
  return LEGACY_LABELS[normalized];
}

/** 注入 prompt 的操作化说明（避免 LLM 把「中/高」理解成硬广） */
export function formatEmbedLevelForPrompt(level: EmbedLevel | string | undefined): string {
  const embed = normalizeEmbedLevel(level);
  const label = getEmbedLevelLabel(embed);

  const shared = [
    "【内容优先原则】",
    "- 这篇笔记首先必须像小红书真人分享：有具体场景、情绪或判断，读者愿意看完、收藏、评论。",
    "- 产品/功能不是写作目的，只是故事自然带出的结果；禁止通篇功能清单、教程式卖点堆砌、机构通稿口吻。",
    "- 若 Brief 已勾选主推功能，只写这些功能，不要为了「植入」额外编造未提供的卖点。",
    "",
    `【当前档位：${label}（${embed}）】`,
  ].join("\n");

  const tierRules: Record<EmbedLevel, string> = {
    none: [
      "- 正文可以不出现任何产品名、功能名或操作路径。",
      "- 价值来自经历、复盘、观点、避坑或信息整理；转化靠文末一句「想了解可自行搜索」类轻提示即可（可选）。",
    ].join("\n"),
    low: [
      "- 正文最多 1 处轻点产品/能力，篇幅不超过全文的 15%，且必须嵌在真实场景句里。",
      "- 优先用 safeClaims；不要用 strongInsertPhrases；不要写「第一步点这里、第二步点那里」。",
      "- 标题和开头钩子围绕生活/情绪/困惑，不要围绕产品名。",
    ].join("\n"),
    medium: [
      "- 主线仍是故事或干货：先写清「我遇到了什么、我怎么想」，产品只在解决困惑时出现 1–2 次。",
      "- 可用 softInsertPhrases 作参考，须改写成第一人称口语，禁止照搬营销句。",
      "- productBridge 逻辑：痛点 → 场景 → 轻量动作 → 感受/结果 → 合规提醒；不得写成硬广段落。",
    ].join("\n"),
    high: [
      "- 前 70% 篇幅仍必须是真诚内容（场景、对比、踩坑、判断），产品说明放在后段，且不超过 30%。",
      "- 允许较清晰的操作路径，但不得荐基、不得承诺收益、不得催促申购。",
      "- 仅在本档位可参考 strongInsertPhrases，且必须口语化改写。",
    ].join("\n"),
  };

  return `${shared}\n${tierRules[embed]}`;
}

/** 检索层：有 Brief 勾选时以勾选为准；无勾选时按档位上限 */
export function resolveFeatureInjectionLimit(
  embedLevel: EmbedLevel | string | undefined,
  selectedFeatureIds: string[] = [],
): number {
  if (selectedFeatureIds.length > 0) {
    return selectedFeatureIds.length;
  }
  const limits: Record<EmbedLevel, number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 2,
  };
  return limits[normalizeEmbedLevel(embedLevel)];
}

export function shouldIncludeStrongInsertPhrases(embedLevel: EmbedLevel | string | undefined): boolean {
  return normalizeEmbedLevel(embedLevel) === "high";
}
