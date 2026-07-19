import type {
  BriefInput,
  BusinessLine,
  ContentLength,
  ContentType,
  GenerationMode,
  TextContentLength,
  VideoScriptDuration,
} from "@/lib/types";
import { getEmbedLevelLabel } from "@/lib/embed-level";
import { getBusinessLinePreset } from "@/lib/business-line";
import {
  resolvePeerDiaryVariantForAudience,
  resolveWeisecPrimaryPersonaId,
} from "@/lib/weisec-persona-ui";

export interface OfferOption {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  badge?: string;
  /** false = 仅可点选入口，无主推功能知识库 */
  hasFeatureLibrary?: boolean;
}

export interface CreationSceneOption {
  id: string;
  label: string;
  description: string;
  contentType: ContentType;
  requiresHotspotMaterials?: boolean;
}

export interface PersonaOption {
  id: string;
  label: string;
  description: string;
  variant?: string;
  audienceTags: string[];
  audienceLabel: string;
  suitableScenes: string[];
  requiresHotspotMaterials?: boolean;
  uiBadge?: string;
}

export interface AudienceOption {
  id: string;
  label: string;
  hint: string;
  targetUserLabel: string;
}

export type FeatureSource = "offer-pack" | "product-features";

export interface BusinessLineWorkflowConfig {
  businessLine: BusinessLine;
  offers: OfferOption[];
  creationScenes: CreationSceneOption[];
  audiences: AudienceOption[];
  personas: PersonaOption[];
  defaultFeaturesByScene: Record<string, string[]>;
  featureUiSummaries: Record<string, string>;
  primaryOfferId: string;
  featureSource: FeatureSource;
  /** 无独立产品时 Step1 只展示主推功能（如微证券） */
  hideOfferSelection?: boolean;
  defaultBrief: {
    offerId: string;
    creationScene: string;
    audienceTag: string;
    topic: string;
    campaignGoal: string;
  };
}

export const FALLBACK_LICAITONG_WORKFLOW: BusinessLineWorkflowConfig = {
  businessLine: "licaitong",
  offers: [
    {
      id: "fixed-income-plus",
      label: "固收+",
      description: "本期主推。严选专区、体验金、长期专区、灵活申赎、AI 辅助等卖点。",
      enabled: true,
      badge: "本期主推",
    },
  ],
  creationScenes: [
    {
      id: "newcomer-guide",
      label: "新人操作指引",
      description: "第一步点哪里、先看什么、怎么不踩坑。",
      contentType: "finance-tips",
    },
    {
      id: "review-diary",
      label: "真实复盘日记",
      description: "第一人称记录实际操作与感受，强调人感。",
      contentType: "personal-exp",
    },
    {
      id: "pain-story",
      label: "痛点共鸣故事",
      description: "选择困难、怕锁死、不敢试等痛点切入。",
      contentType: "personal-exp",
    },
    {
      id: "dry-goods-list",
      label: "干货组合推荐",
      description: "高密度信息，但用叙事/对比/踩坑讲，不写步骤清单或 N 点框架。",
      contentType: "finance-tips",
    },
  ],
  audiences: [
    { id: "student", label: "学生", hint: "零花钱、入门、校园语境", targetUserLabel: "学生" },
    { id: "mama", label: "宝妈", hint: "家庭备用金、育儿场景", targetUserLabel: "宝妈" },
    { id: "white-collar", label: "白领", hint: "工资理财、职场节奏", targetUserLabel: "白领" },
  ],
  personas: [
    {
      id: "concept_teacher",
      label: "理财教学博主",
      description: "概念讲清楚，先风险后收益，教程感适中。",
      audienceTags: ["white-collar", "student"],
      audienceLabel: "常写给白领 / 新手",
      suitableScenes: ["newcomer-guide", "pain-story", "dry-goods-list"],
    },
    {
      id: "family_planner",
      label: "家庭 CFO",
      description: "家庭账本、备用金、长期安排视角。",
      audienceTags: ["mama", "white-collar"],
      audienceLabel: "常写给宝妈 / 家庭",
      suitableScenes: ["review-diary", "pain-story", "dry-goods-list"],
    },
    {
      id: "peer_diary",
      label: "校园探索达人",
      description: "学生/年轻人第一人称日记，生活化、低教程感。",
      variant: "campus",
      audienceTags: ["student"],
      audienceLabel: "常写给学生",
      suitableScenes: ["review-diary", "pain-story"],
    },
    {
      id: "hotspot_observer",
      label: "市场观察员",
      description: "有热点素材时，公开信息整理与降维解读。",
      audienceTags: ["white-collar"],
      audienceLabel: "常写给白领（需热点素材）",
      suitableScenes: ["dry-goods-list"],
      requiresHotspotMaterials: true,
    },
  ],
  defaultFeaturesByScene: {
    "newcomer-guide": ["fplus_virtual_trial", "fplus_curated_zone"],
    "review-diary": ["fplus_virtual_trial"],
    "pain-story": ["fplus_curated_zone", "fplus_flexible_redeem"],
    "dry-goods-list": ["fplus_long_term_zone", "fplus_ai_assist"],
  },
  featureUiSummaries: {
    fplus_curated_zone: "固收+下的严选专区，缩小比较范围；从属于固收+，不是归拢固收+的上级专区。",
    fplus_virtual_trial: "虚拟理财金体验，熟悉流程；规则以活动页为准。",
    fplus_long_term_zone: "长期理财专区，看公开运作信息，不代表未来表现。",
    fplus_flexible_redeem: "部分产品申赎更灵活，买前先看清持有期限。",
    fplus_ai_assist: "AI 帮整理公开产品信息，不构成投资建议。",
  },
  primaryOfferId: "fixed-income-plus",
  featureSource: "offer-pack",
  defaultBrief: {
    offerId: "fixed-income-plus",
    creationScene: "pain-story",
    audienceTag: "white-collar",
    topic: "选固收+产品太纠结？我先在理财通里把比较范围缩小",
    campaignGoal: "内容营销：固收+认知与申购引导",
  },
};

