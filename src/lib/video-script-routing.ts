import type { CreativeAngle, VideoScriptDuration } from "@/lib/types";
import { formatViralMethodologyForVideoPrompt } from "@/lib/viral-methodology";

export interface VideoScriptModules {
  titleType: string;
  titleTypeLabel: string;
  titleFormula: string;
  hookType: string;
  hookTypeLabel: string;
  hookGuidance: string;
  bodyStructure: string;
  bodyStructureLabel: string;
  bodyGuidance: string;
  ctaStyle: string;
  ctaGuidance: string;
  shotCountHint: string;
}

const TITLE_MODULES: Record<string, Omit<VideoScriptModules, "hookType" | "hookTypeLabel" | "hookGuidance" | "bodyStructure" | "bodyStructureLabel" | "bodyGuidance" | "ctaStyle" | "ctaGuidance" | "shotCountHint">> = {
  "pain-solution": {
    titleType: "pain-solution",
    titleTypeLabel: "痛点解决型",
    titleFormula: "问题/痛点 + 解决方式 + 可感知结果（例：《不会买基金？一篇教你入门》《定投一直亏？可能踩了这3个坑》）",
  },
  "identity-resonance": {
    titleType: "identity-resonance",
    titleTypeLabel: "身份共鸣型",
    titleFormula: "人群标签 + 情境/问题 + 行动建议（例：《月薪5k的女生，怎么开始理财？》《打工人摸鱼也能看盘？》）",
  },
  "number-anchor": {
    titleType: "number-anchor",
    titleTypeLabel: "数字锚定型",
    titleFormula: "数字 + 场景/方法 + 结果/目标（例：《1万元定投配置（普通人也能攒百万）》《3步配置，让钱不再躺着》）",
  },
  "emotion-hook": {
    titleType: "emotion-hook",
    titleTypeLabel: "情绪钩子型",
    titleFormula: "反转型「你以为A其实B」/ 观点型 / 情绪共鸣型（例：《你以为我在存钱，其实我在…》）",
  },
};

const HOOK_MODULES: Record<string, { label: string; guidance: string }> = {
  contrast: {
    label: "强反差/反直觉",
    guidance:
      "先建立一种预期或喜庆氛围，再迅速转折；或推翻大众共识。适合制造停留，但不要每篇都用同一句式。",
  },
  "pain-scene": {
    label: "情绪共鸣/生活场景",
    guidance: "用具体生活瞬间切入（工位、发工资、被家人问、刷到焦虑信息），让读者觉得「这说的就是我」。",
  },
  curiosity: {
    label: "好奇/信息缺口",
    guidance: "制造「我还不知道的事」或私密感，但不编造内幕、不暗示荐股。",
  },
  "macro-to-personal": {
    label: "远到近",
    guidance: "从大事件/宏观话题快速折算到个人钱包、时间、精力，强调与「我」的关系。",
  },
};

const BODY_MODULES: Record<string, { label: string; guidance: string }> = {
  analogy: {
    label: "类比讲解",
    guidance: "把硬核逻辑软化：股市像菜市场、理财像学开车等生活类比，降低认知门槛。",
  },
  taxonomy: {
    label: "分类拆解",
    guidance: "面对复杂信息用 2-4 类清单/对比讲清，不给模糊答案，适合教程与避坑。",
  },
  narrative: {
    label: "叙事贯穿",
    guidance: "用一个完整小故事或经历线带出观点，产品/工具从故事里自然长出来，而非功能罗列。",
  },
};

const CTA_MODULES: Record<string, string> = {
  "pause-screenshot": "引导暂停/截图收藏关键画面（清单、步骤、对比表），拉升互动权重。",
  "low-bar-interaction": "低门槛互动（点赞/收藏即可），不要硬导流。",
  "soft-tool-bridge": "痛点解决后轻点工具/入口，服从 embed 档位，禁止开篇就讲功能。",
};

function normalizeGoal(value?: string) {
  const text = String(value || "").trim();
  if (/转化|种草|功能认知|教程|实操/.test(text)) return "convert";
  if (/拉新|新用户|入门|认知/.test(text)) return "acquire";
  if (/点击|曝光|流量/.test(text)) return "click";
  if (/互动|评论|收藏/.test(text)) return "engage";
  return "default";
}

