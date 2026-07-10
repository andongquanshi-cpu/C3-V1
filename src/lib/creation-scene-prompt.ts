import type { BusinessLine, EmbedLevel } from "@/lib/types";
import { getScene, type BusinessLineWorkflowConfig, getWorkflowFallback } from "@/lib/business-line-workflow";
import { normalizeEmbedLevel } from "@/lib/embed-level";

function weisecToolReviewAngleRules(sceneLabel: string, embedLevel?: EmbedLevel | string): string {
  if (normalizeEmbedLevel(embedLevel) === "none") {
    return [
      `【创作场景 · ${sceneLabel} · 纯内容】`,
      "- 从生活场景/情绪/困惑切入，写普通人面对「看盘工具多、不知怎么选」的真实感受。",
      "- 可泛化对比「独立 App vs 微信里轻量入口」的使用习惯，**不点名**腾讯微证券/具体功能名。",
      "- 角度优先：生活场景 / 情绪钩子 / 信息增量 / 风险意识；productBridge、recommendedFeatureIds 留空。",
      "- 禁止把角度写成产品卖点标题或功能清单。",
    ].join("\n");
  }

  return [
    `【创作场景锁定 · ${sceneLabel}】`,
    "本篇是「炒股/看盘工具测评」选题，不是单功能种草帖。",
    "",
    "测评叙事框架（角度必须按此发散）：",
    "- 对比参照：可提及同花顺、东方财富、富途牛牛等独立 App 的公开可见特点（功能多/专业向/需单独安装等），与「微信里的腾讯微证券」做**使用场景对比**，不是黑竞品。",
    "- 核心卖点锚点：微证券的最大差异是**新手友好 + 微信内低门槛**——不用先装重型 App、打开路径短、界面相对克制、适合先「了解公开信息」再决定是否深入。",
    "- Brief 勾选功能（如微信提醒、问元宝）是测评里的**证据点/体验细节**，不能写成两个互不相关的功能广告；须落在「对比后为什么更适合某类人」的逻辑里。",
    "- 每个角度须回答：「和谁比、比什么维度、适合谁/不适合谁」；differentiationAxis 优先用「生活场景 / 产品距离 / 风险意识 / 信息增量」。",
    "",
    "禁止：",
    "- 只写微证券功能清单、不提任何对比语境（像产品说明书）。",
    "- 把角度写成「通勤焦虑」「热点看不懂」等泛痛点帖，却不像工具测评。",
    "- 贬低竞品、收益承诺、暗示「微证券更好所以该买某只股票」。",
  ].join("\n");
}

function weisecToolReviewContentRules(sceneLabel: string, embedLevel?: EmbedLevel | string): string {
  if (normalizeEmbedLevel(embedLevel) === "none") {
    return [
      `【正文场景锁定 · ${sceneLabel} · 纯内容】`,
      "- 主线是生活经历/情绪/判断，不是产品测评帖；禁止开篇就写品牌或功能名。",
      "- 可写「独立 App vs 微信里轻量看盘」的泛化感受，不点名腾讯微证券、不问元宝、不写具体功能。",
      "- 禁止 CTA、导流句、操作路径；合规声明信息整理不构成投资建议。",
    ].join("\n");
  }

  return [
    `【正文场景锁定 · ${sceneLabel}】`,
    "- 正文须具备测评感：至少 1 组对比（独立炒股 App vs 微信内微证券），从「安装门槛 / 上手成本 / 信息获取方式 / 是否打扰生活」等维度展开。",
    "- 须点明微证券「新手友好、微信内即用」的定位；Brief 功能作为你测评后的体验佐证，不是硬广词条。",
    "- 结尾用「适合 XX 的人 / 不适合 XX 的人」收束，合规声明信息整理不构成投资建议。",
  ].join("\n");
}

function licaitongSceneNarrativeRules(sceneId: string, sceneLabel: string, description: string): string {
  const lines = [
    `【创作场景 · ${sceneLabel}】`,
    description,
    "",
    "叙事形态（理财通）：",
  ];
  if (sceneId === "dry-goods-list") {
    lines.push("- 干货信息藏在经历/对比/判断里，禁止「四个理由」「三步上手」式结构。");
  } else if (sceneId === "newcomer-guide") {
    lines.push("- 用「我第一次…」带出路径，禁止教程式步骤清单。");
  } else {
    lines.push("- 以故事/情绪线推进，禁止切成「要点1/要点2」清单。");
  }
  return lines.join("\n");
}

export function buildCreationSceneAngleRules(
  businessLine: BusinessLine,
  creationScene: string | undefined,
  workflowConfig?: BusinessLineWorkflowConfig,
  embedLevel?: EmbedLevel | string,
): string {
  const sceneId = String(creationScene || "").trim();
  if (!sceneId) return "";

  const cfg = workflowConfig || getWorkflowFallback(businessLine);
  const scene = getScene(sceneId, cfg, businessLine);
  if (!scene) return "";

  if (businessLine === "weisec" && sceneId === "tool-review") {
    return weisecToolReviewAngleRules(scene.label, embedLevel);
  }
  if (businessLine === "licaitong") {
    return licaitongSceneNarrativeRules(sceneId, scene.label, scene.description);
  }

  return `【创作场景】${scene.label}：${scene.description}`;
}

export function buildCreationSceneContentRules(
  businessLine: BusinessLine,
  creationScene: string | undefined,
  workflowConfig?: BusinessLineWorkflowConfig,
  embedLevel?: EmbedLevel | string,
): string {
  const sceneId = String(creationScene || "").trim();
  if (!sceneId) return "";

  const cfg = workflowConfig || getWorkflowFallback(businessLine);
  const scene = getScene(sceneId, cfg, businessLine);
  if (!scene) return "";

  if (businessLine === "weisec" && sceneId === "tool-review") {
    return weisecToolReviewContentRules(scene.label, embedLevel);
  }
  if (businessLine === "licaitong") {
    return licaitongSceneNarrativeRules(sceneId, scene.label, scene.description);
  }

  return `【创作场景】${scene.label}：${scene.description}`;
}