export const FALLBACK_WEISEC_WORKFLOW: BusinessLineWorkflowConfig = {
  businessLine: "weisec",
  offers: [],
  hideOfferSelection: true,
  creationScenes: [
    {
      id: "newcomer-guide",
      label: "新手入门指南",
      description: "术语降维、功能怎么读、第一步怎么用。偏教学步骤，不是日记也不是测评。",
      contentType: "stock-tutorial",
    },
    {
      id: "tool-review",
      label: "炒股工具测评",
      description:
        "独立 App（如同花顺、东方财富、富途等）与微信内微证券的客观对比：安装门槛、上手成本、信息获取方式。突出新手友好、低门槛；Brief 功能作体验佐证，不是功能清单硬广。",
      contentType: "finance-tips",
    },
    {
      id: "life-story-seed",
      label: "生活化讲故事",
      description: "第一人称场景种草：通勤、午休、家庭复盘等真实生活里的轻量使用。",
      contentType: "personal-exp",
    },
    {
      id: "market-hotspot",
      label: "市场热点解读",
      description: "基于素材做事件梳理与公开信息降维，需配合热点/资讯素材。",
      contentType: "hotspot-analysis",
      requiresHotspotMaterials: true,
    },
  ],
  audiences: [
    {
      id: "student",
      label: "学生",
      hint: "校园语境、低门槛、引导了解开户",
      targetUserLabel: "学生",
    },
    {
      id: "white-collar",
      label: "白领",
      hint: "通勤午休、效率工具、碎片时间开户",
      targetUserLabel: "白领",
    },
  ],
  personas: [
    {
      id: "peer_diary",
      label: "同龄人日记",
      description: "第一人称真实记录：轻量体验与开户前观察，口吻由目标读者约束。",
      variant: "salary",
      audienceTags: ["student", "white-collar"],
      audienceLabel: "常写给学生 / 白领",
      suitableScenes: ["life-story-seed", "tool-review"],
    },
    {
      id: "concept_teacher",
      label: "看盘入门博主",
      description: "术语降维、界面怎么读、开户前先搞懂公开信息与流程。",
      audienceTags: ["student", "white-collar"],
      audienceLabel: "常写给学生 / 白领",
      suitableScenes: ["newcomer-guide"],
    },
    {
      id: "hotspot_observer",
      label: "市场观察员",
      description: "基于热点素材做时间线梳理与公开信息降维（需选素材）。",
      audienceTags: ["white-collar"],
      audienceLabel: "常写给白领（需热点素材）",
      suitableScenes: ["market-hotspot"],
      requiresHotspotMaterials: true,
    },
    {
      id: "sober_guard",
      label: "清醒测评博主",
      description: "客观测评炒股工具：适合谁/不适合谁、券商通道与信息边界。",
      audienceTags: ["white-collar"],
      audienceLabel: "常写给白领（工具测评）",
      suitableScenes: ["tool-review"],
    },
  ],
  defaultFeaturesByScene: {
    "newcomer-guide": ["wzq_yuanbao_ai", "wzq_wechat_trading"],
    "tool-review": ["wzq_wechat_trading", "wzq_wechat_alerts"],
    "life-story-seed": ["wzq_wechat_trading", "wzq_news_digest"],
    "market-hotspot": ["wzq_hot_rankings", "wzq_yuanbao_ai"],
  },
  featureUiSummaries: {
    wzq_wechat_alerts: "目标价/公告提醒直达微信，信息辅助，非买卖信号。",
    wzq_yuanbao_ai: "大白话解答术语与行情，整理公开信息，不构成投资建议。",
    wzq_hot_rankings: "热搜榜+TOP榜看热点方向，公开信息入口，不构成荐股。",
    wzq_news_digest: "早午晚报推送财经资讯与公告摘要，辅助了解市场变化。",
    wzq_wechat_trading: "微信极简入口+头部券商合作通道，资金第三方存管。",
  },
  primaryOfferId: "wzq-platform",
  featureSource: "product-features",
  defaultBrief: {
    offerId: "wzq-platform",
    creationScene: "life-story-seed",
    audienceTag: "student",
    topic: "大学生第一次在微信里了解微证券，开户前我会先看什么",
    campaignGoal: "内容营销：面向学生/白领提升微证券认知，引导微信搜索体验并了解开户",
  },
};

