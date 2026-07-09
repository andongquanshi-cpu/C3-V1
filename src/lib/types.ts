export type ContentType =
  | "stock-tutorial"
  | "finance-tips"
  | "personal-exp"
  | "hotspot-analysis"
  | "brand-seed";

export type GenerationMode = "image-text" | "video-script";
/** 图文正文字数区间（小红书正文上限 1000 字） */
export type TextContentLength = "under-200" | "200-500" | "500-1000" | "long-form";
/** 视频脚本时长 */
export type VideoScriptDuration = "15s" | "30s" | "60s";
export type ContentLength = TextContentLength | VideoScriptDuration;
export type BloggerLevel = "tail" | "middle" | "head";
export type EmbedLevel = "none" | "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type BusinessLine = "weisec" | "licaitong";

/** 理财通 Offer（本期深化 fixed-income-plus） */
export type LicaitongOfferId = "fixed-income-plus" | "lingqiantong" | "weizhitou";

/** 理财通创作场景 */
export type LicaitongCreationScene =
  | "newcomer-guide"
  | "review-diary"
  | "pain-story"
  | "dry-goods-list";

/** 理财通读者身份（由人设带出或只读展示） */
export type LicaitongAudienceTag = "student" | "mama" | "white-collar";

export interface ApiConfig {
  text: {
    key: string;
    apiUrl: string;
    model: string;
  };
  image: {
    key: string;
    apiUrl: string;
    model: string;
    format: "volcengine" | "openai";
  };
  hotspot: {
    key: string;
    apiUrl: string;
  };
}

export interface Material {
  id: string;
  title: string;
  body: string;
  source?: string;
  tags?: string[];
  createdAt: string;
  /** 是否送给 LLM；粘贴素材默认 true，搜索结果默认 false 直至用户勾选 */
  selected?: boolean;
  /** 市场观察员模式下的主热点素材 */
  isPrimary?: boolean;
}

export interface BriefInput {
  businessLine: BusinessLine;
  /** 主推 Offer（L6 配置） */
  offerId?: string;
  /** 创作场景（L6 配置） */
  creationScene?: string;
  /** 读者身份标签（L6 / L4） */
  audienceTag?: string;
  contentType: ContentType;
  topic: string;
  targetUser: string;
  personaId?: string;
  personaVariant?: string;
  campaignGoal?: string;
  bloggerLevel: BloggerLevel;
  embedLevel: EmbedLevel;
  contentLength: ContentLength;
  generationMode: GenerationMode;
  generateCount: number;
  customRequirement?: string;
  selectedFeatureIds: string[];
  selectedFeatureNames: string[];
  materials: Material[];
}

export interface CreativeAngle {
  angleId: string;
  angleName: string;
  angleType?: string;
  coreIdea: string;
  targetUser: string;
  emotionalHook: string[];
  userPainPoint?: string;
  contentStructure?: string;
  differentiationAxis?: string;
  recommendedTemplateId?: string;
  recommendedFeatureIds: string[];
  productBridge?: Record<string, string>;
  displayTags?: string[];
  titleDirections: string[];
  coverDirection?: string;
  riskLevel: RiskLevel;
  riskNotes: string[];
}

export interface QualityScore {
  overallScore: number;
  scores?: Record<string, number>;
  weaknesses?: string[];
  suggestions?: string[];
}

export interface GeneratedImage {
  promptIndex: number;
  url: string;
  style?: string;
  coverText?: string;
  /** 由视觉计划产生时使用：区分封面 / 内容图 */
  kind?: "cover" | "content";
  /** 视觉计划序号（封面=0，内容图从 1 起） */
  imageIndex?: number;
  /** 生成时的本地持久化路径（如 /generated/xxx/yyy.png），存在时优先使用 */
  localPath?: string;
  /** 生成时的 prompt 快照，方便回溯 */
  promptSnapshot?: string;
  /** 生成时间 */
  createdAt?: string;
}

/** 视觉计划中的单个卡片（对应一张图） */
export interface VisualPlanItem {
  /** 稳定 ID，前端使用 */
  id: string;
  /** 0 = 封面，1..N = 内容图 */
  imageIndex: number;
  /** cover / hook-context / key-insight / action-cta 等 */
  role: string;
  /** 卡片标题，UI 用（例："封面" / "问题引入"） */
  title: string;
  /** 图上显示的文案（画面内直接出现的字） */
  copy: string;
  /** 生图提示词（不含整体把控） */
  prompt: string;
  /** 封面钩子逻辑说明 / 内部注释 */
  hookAngle?: string;
  /** 与上一张的衔接关系 */
  connection?: string;
}

/** 一整套视觉计划（封面 + 内容图） */
export interface VisualPlan {
  /** 生成版本 */
  version: string;
  /** 总图数 */
  totalImages: number;
  /** 整体把控提示词，会拼接到每一次生图 prompt 前 */
  overallStyle: string;
  /** 计划创建时间 */
  createdAt: string;
  items: VisualPlanItem[];
}

export interface GeneratedContent {
  id: string;
  angleId: string;
  angleName: string;
  titleCandidates: Array<{ text: string; type?: string; riskLevel?: RiskLevel }>;
  selectedTitle: string;
  coverTextCandidates: Array<{ text: string; style?: string; riskLevel?: RiskLevel }>;
  selectedCoverText: string;
  content: string;
  insertStrategy?: Record<string, string>;
  tags: string[];
  interactionGuide: string;
  riskReminder: string;
  imagePromptSuggestions: Array<{
    style: string;
    prompt: string;
    coverText?: string;
    riskNotes?: string[];
  }>;
  generatedImages?: GeneratedImage[];
  /** 视觉计划（点击"制图"进入次级页面后由 AI 生成） */
  visualPlan?: VisualPlan;
  qualityScore?: QualityScore;
  complianceReport?: ComplianceReport;
  debugKnowledgeUsed?: unknown;
}

export interface ComplianceReport {
  overallRiskLevel: RiskLevel;
  publishReadiness: "ready" | "needs_revision" | "blocked";
  riskFindings: Array<{
    ruleId: string;
    riskType?: string;
    riskLevel: RiskLevel;
    originalText: string;
    reason: string;
    suggestedRewrite?: string;
    mustFix: boolean;
  }>;
  missingRequiredElements: Array<{ type: string; suggestedText: string }>;
  qualityScore?: QualityScore;
  requiredFixes: string[];
  summary: string;
  debugKnowledgeUsed?: unknown;
}

export interface Draft extends GeneratedContent {
  savedAt: string;
  draftEntryId?: string;
  generationSnapshot: BriefInput;
}

export interface ProductFeatureView {
  id: string;
  businessLine?: string;
  offerId?: string;
  name: string;
  summary: string;
  aliases: string[];
  scenarios: string[];
  recommendedPhrases: string[];
  complianceTaboo: string[];
  suitableContentTypes: string[];
  suitableCreationScenes?: string[];
  suitableUserSegments: string[];
  priority: number;
  sourceFile: string;
}

export interface KnowledgeListView {
  source: string;
  knowledgeBaseVersion: string;
  knowledgeBasePath: string;
  legacyMarkdownMode: string;
  licaitongWorkflow?: import("@/lib/business-line-workflow").BusinessLineWorkflowConfig;
  weisecWorkflow?: import("@/lib/business-line-workflow").BusinessLineWorkflowConfig;
  features: ProductFeatureView[];
  complianceRules: string[];
  scripts: Record<string, unknown>;
  contentGuide: string;
  productIntro: string;
  jsonKb: Record<string, unknown>;
  counts: Record<string, number>;
}
