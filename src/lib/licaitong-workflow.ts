import type {
  BriefInput,
  ContentLength,
  ContentType,
  GenerationMode,
  LicaitongAudienceTag,
  LicaitongCreationScene,
  LicaitongOfferId,
  TextContentLength,
  VideoScriptDuration,
} from "@/lib/types";

export interface LicaitongOfferOption {
  id: LicaitongOfferId;
  label: string;
  description: string;
  enabled: boolean;
  badge?: string;
}

export interface LicaitongCreationSceneOption {
  id: LicaitongCreationScene;
  label: string;
  description: string;
  contentType: ContentType;
}

export interface LicaitongPersonaOption {
  id: string;
  label: string;
  description: string;
  variant?: string;
  audienceTags: LicaitongAudienceTag[];
  audienceLabel: string;
  suitableScenes: LicaitongCreationScene[];
  requiresHotspotMaterials?: boolean;
  uiBadge?: string;
}

export interface LicaitongAudienceOption {
  id: LicaitongAudienceTag;
  label: string;
  hint: string;
  targetUserLabel: string;
}

export interface LicaitongWorkflowConfig {
  offers: LicaitongOfferOption[];
  creationScenes: LicaitongCreationSceneOption[];
  audiences: LicaitongAudienceOption[];
  personas: LicaitongPersonaOption[];
  fplusDefaultFeatures: Record<LicaitongCreationScene, string[]>;
  fplusFeatureLimit: number;
  fplusFeatureUiSummaries: Record<string, string>;
  defaultBrief: {
    offerId: LicaitongOfferId;
    creationScene: LicaitongCreationScene;
    audienceTag: LicaitongAudienceTag;
    topic: string;
    campaignGoal: string;
  };
}

