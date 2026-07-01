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
}

export const LICAITONG_OFFERS: LicaitongOfferOption[] = [
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
];

export const LICAITONG_CREATION_SCENES: LicaitongCreationSceneOption[] = [
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
];

/** 固收+ 主推功能默认勾选（按创作场景） */
export const FPLUS_DEFAULT_FEATURES: Record<LicaitongCreationScene, string[]> = {
  "newcomer-guide": ["fplus_virtual_trial", "fplus_curated_zone"],
  "review-diary": ["fplus_virtual_trial"],
  "pain-story": ["fplus_curated_zone", "fplus_flexible_redeem"],
  "dry-goods-list": ["fplus_long_term_zone", "fplus_ai_assist"],
};

export const FPLUS_FEATURE_LIMIT = 2;

/** 左栏展示用短简介（1–2 行），完整文案仍在 KB 供生成注入 */
export const FPLUS_FEATURE_UI_SUMMARIES: Record<string, string> = {
  fplus_curated_zone: "严选专区，缩小固收+比较范围，不构成荐基。",
  fplus_virtual_trial: "虚拟理财金体验，熟悉流程；规则以活动页为准。",
  fplus_long_term_zone: "长期理财专区，看公开运作信息，不代表未来表现。",
  fplus_flexible_redeem: "部分产品申赎更灵活，买前先看清持有期限。",
  fplus_ai_assist: "AI 帮整理公开产品信息，不构成投资建议。",
};

export const LICAITONG_PERSONAS: LicaitongPersonaOption[] = [
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
  },
];

const AUDIENCE_LABELS: Record<LicaitongAudienceTag, string> = {
  student: "学生",
  mama: "宝妈",
  "white-collar": "白领",
};

export const LICAITONG_AUDIENCES: Array<{ id: LicaitongAudienceTag; label: string; hint: string }> = [
  { id: "student", label: "学生", hint: "零花钱、入门、校园语境" },
  { id: "mama", label: "宝妈", hint: "家庭备用金、育儿场景" },
  { id: "white-collar", label: "白领", hint: "工资理财、职场节奏" },
];

export type PersonaRecommendation = "both" | "scene" | "audience" | null;

export function getPersonaRecommendation(
  personaId: string,
  scene: LicaitongCreationScene,
  audience: LicaitongAudienceTag,
): PersonaRecommendation {
  const persona = LICAITONG_PERSONAS.find((item) => item.id === personaId);
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
): LicaitongPersonaOption[] {
  return getPersonasForLicaitongUI(scene, audience);
}

/** 展示全部人设；按场景+读者匹配度排序，不隐藏任何选项 */
export function getPersonasForLicaitongUI(
  scene?: LicaitongCreationScene,
  audience?: LicaitongAudienceTag,
): LicaitongPersonaOption[] {
  if (!scene || !audience) return [...LICAITONG_PERSONAS];
  return [...LICAITONG_PERSONAS].sort(
    (a, b) => scorePersonaForUI(b, scene, audience) - scorePersonaForUI(a, scene, audience),
  );
}

export function getLicaitongOffer(id?: LicaitongOfferId) {
  return LICAITONG_OFFERS.find((item) => item.id === id) || LICAITONG_OFFERS[0];
}

export function getLicaitongScene(id?: LicaitongCreationScene) {
  return LICAITONG_CREATION_SCENES.find((item) => item.id === id) || LICAITONG_CREATION_SCENES[2];
}

export function creationSceneToContentType(scene?: LicaitongCreationScene): ContentType {
  return getLicaitongScene(scene).contentType;
}

export function getDefaultFeatureIdsForScene(scene: LicaitongCreationScene): string[] {
  return (FPLUS_DEFAULT_FEATURES[scene] || []).slice(0, FPLUS_FEATURE_LIMIT);
}

export function getPersonasForScene(scene: LicaitongCreationScene): LicaitongPersonaOption[] {
  return LICAITONG_PERSONAS.filter((item) => item.suitableScenes.includes(scene));
}

export function getDefaultPersonaForScene(scene: LicaitongCreationScene): LicaitongPersonaOption {
  const list = getPersonasForScene(scene);
  return list[0] || LICAITONG_PERSONAS[0];
}

export function audienceTagToTargetUser(tag: LicaitongAudienceTag): string {
  return AUDIENCE_LABELS[tag];
}

export function inferAudienceFromPersona(personaId?: string): LicaitongAudienceTag {
  const persona = LICAITONG_PERSONAS.find((item) => item.id === personaId);
  return persona?.audienceTags[0] || "white-collar";
}

export function buildLicaitongDefaults(): Pick<
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
  const scene: LicaitongCreationScene = "pain-story";
  const persona = getDefaultPersonaForScene(scene);
  const featureIds = getDefaultFeatureIdsForScene(scene);
  return {
    offerId: "fixed-income-plus",
    creationScene: scene,
    audienceTag: "white-collar",
    contentType: creationSceneToContentType(scene),
    targetUser: audienceTagToTargetUser("white-collar"),
    personaId: persona.id,
    personaVariant: persona.variant,
    selectedFeatureIds: featureIds,
    selectedFeatureNames: [],
    topic: "选固收+产品太纠结？我先在理财通里把比较范围缩小",
    campaignGoal: "内容营销：固收+认知与申购引导",
  };
}

export function applyLicaitongSceneChange(
  brief: BriefInput,
  scene: LicaitongCreationScene,
  _featureNameById: Record<string, string>,
): BriefInput {
  return {
    ...brief,
    creationScene: scene,
    contentType: creationSceneToContentType(scene),
    // Offer / 主推功能 / 读者 / 人设：均不因换场景被动改写
  };
}

/** 仅用户点击 Offer 时调用；可带入该场景下的默认主推功能 */
export function applyLicaitongOfferChange(
  brief: BriefInput,
  offerId: LicaitongOfferId,
  featureNameById: Record<string, string>,
): BriefInput {
  const scene = brief.creationScene || "pain-story";
  if (offerId !== "fixed-income-plus") {
    return {
      ...brief,
      offerId,
      selectedFeatureIds: [],
      selectedFeatureNames: [],
    };
  }
  const featureIds = getDefaultFeatureIdsForScene(scene);
  return {
    ...brief,
    offerId,
    selectedFeatureIds: featureIds,
    selectedFeatureNames: featureIds.map((id) => featureNameById[id]).filter(Boolean),
  };
}

export function applyLicaitongAudienceChange(brief: BriefInput, audienceTag: LicaitongAudienceTag): BriefInput {
  return {
    ...brief,
    audienceTag,
    targetUser: audienceTagToTargetUser(audienceTag),
    // 读者与人设弱关联：不联动修改 personaId
  };
}

export function applyLicaitongPersonaChange(brief: BriefInput, personaId: string): BriefInput {
  const persona = LICAITONG_PERSONAS.find((item) => item.id === personaId);
  if (!persona) return brief;
  return {
    ...brief,
    personaId: persona.id,
    personaVariant: persona.variant,
  };
}

export function toggleLicaitongFeature(
  brief: BriefInput,
  featureId: string,
  featureName: string,
  checked: boolean,
): BriefInput {
  const ids = new Set(brief.selectedFeatureIds);
  const names = new Set(brief.selectedFeatureNames);
  if (checked) {
    if (ids.size >= FPLUS_FEATURE_LIMIT && !ids.has(featureId)) {
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