export const FALLBACK_WORKFLOWS: Record<BusinessLine, BusinessLineWorkflowConfig> = {
  licaitong: FALLBACK_LICAITONG_WORKFLOW,
  weisec: FALLBACK_WEISEC_WORKFLOW,
};

export function getWorkflowFallback(businessLine: BusinessLine): BusinessLineWorkflowConfig {
  return FALLBACK_WORKFLOWS[businessLine] || FALLBACK_LICAITONG_WORKFLOW;
}

export function resolveWorkflowForLine(
  knowledge: { licaitongWorkflow?: BusinessLineWorkflowConfig; weisecWorkflow?: BusinessLineWorkflowConfig } | null,
  businessLine: BusinessLine,
): BusinessLineWorkflowConfig {
  if (!knowledge) return getWorkflowFallback(businessLine);
  if (businessLine === "weisec") {
    return knowledge.weisecWorkflow ?? FALLBACK_WEISEC_WORKFLOW;
  }
  return knowledge.licaitongWorkflow ?? FALLBACK_LICAITONG_WORKFLOW;
}

export function getBriefStorageKey(businessLine: BusinessLine): string {
  return `c3-v1-brief-${businessLine}`;
}

export function getAnglesStatusMessage(businessLine: BusinessLine): string {
  return businessLine === "weisec"
    ? "正在检索微证券知识库并生成创意角度..."
    : "正在检索固收+ 知识库并生成创意角度...";
}

export type PersonaRecommendation = "both" | "scene" | "audience" | null;

function resolveConfig(config: BusinessLineWorkflowConfig | undefined, businessLine: BusinessLine) {
  return config || getWorkflowFallback(businessLine);
}