/** KB 未加载时的兜底配置（与 v5 workflow-config + L4 对齐） */
export const FALLBACK_LICAITONG_WORKFLOW: LicaitongWorkflowConfig = {
  offers: [
    {
      id: "fixed-income-plus",
      label: "固收+",
      description: "本期主推。严选专区、体验金、长期专区、灵活申赎、AI 辅助等卖点。",
      enabled: true,
      badge: "本期主推",
    },
    {
      id: "lingqiantong",
      label: "零钱通",
      description: "入口预留，知识库建设中。",
      enabled: false,
      badge: "敬请期待",
    },
    {
      id: "weizhitou",
      label: "微智投",
      description: "入口预留，知识库建设中。",
      enabled: false,
      badge: "敬请期待",
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
      description: "清单/框架/几步走，信息密度高但克制。",
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
  fplusDefaultFeatures: {
    "newcomer-guide": ["fplus_virtual_trial", "fplus_curated_zone"],
    "review-diary": ["fplus_virtual_trial"],
    "pain-story": ["fplus_curated_zone", "fplus_flexible_redeem"],
    "dry-goods-list": ["fplus_long_term_zone", "fplus_ai_assist"],
  },
  fplusFeatureLimit: 2,
  fplusFeatureUiSummaries: {
    fplus_curated_zone: "严选专区，缩小固收+比较范围，不构成荐基。",
    fplus_virtual_trial: "虚拟理财金体验，熟悉流程；规则以活动页为准。",
    fplus_long_term_zone: "长期理财专区，看公开运作信息，不代表未来表现。",
    fplus_flexible_redeem: "部分产品申赎更灵活，买前先看清持有期限。",
    fplus_ai_assist: "AI 帮整理公开产品信息，不构成投资建议。",
  },
  defaultBrief: {
    offerId: "fixed-income-plus",
    creationScene: "pain-story",
    audienceTag: "white-collar",
    topic: "选固收+产品太纠结？我先在理财通里把比较范围缩小",
    campaignGoal: "内容营销：固收+认知与申购引导",
  },
};

/** @deprecated 请使用 workflowConfig.offers */
export const LICAITONG_OFFERS = FALLBACK_LICAITONG_WORKFLOW.offers;
/** @deprecated 请使用 workflowConfig.creationScenes */
export const LICAITONG_CREATION_SCENES = FALLBACK_LICAITONG_WORKFLOW.creationScenes;
/** @deprecated 请使用 workflowConfig.personas */
export const LICAITONG_PERSONAS = FALLBACK_LICAITONG_WORKFLOW.personas;
/** @deprecated 请使用 workflowConfig.audiences */
export const LICAITONG_AUDIENCES = FALLBACK_LICAITONG_WORKFLOW.audiences;
/** @deprecated 请使用 workflowConfig.fplusDefaultFeatures */
export const FPLUS_DEFAULT_FEATURES = FALLBACK_LICAITONG_WORKFLOW.fplusDefaultFeatures;
/** @deprecated 请使用 workflowConfig.fplusFeatureLimit */
export const FPLUS_FEATURE_LIMIT = FALLBACK_LICAITONG_WORKFLOW.fplusFeatureLimit;
/** @deprecated 请使用 workflowConfig.fplusFeatureUiSummaries */
export const FPLUS_FEATURE_UI_SUMMARIES = FALLBACK_LICAITONG_WORKFLOW.fplusFeatureUiSummaries;

export type PersonaRecommendation = "both" | "scene" | "audience" | null;

function resolveConfig(config?: LicaitongWorkflowConfig) {
  return config || FALLBACK_LICAITONG_WORKFLOW;
}

export function getPersonaRecommendation(
  personaId: string,
  scene: LicaitongCreationScene,
  audience: LicaitongAudienceTag,
  config?: LicaitongWorkflowConfig,
): PersonaRecommendation {
  const cfg = resolveConfig(config);
  const persona = cfg.personas.find((item) => item.id === personaId);
  if (!persona) return null;
  const sceneMatch = persona.suitableScenes.includes(scene);
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

function scorePersonaForUI(
  persona: LicaitongPersonaOption,
  scene: LicaitongCreationScene,
  audience: LicaitongAudienceTag,
): number {
  return (persona.suitableScenes.includes(scene) ? 2 : 0) + (persona.audienceTags.includes(audience) ? 1 : 0);
}

export function getPersonasForSceneAndAudience(
  scene: LicaitongCreationScene,
  audience?: LicaitongAudienceTag,
  config?: LicaitongWorkflowConfig,
): LicaitongPersonaOption[] {
  return getPersonasForLicaitongUI(scene, audience, config);
}

export function getPersonasForLicaitongUI(
  scene?: LicaitongCreationScene,
  audience?: LicaitongAudienceTag,
  config?: LicaitongWorkflowConfig,
): LicaitongPersonaOption[] {
  const cfg = resolveConfig(config);
  if (!scene || !audience) return [...cfg.personas];
  return [...cfg.personas].sort(
    (a, b) => scorePersonaForUI(b, scene, audience) - scorePersonaForUI(a, scene, audience),
  );
}

export function getLicaitongOffer(id?: LicaitongOfferId, config?: LicaitongWorkflowConfig) {
  const cfg = resolveConfig(config);
  return cfg.offers.find((item) => item.id === id) || cfg.offers[0];
}

export function getLicaitongScene(id?: LicaitongCreationScene, config?: LicaitongWorkflowConfig) {
  const cfg = resolveConfig(config);
  return cfg.creationScenes.find((item) => item.id === id) || cfg.creationScenes[2] || cfg.creationScenes[0];
}

export function creationSceneToContentType(
  scene?: LicaitongCreationScene,
  config?: LicaitongWorkflowConfig,
): ContentType {
  return getLicaitongScene(scene, config).contentType;
}

export function getDefaultFeatureIdsForScene(
  scene: LicaitongCreationScene,
  config?: LicaitongWorkflowConfig,
): string[] {
  const cfg = resolveConfig(config);
  return (cfg.fplusDefaultFeatures[scene] || []).slice(0, cfg.fplusFeatureLimit);
}

export function getPersonasForScene(
  scene: LicaitongCreationScene,
  config?: LicaitongWorkflowConfig,
): LicaitongPersonaOption[] {
  const cfg = resolveConfig(config);
  return cfg.personas.filter((item) => item.suitableScenes.includes(scene));
}

export function getDefaultPersonaForScene(
  scene: LicaitongCreationScene,
  config?: LicaitongWorkflowConfig,
): LicaitongPersonaOption {
  const cfg = resolveConfig(config);
  const list = getPersonasForScene(scene, cfg);
  return list[0] || cfg.personas[0];
}

export function audienceTagToTargetUser(tag: LicaitongAudienceTag, config?: LicaitongWorkflowConfig): string {
  const cfg = resolveConfig(config);
  const hit = cfg.audiences.find((item) => item.id === tag);
  return hit?.targetUserLabel || hit?.label || tag;
}

export function inferAudienceFromPersona(personaId?: string, config?: LicaitongWorkflowConfig): LicaitongAudienceTag {
  const cfg = resolveConfig(config);
  const persona = cfg.personas.find((item) => item.id === personaId);
  return persona?.audienceTags[0] || "white-collar";
}

export function buildLicaitongDefaults(config?: LicaitongWorkflowConfig): Pick<
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
  const cfg = resolveConfig(config);
  const scene = cfg.defaultBrief.creationScene;
  const persona = getDefaultPersonaForScene(scene, cfg);
  const featureIds = getDefaultFeatureIdsForScene(scene, cfg);
  const audienceTag = cfg.defaultBrief.audienceTag;
  return {
    offerId: cfg.defaultBrief.offerId,
    creationScene: scene,
    audienceTag,
    contentType: creationSceneToContentType(scene, cfg),
    targetUser: audienceTagToTargetUser(audienceTag, cfg),
    personaId: persona.id,
    personaVariant: persona.variant,
    selectedFeatureIds: featureIds,
    selectedFeatureNames: [],
    topic: cfg.defaultBrief.topic,
    campaignGoal: cfg.defaultBrief.campaignGoal,
  };
}

export function applyLicaitongSceneChange(
  brief: BriefInput,
  scene: LicaitongCreationScene,
  _featureNameById: Record<string, string>,
  config?: LicaitongWorkflowConfig,
): BriefInput {
  return {
    ...brief,
    creationScene: scene,
    contentType: creationSceneToContentType(scene, config),
  };
}

export function applyLicaitongOfferChange(
  brief: BriefInput,
  offerId: LicaitongOfferId,
  featureNameById: Record<string, string>,
  config?: LicaitongWorkflowConfig,
): BriefInput {
  const cfg = resolveConfig(config);
  const scene = brief.creationScene || cfg.defaultBrief.creationScene;
  if (offerId !== "fixed-income-plus") {
    return {
      ...brief,
      offerId,
      selectedFeatureIds: [],
      selectedFeatureNames: [],
    };
  }
  const featureIds = getDefaultFeatureIdsForScene(scene, cfg);
  return {
    ...brief,
    offerId,
    selectedFeatureIds: featureIds,
    selectedFeatureNames: featureIds.map((id) => featureNameById[id]).filter(Boolean),
  };
}

export function applyLicaitongAudienceChange(
  brief: BriefInput,
  audienceTag: LicaitongAudienceTag,
  config?: LicaitongWorkflowConfig,
): BriefInput {
  return {
    ...brief,
    audienceTag,
    targetUser: audienceTagToTargetUser(audienceTag, config),
  };
}

export function applyLicaitongPersonaChange(
  brief: BriefInput,
  personaId: string,
  config?: LicaitongWorkflowConfig,
): BriefInput {
  const cfg = resolveConfig(config);
  const persona = cfg.personas.find((item) => item.id === personaId);
  if (!persona) return brief;
  return {
    ...brief,
    personaId: persona.id,
    personaVariant: persona.variant,
    contentType:
      persona.id === "hotspot_observer" || persona.requiresHotspotMaterials
        ? "hotspot-analysis"
        : creationSceneToContentType(brief.creationScene, cfg),
  };
}

export function toggleLicaitongFeature(
  brief: BriefInput,
  featureId: string,
  featureName: string,
  checked: boolean,
  config?: LicaitongWorkflowConfig,
): BriefInput {
  const limit = resolveConfig(config).fplusFeatureLimit;
  const ids = new Set(brief.selectedFeatureIds);
  const names = new Set(brief.selectedFeatureNames);
  if (checked) {
    if (ids.size >= limit && !ids.has(featureId)) {
      return brief;
    }
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

export const LICAITONG_TEXT_LENGTH_OPTIONS: Array<{ value: TextContentLength; label: string }> = [
  { value: "under-200", label: "200字内" },
  { value: "200-500", label: "200-500字" },
  { value: "500-1000", label: "500-1000字" },
  { value: "long-form", label: "长文" },
];

export const LICAITONG_VIDEO_DURATION_OPTIONS: Array<{ value: VideoScriptDuration; label: string }> = [
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
  return LICAITONG_TEXT_LENGTH_OPTIONS.some((item) => item.value === value);
}

export function isVideoScriptDuration(value: string): value is VideoScriptDuration {
  return LICAITONG_VIDEO_DURATION_OPTIONS.some((item) => item.value === value);
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
  return mode === "video-script" ? LICAITONG_VIDEO_DURATION_OPTIONS : LICAITONG_TEXT_LENGTH_OPTIONS;
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

import { getEmbedLevelLabel } from "@/lib/embed-level";

export interface DraftArchiveField {
  label: string;
  value: string;
}

export function buildDraftArchiveFields(
  snapshot: BriefInput,
  angleName: string,
  config?: LicaitongWorkflowConfig,
): DraftArchiveField[] {
  const cfg = resolveConfig(config);
  const offer = getLicaitongOffer(snapshot.offerId, cfg);
  const scene = getLicaitongScene(snapshot.creationScene, cfg);
  const persona = cfg.personas.find((item) => item.id === snapshot.personaId);
  const lengthLabel =
    getContentLengthOptions(snapshot.generationMode).find((item) => item.value === snapshot.contentLength)?.label || "-";
  const materialCount = snapshot.materials?.length ?? 0;

  return [
    { label: "创意角度", value: angleName },
    { label: "主推 Offer", value: offer.label },
    { label: "创作场景", value: scene.label },
    { label: "博主人设", value: persona?.label || "-" },
    { label: "目标读者", value: snapshot.targetUser },
    {
      label: "主推功能",
      value: snapshot.selectedFeatureNames?.join("、") || `${snapshot.selectedFeatureIds.length} 项`,
    },
    { label: "内容形式", value: snapshot.generationMode === "video-script" ? "视频脚本" : "图文内容" },
    { label: getContentLengthFieldLabel(snapshot.generationMode), value: lengthLabel },
    { label: "产品出现方式", value: getEmbedLevelLabel(snapshot.embedLevel) },
    { label: "素材", value: `${materialCount} 条` },
    ...(snapshot.topic ? [{ label: "主题", value: snapshot.topic }] : []),
  ];
}
