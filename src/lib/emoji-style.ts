import type { BusinessLine } from "@/lib/types";

type EmojiBand = {
  label: string;
  min: number;
  max: number;
  vibe: string;
};

/** 人设默认带宽；KB 的 emojiDensity 可再覆盖数字区间 */
const PERSONA_BANDS: Record<string, EmojiBand> = {
  peer_diary: {
    label: "同龄人日记",
    min: 5,
    max: 9,
    vibe: "生活感、自嘲、共鸣，句中句尾点情绪",
  },
  family_planner: {
    label: "家庭规划",
    min: 5,
    max: 8,
    vibe: "温馨、踏实，家庭感 emoji 点缀即可",
  },
  sober_guard: {
    label: "清醒守门",
    min: 6,
    max: 9,
    vibe: "态度、反差、提醒感，别做成清单标题",
  },
  concept_teacher: {
    label: "概念教学",
    min: 3,
    max: 5,
    vibe: "克制、清晰，偶发恍然/举例感，不要堆教学图标",
  },
  hotspot_observer: {
    label: "市场观察",
    min: 2,
    max: 4,
    vibe: "冷静、克制，少而准，偏信息笔记感",
  },
};

const VARIANT_OVERRIDES: Record<string, Partial<EmojiBand>> = {
  campus: { min: 6, max: 10, vibe: "宿舍聊天感，活泼一点，但仍禁止每段段首当小标题" },
  salary: { min: 5, max: 9, vibe: "打工人日常感，通勤/工位情绪点缀" },
  workplace_newcomer: { min: 3, max: 5, vibe: "偏文学随笔，淡一点但仍要有小红书呼吸感" },
};

function parseDensityRange(text: string | undefined): { min?: number; max?: number } {
  if (!text) return {};
  const range = text.match(/(\d+)\s*[-~～到至]\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const single = text.match(/(\d+)\s*个/);
  if (single) {
    const n = Number(single[1]);
    return { min: Math.max(1, n - 1), max: n + 1 };
  }
  return {};
}

function sceneAdjust(creationScene: string): { delta: number; note: string } {
  const scene = creationScene.trim();
  if (!scene) return { delta: 0, note: "" };

  if (/hotspot|market|观察|热点/.test(scene)) {
    return { delta: -1, note: "热点/观察场景略克制，偏冷静。" };
  }
  if (/tool-review|工具|测评/.test(scene)) {
    return { delta: 0, note: "工具测评：体验感受处可多一点，说明处少一点。" };
  }
  if (/life|lifestyle|pain|story|diary|生活|故事|复盘|日记/.test(scene)) {
    return { delta: 1, note: "生活/故事/复盘场景可更有情绪表情。" };
  }
  if (/newcomer|guide|新手|入门|beginner/.test(scene)) {
    return { delta: 1, note: "新手场景可略活泼，降低距离感。" };
  }
  if (/dry-goods|干货/.test(scene)) {
    return { delta: 0, note: "干货场景：情绪点缀即可，勿用 emoji 当目录。" };
  }
  return { delta: 0, note: "" };
}

/** 按人设 + 变体 + 场景生成 emoji 指引（覆盖一刀切数量） */
export function formatEmojiStyleGuide(options: {
  personaId?: string;
  personaVariant?: string;
  businessLine?: BusinessLine | string;
  creationScene?: string;
  generationMode?: string;
  /** 来自人设/变体 KB 的 emojiDensity 原文 */
  densityHint?: string;
  signatureEmoji?: string;
}): string {
  if (String(options.generationMode || "").trim() === "video-script") {
    return [
      "【Emoji · 视频口播】",
      "- 口播以说话为主，不必堆 emoji；若写 content 分镜稿可偶发 1-2 个语气词级表情。",
    ].join("\n");
  }

  const personaId = String(options.personaId || "").trim();
  const variantId = String(options.personaVariant || "").trim();
  const densityHint = String(options.densityHint || "").trim();
  const signatureEmoji = String(options.signatureEmoji || "").trim();
  const fromKb = parseDensityRange(densityHint);

  const base = PERSONA_BANDS[personaId] || {
    label: personaId || "通用",
    min: 4,
    max: 7,
    vibe: "自然口语情绪点缀，有小红书感",
  };
  const variantPatch = VARIANT_OVERRIDES[variantId] || {};
  // 人设带宽优先；KB 文案若仍是旧的「2-5」过低区间则忽略，避免压死小红书感
  let min = variantPatch.min ?? base.min;
  let max = variantPatch.max ?? base.max;
  if (fromKb.min != null && fromKb.max != null && fromKb.max >= 5) {
    min = fromKb.min;
    max = fromKb.max;
  }
  max = Math.max(min, max);

  const { delta, note } = sceneAdjust(String(options.creationScene || ""));
  min = Math.max(2, min + delta);
  max = Math.max(min + 1, max + delta);

  return [
    "【Emoji · 按人设/场景区分（须执行）】",
    `- 人设：${base.label}${signatureEmoji ? ` ${signatureEmoji}` : ""}`,
    densityHint ? `- 人设库密度参考：${densityHint}` : "",
    `- 本篇目标数量：约 ${min}-${max} 个（不要明显偏少；也别刷屏）`,
    `- 气质：${variantPatch.vibe || base.vibe}`,
    note ? `- 场景调节：${note}` : "",
    "- 位置：以句中/句尾为主；全文最多 1-2 段可用段首 emoji 起势，禁止每段段首。",
    "- **禁止** 💼📝✅💡🎓📱 等当分段小标题或方法序号；emoji 是语气，不是目录。",
    "- 禁止整篇几乎不用 emoji（观察员/教学可偏少，但仍要达到上述区间下限）。",
  ]
    .filter(Boolean)
    .join("\n");
}