export function isFeatureSelectionActive(
  brief: Pick<BriefInput, "offerId" | "businessLine">,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
): boolean {
  const cfg = resolveConfig(config, businessLine);
  if (cfg.hideOfferSelection) return true;
  if (!brief.offerId) return false;
  const offer = cfg.offers.find((item) => item.id === brief.offerId);
  if (offer && offer.hasFeatureLibrary === false) return false;
  return true;
}

export function getPersonaRecommendation(
  personaId: string,
  scene: string | undefined,
  audience: string | undefined,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
): PersonaRecommendation {
  if (!scene || !audience) return null;
  const cfg = resolveConfig(config, businessLine);
  const persona = cfg.personas.find((item) => item.id === personaId);
  if (!persona) return null;
  const sceneMatch = persona.suitableScenes.length === 0 || persona.suitableScenes.includes(scene);
  const audienceMatch = persona.audienceTags.includes(audience);
  if (sceneMatch && audienceMatch) return "both";
  if (sceneMatch) return "scene";
  if (audienceMatch) return "audience";
  return null;
}

export function getPersonaRecommendationLabel(recommendation: PersonaRecommendation): string | null {
  if (recommendation === "both") return "推荐";
  if (recommendation === "scene") return "常配场景";
  if (recommendation === "audience") return "常配读者";
  return null;
}

function scorePersonaForUI(persona: PersonaOption, scene: string, audience: string): number {
  const sceneScore =
    persona.suitableScenes.length === 0 ? 1 : persona.suitableScenes.includes(scene) ? 2 : 0;
  return sceneScore + (persona.audienceTags.includes(audience) ? 1 : 0);
}

export function getPersonasForUI(
  scene?: string,
  audience?: string,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
): PersonaOption[] {
  const cfg = resolveConfig(config, businessLine);
  if (!scene || !audience) return [...cfg.personas];
  return [...cfg.personas].sort(
    (a, b) => scorePersonaForUI(b, scene, audience) - scorePersonaForUI(a, scene, audience),
  );
}

export function getOffer(id: string | undefined, config?: BusinessLineWorkflowConfig, businessLine: BusinessLine = "licaitong") {
  const cfg = resolveConfig(config, businessLine);
  return cfg.offers.find((item) => item.id === id) || cfg.offers[0];
}

const WEISEC_LEGACY_SCENE_IDS: Record<string, string> = {
  "brand-seed-scene": "life-story-seed",
  "stock-tutorial-scene": "newcomer-guide",
  "hotspot-breakdown": "market-hotspot",
  "workplace-diary": "life-story-seed",
};

export function normalizeCreationScene(
  scene: string | undefined,
  businessLine: BusinessLine,
): string | undefined {
  if (!scene || businessLine !== "weisec") return scene;
  return WEISEC_LEGACY_SCENE_IDS[scene] || scene;
}

export function getScene(id: string | undefined, config?: BusinessLineWorkflowConfig, businessLine: BusinessLine = "licaitong") {
  const cfg = resolveConfig(config, businessLine);
  const normalizedId = normalizeCreationScene(id, businessLine);
  return cfg.creationScenes.find((item) => item.id === normalizedId) || cfg.creationScenes[0];
}

export function creationSceneToContentType(
  scene?: string,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
): ContentType {
  return getScene(scene, config, businessLine).contentType;
}

export function getDefaultFeatureIdsForScene(
  scene: string,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
): string[] {
  const cfg = resolveConfig(config, businessLine);
  return [...(cfg.defaultFeaturesByScene[scene] || [])];
}

export function getPersonasForScene(
  scene: string,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
): PersonaOption[] {
  const cfg = resolveConfig(config, businessLine);
  return cfg.personas.filter(
    (item) => item.suitableScenes.length === 0 || item.suitableScenes.includes(scene),
  );
}

