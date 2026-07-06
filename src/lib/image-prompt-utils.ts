import type { CreativeAngle, GeneratedContent } from "@/lib/types";

export type ImagePromptItem = GeneratedContent["imagePromptSuggestions"][number];

type LooseRecord = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** 将 L1 visualGuidelines 压缩为 prompt 可读的文本块 */
export function formatVisualGuidelinesForPrompt(visualGuidelines: LooseRecord[] | undefined): string {
  if (!visualGuidelines?.length) return "未提供";
  return visualGuidelines
    .map((item) => {
      const lines = [
        item.name ? `【${item.name}】` : "",
        item.styleKeywords ? `风格关键词：${item.styleKeywords}` : "",
        item.primaryColors ? `主色调：${item.primaryColors}` : "",
        item.coreElements ? `核心元素：${item.coreElements}` : "",
        Array.isArray(item.safeExpressions) && item.safeExpressions.length
          ? `安全画面参考：${item.safeExpressions.join("；")}`
          : "",
        Array.isArray(item.forbiddenExpressions) && item.forbiddenExpressions.length
          ? `禁用表达：${item.forbiddenExpressions.join("；")}`
          : "",
        item.forbiddenVisuals ? `禁用画面：${item.forbiddenVisuals}` : "",
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");
}

/** 判断正文阶段产出的封面 prompt 是否过短/缺构图信息，需要走 cover-suggestions 补强 */
export function shouldRequestCoverSuggestions(items: ImagePromptItem[] | undefined): boolean {
  if (!items?.length) return true;
  return items.every((item) => isWeakImagePrompt(item.prompt));
}

export function isWeakImagePrompt(prompt: string): boolean {
  const text = prompt.trim();
  if (!text) return true;
  if (text.length < 90) return true;
  const hasLayout = /3:4|竖版|封面|构图|光线|色调|景深|实拍|插画|小红书/.test(text);
  return !hasLayout;
}

/** 组装发给 Seedream 的最终画面描述（含版式、封面字、合规约束） */
export function formatImagePromptForSeedream(prompt: string, coverText?: string, style?: string): string {
  const base = prompt.trim();
  if (!base) return "";

  const alreadyStructured =
    base.includes("3:4") && base.includes("禁止") && (!coverText || base.includes(coverText));
  if (alreadyStructured) return base;

  const styleLabel =
    style && !["default", "cover", "fallback-cover"].includes(style) ? `风格：${style}` : "";

  return [
    "小红书财经笔记封面，竖版 3:4",
    styleLabel,
    coverText ? `画面内醒目封面大字：「${coverText}」` : "",
    base,
    "生活化场景，柔和自然光，画面整洁有秩序感；不出现真实人物正脸特写",
    "禁止：股票代码、收益数字、承诺性文案、暴富金币、满屏红绿K线、二维码、水印",
  ]
    .filter(Boolean)
    .join("。");
}

export function buildImagePromptFromScene(input: {
  scene?: string;
  visualNotes?: string[] | string;
  coverText?: string;
  style?: string;
}): string {
  const scene = asString(input.scene);
  const notes = Array.isArray(input.visualNotes)
    ? input.visualNotes.map(String).filter(Boolean).join("；")
    : asString(input.visualNotes);
  const draft = [scene, notes].filter(Boolean).join("。");
  if (!draft) return "";
  return formatImagePromptForSeedream(draft, input.coverText, input.style);
}

function normalizeImagePromptList(items: unknown[]): ImagePromptItem[] {
  const result: ImagePromptItem[] = [];
  for (const item of items) {
    const row = item as LooseRecord;
    const prompt = asString(row.prompt) || asString(row.imagePrompt);
    if (!prompt) continue;
    result.push({
      style: asString(row.style) || asString(row.coverType) || "cover",
      prompt,
      coverText: asString(row.coverText) || undefined,
      riskNotes: Array.isArray(row.riskNotes) ? row.riskNotes.map(String) : [],
    });
  }
  return result;
}

/** 解析 cover-suggestions.md 的 JSON 输出 */
export function parseCoverSuggestionsPayload(value: unknown): ImagePromptItem[] {
  const data = value as { covers?: unknown[]; imagePromptSuggestions?: unknown[] };
  if (Array.isArray(data.imagePromptSuggestions) && data.imagePromptSuggestions.length) {
    return normalizeImagePromptList(data.imagePromptSuggestions);
  }
  if (!Array.isArray(data.covers)) return [];
  return normalizeImagePromptList(
    data.covers.map((item) => {
      const row = item as LooseRecord;
      return {
        ...row,
        prompt: row.imagePrompt || row.prompt,
        style: row.style || row.coverType,
      };
    }),
  );
}

export function mergeImagePromptSuggestions(
  fromContent: ImagePromptItem[],
  fromCovers: ImagePromptItem[],
): ImagePromptItem[] {
  const merged = [...fromCovers];
  const seen = new Set(merged.map((item) => `${item.style}:${item.prompt.slice(0, 48)}`));

  for (const item of fromContent) {
    const key = `${item.style}:${item.prompt.slice(0, 48)}`;
    if (seen.has(key)) continue;
    if (isWeakImagePrompt(item.prompt) && merged.length >= 1) continue;
    merged.push(item);
    seen.add(key);
  }

  return merged.slice(0, 3);
}

export function finalizeImagePromptSuggestions(
  content: Pick<GeneratedContent, "imagePromptSuggestions" | "selectedTitle" | "selectedCoverText" | "content">,
  angle: CreativeAngle,
  coverPayload?: unknown,
): ImagePromptItem[] {
  const fromContent = content.imagePromptSuggestions || [];
  const fromCovers = coverPayload ? parseCoverSuggestionsPayload(coverPayload) : [];
  const merged = fromCovers.length ? mergeImagePromptSuggestions(fromContent, fromCovers) : fromContent;

  const usable = merged.filter((item) => asString(item.prompt));
  const base =
    usable.length > 0
      ? usable
      : [
          {
            style: "fallback-cover",
            prompt: [
              "小红书财经笔记封面，竖版 3:4",
              content.selectedCoverText ? `封面大字：${content.selectedCoverText}` : "",
              content.selectedTitle ? `主题：${content.selectedTitle}` : "",
              angle.coreIdea ? `画面方向：${angle.coreIdea.slice(0, 100)}` : "",
              "风格：生活化、温暖、有秩序感",
            ]
              .filter(Boolean)
              .join("。"),
            coverText: content.selectedCoverText || undefined,
            riskNotes: ["由标题与封面字自动拼装"],
          },
        ];

  return base.map((item) => ({
    ...item,
    prompt: formatImagePromptForSeedream(
      item.prompt,
      item.coverText || content.selectedCoverText,
      item.style,
    ),
  }));
}
