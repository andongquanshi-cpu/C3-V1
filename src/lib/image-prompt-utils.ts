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
  const hasLayout = /3:4|竖版|封面|构图|光线|色调|景深|实拍|插画|生活化/.test(text);
  return !hasLayout;
}

/** 从风格/场景描述中剥离色号，避免文生图把 #RRGGBB 渲染成便签文字 */
const HEX_COLOR_RE = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g;
const HEX_IN_PARENS_RE = /\s*[（(]\s*#[0-9A-Fa-f]{3,8}\s*[）)]/g;

export function stripHexColorCodes(text: string): string {
  return text
    .replace(HEX_IN_PARENS_RE, "")
    .replace(HEX_COLOR_RE, "")
    .replace(/[，,]\s*[，,]/g, "，")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * 清洗可能被模型画进图里的指令/平台字样。
 * 解决：小红书 Logo、「coverText:」、风格说明角标、参数原文泄露。
 */
export function stripPromptLeakage(text: string): string {
  return stripHexColorCodes(text)
    .replace(/小\s*红\s*书/g, "")
    .replace(/红书财经笔记|财经笔记封面|竖活版|竖版封面风/g, "")
    .replace(/coverText\s*[:：]\s*[“"']?[^”"'\n]{0,40}[”"']?/gi, "")
    .replace(/overallStyle\s*[:：]/gi, "")
    .replace(/imagePrompt\s*[:：]/gi, "")
    .replace(/prompt\s*[:：]/gi, "")
    .replace(/【[^】]{0,12}硬约束】/g, "")
    .replace(/【本张画面】|【整体视觉规范[^】]*】|【合规约束】/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[，,]{2,}/g, "，")
    .trim();
}

/** 清理画面上应出现的中文文案：去技术残留、指令泄露、平台名 */
export function sanitizeOnImageCopy(copy: string): string {
  let text = stripPromptLeakage(copy)
    .replace(/\b[A-Za-z]{3,}\b/g, "")
    .replace(/[:：]\s*$/g, "")
    .replace(/^[「『"']|[」』"']$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // 角标/栏目类短词不当作封面大字（易被画成 Logo 条）
  if (/^(财经干货|财务笔记|财经笔记|干货|封面|小红书|笔记)$/.test(text)) {
    return "";
  }
  // 过长或像 JSON/指令
  if (text.length > 18 || /[{}\[\]"=]/.test(text) || /coverText|prompt|style/i.test(text)) {
    return text.length > 18 ? text.slice(0, 14) : "";
  }
  return text;
}

export function buildImageTextRenderLock(onImageCopy?: string, role?: string): string {
  const label = role === "cover" ? "封面大字" : "画面内文案";
  const lines = [
    "【画面文字硬约束 · 以下条目本身禁止出现在画面上】",
    "- 风格描述、色号、英文、技术参数、字段名仅用于配色与构图，严禁渲染为可见文字/便签/标签/色卡",
    "- 禁止出现任何平台 Logo、角标、水印字（含近似「小红书」「红书」「竖活版」「财经笔记」栏目条）",
    "- 禁止把 prompt 参数原文印上画面（如 coverText:、风格：、小红书封面风）",
  ];
  const copy = sanitizeOnImageCopy(onImageCopy || "");
  if (copy) {
    lines.push(`- 本张图上只允许出现这一句${label}：${copy}`);
    lines.push("- 该句只出现一次，禁止顶部和底部重复同一标题");
    lines.push("- 除上述一句外，禁止任何其他可读文字（含英文、数字串、色号、#号）");
  } else {
    lines.push("- 本张图避免可读文字；装饰元素不得形成可辨认文字或角标");
  }
  return lines.join("\n");
}

function buildComplianceLock(): string {
  return [
    "【合规与画面禁令 · 禁止印在画面上】",
    "- 不出现真实人物清晰正脸/半脸特写；人物若出现须背影、侧影、手部或完全虚化，不得成为画面主体脸部",
    "- 禁止：股票代码、具体收益数字、承诺性文案、暴富金币、满屏红绿 K 线、二维码、水印、明星肖像",
    "- 禁止：社交平台 Logo、品牌徽章、栏目角标条、参数说明小字",
  ].join("\n");
}

/** 视觉计划 / 制图工作台：合成发给 Seedream 的最终 prompt */
export function assembleSeedreamImagePrompt(input: {
  overallStyle?: string;
  prompt: string;
  coverText?: string;
  role?: string;
}): string {
  const style = stripPromptLeakage(input.overallStyle || "");
  const scene = stripPromptLeakage(input.prompt.trim());
  const copy = sanitizeOnImageCopy(input.coverText || "");

  return [
    "竖版 3:4 生活化财经配图，清爽真实摄影感，信息流缩略图也要能看清主体",
    style ? `整体视觉规范（仅配色构图，禁止渲染为文字）：\n${style}` : "",
    scene ? `本张画面描述：\n${scene}` : "",
    buildImageTextRenderLock(copy, input.role),
    buildComplianceLock(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** 组装发给 Seedream 的最终画面描述（含版式、封面字、合规约束） */
export function formatImagePromptForSeedream(prompt: string, coverText?: string, style?: string): string {
  const base = stripPromptLeakage(prompt.trim());
  if (!base) return "";

  const copy = sanitizeOnImageCopy(coverText || "");
  const alreadyStructured =
    base.includes("3:4") && base.includes("禁止") && (base.includes("画面文字硬约束") || base.includes("合规与画面禁令"));
  if (alreadyStructured) {
    // 仍做一轮泄露清洗，避免上游已写入「小红书」
    return assembleSeedreamImagePrompt({
      prompt: stripPromptLeakage(base),
      coverText: copy,
      role: "cover",
      overallStyle: style,
    });
  }

  const styleLabel =
    style && !["default", "cover", "fallback-cover"].includes(style)
      ? stripPromptLeakage(`风格气质：${style}`)
      : "";

  const draft = [
    "竖版 3:4 生活化财经配图",
    styleLabel,
    base,
    "柔和自然光，画面整洁有秩序感；可有生活物件，避免模板化桌面四件套堆砌",
  ]
    .filter(Boolean)
    .join("。");

  return assembleSeedreamImagePrompt({ prompt: draft, coverText: copy, role: "cover" });
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
      coverText: sanitizeOnImageCopy(asString(row.coverText)) || undefined,
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
  const safeCover = sanitizeOnImageCopy(content.selectedCoverText || "") || undefined;
  const base =
    usable.length > 0
      ? usable
      : [
          {
            style: "fallback-cover",
            prompt: [
              "竖版 3:4 生活化财经配图",
              content.selectedTitle ? `主题氛围：${content.selectedTitle}` : "",
              angle.coreIdea ? `画面方向：${angle.coreIdea.slice(0, 100)}` : "",
              "风格：生活化、温暖、有秩序感，避免桌面四件套模板堆砌",
            ]
              .filter(Boolean)
              .join("。"),
            coverText: safeCover,
            riskNotes: ["由标题自动拼装"],
          },
        ];

  return base.map((item) => ({
    ...item,
    coverText: sanitizeOnImageCopy(item.coverText || safeCover || "") || undefined,
    prompt: formatImagePromptForSeedream(
      item.prompt,
      item.coverText || safeCover,
      item.style,
    ),
  }));
}