export function getDefaultPersonaForScene(
  scene: string,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
  audienceTag?: string,
): PersonaOption {
  const cfg = resolveConfig(config, businessLine);
  const audience = normalizeAudienceTag(audienceTag, businessLine) || audienceTag || cfg.defaultBrief.audienceTag;

  if (businessLine === "weisec") {
    const primaryId = resolveWeisecPrimaryPersonaId(scene);
    const persona = cfg.personas.find((item) => item.id === primaryId);
    if (persona) {
      if (persona.id === "peer_diary") {
        return {
          ...persona,
          variant: resolvePeerDiaryVariantForAudience(audience, businessLine),
        };
      }
      return persona;
    }
  }

  const ranked = getPersonasForUI(scene, audience, cfg, businessLine).filter(
    (item) => item.suitableScenes.length === 0 || item.suitableScenes.includes(scene),
  );
  if (ranked[0]) return ranked[0];
  const list = getPersonasForScene(scene, cfg, businessLine);
  return list[0] || cfg.personas[0];
}

function resolvePersonaVariant(
  personaId: string,
  brief: BriefInput,
  persona: PersonaOption,
  explicitVariant?: string,
): string | undefined {
  if (explicitVariant) return explicitVariant;
  if (personaId === "peer_diary" && brief.businessLine === "weisec") {
    return resolvePeerDiaryVariantForAudience(brief.audienceTag, brief.businessLine);
  }
  return persona.variant;
}

function personaFitsScene(persona: PersonaOption | undefined, scene: string): boolean {
  return Boolean(persona && (persona.suitableScenes.length === 0 || persona.suitableScenes.includes(scene)));
}

const WEISEC_LEGACY_AUDIENCE_IDS: Record<string, string> = {
  ws_audience_001: "student",
  ws_audience_002: "white-collar",
  ws_audience_003: "white-collar",
};

export function normalizeAudienceTag(
  tag: string | undefined,
  businessLine: BusinessLine,
): string | undefined {
  if (!tag || businessLine !== "weisec") return tag;
  return WEISEC_LEGACY_AUDIENCE_IDS[tag] || tag;
}

export function audienceTagToTargetUser(
  tag: string,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
): string {
  const cfg = resolveConfig(config, businessLine);
  const normalizedTag = normalizeAudienceTag(tag, businessLine) || tag;
  const hit = cfg.audiences.find((item) => item.id === normalizedTag);
  return hit?.targetUserLabel || hit?.label || tag;
}

export function inferAudienceFromPersona(
  personaId: string | undefined,
  config?: BusinessLineWorkflowConfig,
  businessLine: BusinessLine = "licaitong",
): string {
  const cfg = resolveConfig(config, businessLine);
  const persona = cfg.personas.find((item) => item.id === personaId);
  return persona?.audienceTags[0] || cfg.defaultBrief.audienceTag;
}

export function buildWorkflowDefaults(
  businessLine: BusinessLine,
  config?: BusinessLineWorkflowConfig,
): Pick<
  BriefInput,
  | "offerId"
  | "creationScene"
  | "audienceTag"
  | "contentType"
  | "targetUser"
  | "personaId"
  | "personaVariant"
  | "selectedFeatureIds"
  | "selectedFeatureNames"
  | "topic"
  | "campaignGoal"
> {
  const cfg = resolveConfig(config, businessLine);
  const preset = getBusinessLinePreset(businessLine);
  return {
    offerId: undefined,
    creationScene: undefined,
    audienceTag: undefined,
    contentType: preset.defaultContentType,
    targetUser: "",
    personaId: undefined,
    personaVariant: undefined,
    selectedFeatureIds: [],
    selectedFeatureNames: [],
    topic: "",
    campaignGoal: cfg.defaultBrief.campaignGoal || preset.campaignGoal,
  };
}

export function applySceneChange(
  brief: BriefInput,
  scene: string,
  _featureNameById: Record<string, string>,
  config?: BusinessLineWorkflowConfig,
): BriefInput {
  const businessLine = brief.businessLine;
  const cfg = resolveConfig(config, businessLine);
  return {
    ...brief,
    creationScene: scene,
    contentType: creationSceneToContentType(scene, cfg, businessLine),
  };
}

