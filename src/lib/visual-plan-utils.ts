import type { GeneratedContent, VisualPlan, VisualPlanItem } from "@/lib/types";
import { sanitizeOnImageCopy, stripHexColorCodes } from "@/lib/image-prompt-utils";

type LooseRecord = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

/** 依据正文粗略估算内容图数量（不含封面） */
export function estimateContentImageCount(content: string): number {
  const length = (content || "").replace(/\s/g, "").length;
  if (length < 300) return 3;
  if (length < 700) return 4;
  return 5;
}

const CONTENT_ROLE_PRESETS = [
  { role: "hook-context", title: "问题引入" },
  { role: "key-insight-1", title: "核心要点 1" },
  { role: "key-insight-2", title: "核心要点 2" },
  { role: "key-insight-3", title: "核心要点 3" },
  { role: "action-cta", title: "行动建议" },
];

function normalizeItem(row: LooseRecord, fallbackIndex: number): VisualPlanItem {
  const imageIndex = Number.isFinite(Number(row.imageIndex))
    ? Number(row.imageIndex)
    : fallbackIndex;
  const rawRole = asString(row.role);
  const role = rawRole || (imageIndex === 0 ? "cover" : `content-${imageIndex}`);
  const title =
    asString(row.title) ||
    (imageIndex === 0
      ? "封面"
      : CONTENT_ROLE_PRESETS[imageIndex - 1]?.title || `内容图 ${imageIndex}`);
  return {
    id: uid("visual"),
    imageIndex,
    role,
    title,
    copy: sanitizeOnImageCopy(asString(row.copy) || asString(row.coverText)),
    prompt: stripHexColorCodes(asString(row.prompt) || asString(row.imagePrompt)),
    hookAngle: asString(row.hookAngle) || undefined,
    connection: asString(row.connection) || undefined,
  };
}

/** 从 LLM 返回的 JSON 生成规范化的 VisualPlan */
export function parseVisualPlanPayload(value: unknown): VisualPlan | null {
  if (!value || typeof value !== "object") return null;
  const data = value as LooseRecord;
  const overallStyle = stripHexColorCodes(asString(data.overallStyle));
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  if (!overallStyle || itemsRaw.length === 0) return null;

  const items = itemsRaw
    .map((item, index) => normalizeItem((item as LooseRecord) || {}, index))
    .filter((item) => item.prompt || item.copy);

  if (!items.length) return null;

  // 保证封面永远在最前
  items.sort((a, b) => a.imageIndex - b.imageIndex);
  // 归一 imageIndex
  items.forEach((item, index) => {
    item.imageIndex = index;
    if (index === 0) {
      item.role = item.role === "cover" ? "cover" : item.role || "cover";
      item.title = item.title || "封面";
    }
  });

  return {
    version: asString(data.promptVersion) || "3.4.0",
    totalImages: items.length,
    overallStyle,
    createdAt: new Date().toISOString(),
    items,
  };
}

/** 当 LLM 输出解析失败时，本地拼一个兜底计划，让用户至少可以进入编辑 */
export function buildFallbackVisualPlan(
  content: Pick<GeneratedContent, "selectedTitle" | "selectedCoverText" | "content">,
): VisualPlan {
  const count = estimateContentImageCount(content.content);
  const totalImages = count + 1;
  const overallStyle = [
    "整体视觉风格：柔和暖色调生活化摄影，画面有秩序感、清爽干净。",
    "主色调：暖白、燕麦米与低饱和木色为主，点缀墨绿。",
    "构图：全部竖版 3:4；文字区居中或顶部，四周保留 12% 留白；主体物件呈三分法。",
    "统一元素：木质桌面、简洁小卡片、绿植点缀、暖色台灯光；每张不同视角，色调完全一致。",
    "禁止：真实人物正脸、股票代码、具体收益数字、承诺性文案、暴富金币、K 线、二维码。",
  ].join("\n");

  const items: VisualPlanItem[] = [
    {
      id: uid("visual"),
      imageIndex: 0,
      role: "cover",
      title: "封面",
      copy: content.selectedCoverText?.slice(0, 14) || content.selectedTitle.slice(0, 12),
      prompt:
        "俯拍木质书桌，桌面居中一张打开的笔记本、旁边一杯温热咖啡与一小盆绿植，暖色台灯从右上打光；上方大面积留白用于封面大字。",
      hookAngle: "用生活化的桌面场景承载封面主张，避免金融符号，突出可信、可复用。",
    },
  ];

  for (let i = 1; i <= count; i += 1) {
    const preset = CONTENT_ROLE_PRESETS[i - 1] || {
      role: `content-${i}`,
      title: `内容图 ${i}`,
    };
    items.push({
      id: uid("visual"),
      imageIndex: i,
      role: preset.role,
      title: preset.title,
      copy: "",
      prompt:
        i === 1
          ? "同一木质桌面，斜俯拍视角，笔记本上写着简短提纲；左侧一杯咖啡，右侧一支笔，画面上方留白用于文案。"
          : i === count
            ? "同一场景，画面聚焦一张写着「下一步」的便签，笔尖轻点其上；柔和暖光；上方留白放行动建议文案。"
            : `同一场景不同视角，桌面上摆放 ${i} 张小卡片依次排列，代表核心要点；柔和暖光；上方留白放要点标题。`,
      connection:
        i === 1 ? "承接封面场景，抛出问题背景。" : `承接上一张，递进呈现第 ${i - 1} 个要点。`,
    });
  }

  return {
    version: "3.4.0-fallback",
    totalImages,
    overallStyle,
    createdAt: new Date().toISOString(),
    items,
  };
}
