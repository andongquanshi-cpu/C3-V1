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
}

export interface BriefInput {
  businessLine: BusinessLine;
  /** 理财通：主推 Offer */
  offerId?: LicaitongOfferId;
  /** 理财通：创作场景 */
  creationScene?: LicaitongCreationScene;
  /** 理财通：读者身份标签（通常由人设推断） */
  audienceTag?: LicaitongAudienceTag;
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
  recommendedTemplateId?: string;
  recommendedFeatureIds: string[];
  productBridge?: Record<string, string>;
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
  features: ProductFeatureView[];
  complianceRules: string[];
  scripts: Record<string, unknown>;
  contentGuide: string;
  productIntro: string;
  jsonKb: Record<string, unknown>;
  counts: Record<string, number>;
}