export function applyOfferChange(
  brief: BriefInput,
  offerId: string,
  _featureNameById: Record<string, string>,
  _config?: BusinessLineWorkflowConfig,
): BriefInput {
  if (brief.offerId === offerId) return brief;
  return {
    ...brief,
    offerId,
    selectedFeatureIds: [],
    selectedFeatureNames: [],
  };
}

export function applyAudienceChange(
  brief: BriefInput,
  audienceTag: string,
  config?: BusinessLineWorkflowConfig,
): BriefInput {
  const normalizedTag = normalizeAudienceTag(audienceTag, brief.businessLine) || audienceTag;
  const next: BriefInput = {
    ...brief,
    audienceTag: normalizedTag,
    targetUser: audienceTagToTargetUser(normalizedTag, config, brief.businessLine),
  };
  if (brief.personaId === "peer_diary" && brief.businessLine === "weisec") {
    return {
      ...next,
      personaVariant: resolvePeerDiaryVariantForAudience(normalizedTag, brief.businessLine),
    };
  }
  return next;
}

export function applyPersonaChange(
  brief: BriefInput,
  personaId: string,
  config?: BusinessLineWorkflowConfig,
  personaVariant?: string,
): BriefInput {
  const businessLine = brief.businessLine;
  const cfg = resolveConfig(config, businessLine);
  const persona = cfg.personas.find((item) => item.id === personaId);
  if (!persona) return brief;
  const sceneContentType = brief.creationScene
    ? creationSceneToContentType(brief.creationScene, cfg, businessLine)
    : brief.contentType;
  const variant = resolvePersonaVariant(personaId, brief, persona, personaVariant);
  return {
    ...brief,
    personaId: persona.id,
    personaVariant: variant,
    contentType:
      persona.id === "hotspot_observer" || persona.requiresHotspotMaterials
        ? "hotspot-analysis"
        : sceneContentType,
  };
}

export function toggleFeature(
  brief: BriefInput,
  featureId: string,
  featureName: string,
  checked: boolean,
  _config?: BusinessLineWorkflowConfig,
): BriefInput {
  const ids = new Set(brief.selectedFeatureIds);
  const names = new Set(brief.selectedFeatureNames);
  if (checked) {
    ids.add(featureId);
    names.add(featureName);
  } else {
    ids.delete(featureId);
    names.delete(featureName);
  }
  return {
    ...brief,
    selectedFeatureIds: [...ids],
    selectedFeatureNames: [...names],
  };
}

function getAudienceTopicLabel(businessLine: BusinessLine, audienceTag?: string) {
  if (businessLine === "weisec") {
    if (audienceTag === "student") return "大学生";
    if (audienceTag === "white-collar") return "上班族";
    return "普通新手";
  }
  if (audienceTag === "student") return "学生党";
  if (audienceTag === "mama") return "宝妈";
  if (audienceTag === "white-collar") return "职场人";
  return "普通人";
}

function getFeatureTopicLabel(brief: Pick<BriefInput, "selectedFeatureNames">, fallback: string) {
  const names = brief.selectedFeatureNames.filter(Boolean).slice(0, 2);
  if (names.length === 0) return fallback;
  return names.join("和");
}

function softenTopicByPersona(topic: string, personaId?: string) {
  if (personaId === "peer_diary") return topic.replace("怎么", "我会怎么");
  if (personaId === "sober_guard") return topic.replace("怎么", "先想清楚什么再");
  if (personaId === "family_planner" && !topic.includes("家庭")) return `家庭备用金视角：${topic}`;
  return topic;
}