function pickTitleType(goal: string, axis?: string): keyof typeof TITLE_MODULES {
  if (goal === "convert") return "pain-solution";
  if (goal === "acquire") return "identity-resonance";
  if (goal === "click") return "number-anchor";
  if (goal === "engage") return "emotion-hook";
  if (axis === "生活场景" || axis === "叙事人称") return "identity-resonance";
  if (axis === "信息增量" || axis === "热点切入") return "number-anchor";
  if (axis === "情绪钩子" || axis === "风险意识") return "emotion-hook";
  if (axis === "产品距离") return "pain-solution";
  return "pain-solution";
}

function pickHookType(axis?: string, angleId?: string): keyof typeof HOOK_MODULES {
  const map: Record<string, keyof typeof HOOK_MODULES> = {
    情绪钩子: "contrast",
    生活场景: "pain-scene",
    叙事人称: "pain-scene",
    信息增量: "macro-to-personal",
    热点切入: "macro-to-personal",
    风险意识: "contrast",
    产品距离: "pain-scene",
  };
  if (axis && map[axis]) return map[axis];
  const pool: Array<keyof typeof HOOK_MODULES> = ["pain-scene", "contrast", "curiosity", "macro-to-personal"];
  const seed = String(angleId || "").length;
  return pool[seed % pool.length];
}

function pickBodyStructure(axis?: string, duration?: string): keyof typeof BODY_MODULES {
  if (duration === "15s") return "taxonomy";
  if (axis === "叙事人称" || axis === "生活场景") return "narrative";
  if (axis === "信息增量" || axis === "热点切入") return "taxonomy";
  if (axis === "情绪钩子" || axis === "风险意识") return "analogy";
  if (duration === "60s") return "narrative";
  return "taxonomy";
}

function shotCountForDuration(duration?: string): string {
  if (duration === "15s") return "2-3 个镜头，节奏快，一句一画面";
  if (duration === "30s") return "4-5 个镜头，钩子+展开+收束";
  return "5-7 个镜头，允许完整叙事弧线";
}

export function resolveVideoScriptModules(input: {
  campaignGoal?: string;
  contentLength?: string;
  selectedAngle?: CreativeAngle | Record<string, unknown>;
}): VideoScriptModules {
  const angle = (input.selectedAngle || {}) as CreativeAngle;
  const axis = String(angle.differentiationAxis || "").trim();
  const goal = normalizeGoal(input.campaignGoal);
  const duration = String(input.contentLength || "30s") as VideoScriptDuration;

  const titleKey = pickTitleType(goal, axis);
  const title = TITLE_MODULES[titleKey];
  const hookKey = pickHookType(axis, angle.angleId);
  const hook = HOOK_MODULES[hookKey];
  let bodyKey = pickBodyStructure(axis, duration);
  if (bodyKey === ("contrast" as never)) bodyKey = "analogy";
  const body = BODY_MODULES[bodyKey];
  const ctaStyle = input.campaignGoal && /转化|教程/.test(input.campaignGoal) ? "soft-tool-bridge" : "low-bar-interaction";

  return {
    ...title,
    hookType: hookKey,
    hookTypeLabel: hook.label,
    hookGuidance: hook.guidance,
    bodyStructure: bodyKey,
    bodyStructureLabel: body.label,
    bodyGuidance: body.guidance,
    ctaStyle,
    ctaGuidance: CTA_MODULES[ctaStyle],
    shotCountHint: shotCountForDuration(duration),
  };
}

export function formatVideoScriptModulesForPrompt(
  modules: VideoScriptModules,
  angle?: CreativeAngle | Record<string, unknown>,
): string {
  const fromKb = formatViralMethodologyForVideoPrompt(modules, angle);
  if (fromKb) return fromKb;
  return [
    "【本篇视频结构路由】",
    `- 标题类型：${modules.titleTypeLabel}（${modules.titleFormula}）`,
    `- 开篇：${modules.hookTypeLabel} — ${modules.hookGuidance}`,
    `- 骨架构：${modules.bodyStructureLabel} — ${modules.bodyGuidance}`,
    `- CTA：${modules.ctaGuidance}`,
    `- 分镜：${modules.shotCountHint}`,
  ].join("\n");
}