export function buildSuggestedTopic(brief: BriefInput, config?: BusinessLineWorkflowConfig): string {
  const businessLine = brief.businessLine;
  const cfg = resolveConfig(config, businessLine);
  if (!brief.creationScene || !brief.audienceTag || !brief.personaId) return "";
  if (!cfg.hideOfferSelection && !brief.offerId) return "";

  const audience = getAudienceTopicLabel(businessLine, brief.audienceTag);
  const offer = getOffer(brief.offerId, cfg, businessLine);
  const offerLabel = offer?.label || (businessLine === "weisec" ? "微证券" : "理财通");
  const featureLabel = getFeatureTopicLabel(
    brief,
    businessLine === "weisec" ? "微信里的行情工具" : `${offerLabel}产品`,
  );

  let topic = "";
  if (businessLine === "weisec") {
    const templates: Record<string, string> = {
      "newcomer-guide": `${audience}第一次看行情工具，可以先了解哪些基础信息`,
      "tool-review": `${audience}对比同花顺/富途等独立 App 与微信微证券：哪个更适合新手先了解行情`,
      "life-story-seed": `${audience}在通勤/午休这种碎片时间，会怎么轻量看行情`,
      "market-hotspot": `热点刷屏时，${audience}可以先从哪些公开信息看起`,
    };
    topic = templates[brief.creationScene] || `${audience}怎么理解${offerLabel}里的信息工具`;
  } else {
    const templates: Record<string, string> = {
      "newcomer-guide": `${audience}第一次看${offerLabel}，可以先确认哪些基础信息`,
      "review-diary": `${audience}复盘一次理财选择，会重新看哪些信息`,
      "pain-story": `${audience}选理财产品纠结时，可以先比较哪些维度`,
      "dry-goods-list": `${audience}聊一次选${offerLabel}的真实纠结，用经历讲清取舍逻辑`,
    };
    topic = templates[brief.creationScene] || `${audience}怎么理解${offerLabel}里的理财信息`;
  }

  return softenTopicByPersona(topic, brief.personaId);
}

export function filterOfferFeatures<T extends { id: string; businessLine?: string; offerId?: string }>(
  features: T[],
  businessLine: BusinessLine,
  offerId: string | undefined,
  config?: BusinessLineWorkflowConfig,
): T[] {
  const cfg = resolveConfig(config, businessLine);
  if (cfg.featureSource === "offer-pack") {
    if (!offerId) return [];
    return features.filter((feature) => feature.offerId === offerId);
  }

  const lineMatched = features.filter(
    (feature) => feature.businessLine === businessLine || feature.businessLine === "all",
  );

  if (cfg.hideOfferSelection) {
    const allowed = new Set(Object.keys(cfg.featureUiSummaries || {}));
    if (allowed.size > 0) {
      return lineMatched.filter((feature) => allowed.has(feature.id));
    }
  }

  if (!offerId) {
    return lineMatched.filter((feature) => feature.businessLine === businessLine);
  }

  return lineMatched.filter(
    (feature) => feature.businessLine === businessLine || feature.offerId === offerId,
  );
}

export const TEXT_LENGTH_OPTIONS: Array<{ value: TextContentLength; label: string }> = [
  { value: "under-200", label: "200字内" },
  { value: "200-500", label: "200-500字" },
  { value: "500-1000", label: "500-1000字" },
  { value: "long-form", label: "长文" },
];

export const VIDEO_DURATION_OPTIONS: Array<{ value: VideoScriptDuration; label: string }> = [
  { value: "15s", label: "15秒" },
  { value: "30s", label: "30秒" },
  { value: "60s", label: "60秒" },
];

export const DEFAULT_TEXT_CONTENT_LENGTH: TextContentLength = "200-500";
export const DEFAULT_VIDEO_SCRIPT_DURATION: VideoScriptDuration = "30s";

const LEGACY_TEXT_LENGTH_MAP: Record<string, TextContentLength> = {
  short: "under-200",
  medium: "200-500",
  long: "500-1000",
  "500-800": "500-1000",
  "800-1000": "long-form",
};

export function isTextContentLength(value: string): value is TextContentLength {
  return TEXT_LENGTH_OPTIONS.some((item) => item.value === value);
}

export function isVideoScriptDuration(value: string): value is VideoScriptDuration {
  return VIDEO_DURATION_OPTIONS.some((item) => item.value === value);
}

export function normalizeContentLength(
  value: string | undefined,
  mode: GenerationMode = "image-text",
): ContentLength {
  const normalized = String(value || "").trim();
  if (mode === "video-script") {
    if (isVideoScriptDuration(normalized)) return normalized;
    return DEFAULT_VIDEO_SCRIPT_DURATION;
  }
  if (isTextContentLength(normalized)) return normalized;
  if (normalized in LEGACY_TEXT_LENGTH_MAP) return LEGACY_TEXT_LENGTH_MAP[normalized];
  return DEFAULT_TEXT_CONTENT_LENGTH;
}

export function getContentLengthOptions(mode: GenerationMode) {
  return mode === "video-script" ? VIDEO_DURATION_OPTIONS : TEXT_LENGTH_OPTIONS;
}

export function getContentLengthFieldLabel(mode: GenerationMode): string {
  return mode === "video-script" ? "视频时长" : "文字篇幅";
}

export function formatContentLengthForPrompt(length: ContentLength, mode: GenerationMode): string {
  if (mode === "video-script") {
    const map: Record<VideoScriptDuration, string> = {
      "15s": "约15秒口播视频脚本（短小钩子型，节奏快）",
      "30s": "约30秒口播视频脚本（常规短视频）",
      "60s": "约60秒口播视频脚本（完整叙事）",
    };
    const key = isVideoScriptDuration(length) ? length : DEFAULT_VIDEO_SCRIPT_DURATION;
    return map[key];
  }
  const map: Record<TextContentLength, string> = {
    "under-200": "200字以内（含标点）",
    "200-500": "200-500字",
    "500-1000": "500-1000字",
    "long-form": "长文（接近小红书1000字上限）",
  };
  const key = isTextContentLength(length) ? length : DEFAULT_TEXT_CONTENT_LENGTH;
  return map[key];
}

export function applyGenerationModeChange(brief: BriefInput, mode: GenerationMode): BriefInput {
  return {
    ...brief,
    generationMode: mode,
    contentLength: normalizeContentLength(brief.contentLength, mode),
  };
}

export interface DraftArchiveField {
  label: string;
  value: string;
}

export function buildDraftArchiveFields(
  snapshot: BriefInput,
  angleName: string,
  config?: BusinessLineWorkflowConfig,
): DraftArchiveField[] {
  const businessLine = snapshot.businessLine;
  const cfg = resolveConfig(config, businessLine);
  const offer = getOffer(snapshot.offerId, cfg, businessLine);
  const scene = getScene(snapshot.creationScene, cfg, businessLine);
  const persona = cfg.personas.find((item) => item.id === snapshot.personaId);
  const lengthLabel =
    getContentLengthOptions(snapshot.generationMode).find((item) => item.value === snapshot.contentLength)?.label ||
    "-";
  const materialCount = snapshot.materials?.length ?? 0;
  const brandLabel = getBusinessLinePreset(businessLine).shortLabel;

  const fields: DraftArchiveField[] = [
    { label: "创意角度", value: angleName },
    { label: "业务线", value: brandLabel },
  ];
  if (!cfg.hideOfferSelection && offer) {
    fields.push({ label: "主推 Offer", value: offer.label });
  }
  fields.push(
    { label: "创作场景", value: scene.label },
    { label: "博主人设", value: persona?.label || "-" },
    { label: "目标读者", value: snapshot.targetUser },
    {
      label: "主推功能",
      value: snapshot.selectedFeatureNames?.join("、") || `${snapshot.selectedFeatureIds.length} 项`,
    },
    { label: "内容形式", value: snapshot.generationMode === "video-script" ? "视频脚本" : "图文内容" },
    { label: getContentLengthFieldLabel(snapshot.generationMode), value: lengthLabel },
    { label: "植入强度", value: getEmbedLevelLabel(snapshot.embedLevel) },
    { label: "素材", value: `${materialCount} 条` },
    ...(snapshot.topic ? [{ label: "主题", value: snapshot.topic }] : []),
  );
  return fields;
}
