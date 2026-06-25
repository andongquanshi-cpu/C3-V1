import fs from "node:fs";
import path from "node:path";
import { toArray } from "@/lib/utils";

const CORE_HIGH_RISK_RULE_IDS = new Set([
  "risk_return_promise",
  "risk_stock_or_fund_recommendation",
  "risk_trading_signal_prediction",
  "risk_private_traffic_inducement",
  "risk_inside_information",
  "risk_missing_disclaimer",
]);

const CONTENT_TYPE_ALIASES: Record<string, string[]> = {
  "stock-tutorial": ["stock-tutorial", "beginner-guide"],
  "finance-tips": ["finance-tips", "content-list"],
  "personal-exp": ["personal-exp", "scenario-seeding"],
  "hotspot-analysis": ["hotspot-analysis", "content-list"],
  "brand-seed": ["brand-seed", "scenario-seeding", "tool-review"],
  "tool-review": ["tool-review", "brand-seed"],
  "scenario-seeding": ["scenario-seeding", "personal-exp", "brand-seed"],
  "content-list": ["content-list", "finance-tips"],
};

const EMBED_FEATURE_LIMITS: Record<string, number> = {
  none: 0,
  low: 2,
  medium: 3,
  high: 4,
};

interface KnowledgeInput {
  contentType?: string;
  businessLine?: string;
  targetUser?: string;
  targetUserSegment?: string;
  topic?: string;
  campaignGoal?: string;
  embedLevel?: string;
  generationMode?: string;
  task?: string;
  promptTask?: string;
  featureId?: string | string[];
  featureIds?: string | string[];
  selectedFeatureIds?: string | string[];
  mainFeatureId?: string | string[];
  productFeatureId?: string | string[];
  featureName?: string | string[];
  featureNames?: string | string[];
  selectedFeatureNames?: string | string[];
  mainFeatureName?: string | string[];
  productFeatureName?: string | string[];
  templateId?: string;
  templateLimit?: number;
  phraseGroupId?: string;
  phraseId?: string;
}

interface KnowledgeOptions {
  knowledgeBasePath?: string;
  rewriteRuleLimit?: number;
}

type AnyRecord = Record<string, any>;

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function getContentTypeCandidates(contentType?: string) {
  const normalized = normalizeText(contentType || "brand-seed");
  return unique([normalized, ...(CONTENT_TYPE_ALIASES[normalized] || [])]);
}

export function resolveKnowledgeBasePath(customPath?: string) {
  const candidates = [
    customPath,
    process.env.AI_KNOWLEDGE_BASE_PATH,
    path.join(process.cwd(), "ai-knowledge-base-v3.3"),
    path.join(process.cwd(), "ai-knowledge-base-v3.2"),
  ].filter(Boolean) as string[];

  const resolved = candidates.find((candidate) => fs.existsSync(path.join(candidate, "index.json")));
  if (!resolved) {
    throw new Error(`未找到知识库目录。已尝试：${candidates.join(" | ")}`);
  }
  return resolved;
}

function readJson(basePath: string, fileName: string, fallback: AnyRecord = {}) {
  const filePath = path.join(basePath, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveBusinessLine(input: KnowledgeInput = {}) {
  const raw = normalizeText(input.businessLine || process.env.AI_KNOWLEDGE_BUSINESS_LINE || "weisec");
  if (raw === "licaitong" || raw === "lct" || raw === "理财通") return "licaitong";
  if (raw === "weisec" || raw === "wzq" || raw === "微证券") return "weisec";
  return raw || "weisec";
}

function matchesBusinessLine(item: AnyRecord, businessLine: string) {
  const line = normalizeText(item.businessLine || "all");
  return !line || line === "all" || line === businessLine;
}

export function loadKnowledgeBase(options: KnowledgeOptions = {}) {
  const basePath = resolveKnowledgeBasePath(options.knowledgeBasePath);
  const brandVoiceRaw = readJson(basePath, "brand-voice.json");
  const brandVoiceItems = brandVoiceRaw.items
    ? brandVoiceRaw.items
    : [{ id: "brand_voice_legacy", businessLine: "weisec", ...brandVoiceRaw }];
  return {
    basePath,
    index: readJson(basePath, "index.json"),
    brandVoiceItems,
    defaultBusinessLine: brandVoiceRaw.defaultBusinessLine || "weisec",
    productFeatures: readJson(basePath, "product-features.json", { items: [] }).items || [],
    contentTemplates: readJson(basePath, "content-templates.json", { items: [] }).items || [],
    phraseLibrary: readJson(basePath, "phrase-library.json", { items: [] }).items || [],
    complianceRules: readJson(basePath, "compliance-rules.json", { items: [] }).items || [],
    rewriteRules: readJson(basePath, "compliance-rewrite-rules.cleaned.json", { items: [] }).items || [],
    riskDisclaimers: readJson(basePath, "risk-disclaimers.json", { items: [], globalRiskReminder: "" }),
    platformRules: readJson(basePath, "platform-rules.json", { items: [] }).items || [],
    visualGuidelines: readJson(basePath, "visual-guidelines.json", { items: [] }).items || [],
    audienceProfiles: readJson(basePath, "audience-profiles.json", { items: [] }).items || [],
  };
}

function scoreTextMatches(fields: unknown, terms: unknown, weight: number) {
  const haystack = toArray(fields).flatMap((item) => toArray(item)).join(" ").toLowerCase();
  return toArray(terms).reduce<number>((score, term) => {
    const normalized = normalizeText(term);
    return normalized && haystack.includes(normalized) ? score + weight : score;
  }, 0);
}

function scoreFeature(feature: AnyRecord, input: KnowledgeInput, contentTypeCandidates: string[], businessLine: string) {
  if (!matchesBusinessLine(feature, businessLine)) return 0;
  const targetUser = input.targetUser || input.targetUserSegment || "";
  const requestedFeatureIds = unique([
    ...toArray(input.featureId),
    ...toArray(input.featureIds),
    ...toArray(input.selectedFeatureIds),
    ...toArray(input.mainFeatureId),
    ...toArray(input.productFeatureId),
  ].map(String));
  const requestedFeatureNames = unique([
    ...toArray(input.featureName),
    ...toArray(input.featureNames),
    ...toArray(input.selectedFeatureNames),
    ...toArray(input.mainFeatureName),
    ...toArray(input.productFeatureName),
  ].map(String));

  let score = Number(feature.priority || 0) / 100;
  if (requestedFeatureIds.includes(feature.id)) score += 100;
  if (requestedFeatureNames.some((name) => feature.name === name || toArray(feature.aliases).includes(name))) score += 100;
  if (toArray(feature.suitableContentTypes).some((type) => contentTypeCandidates.includes(String(type)))) score += 20;
  if (scoreTextMatches(feature.suitableUserSegments, [targetUser], 12)) score += 12;
  score += scoreTextMatches([feature.aliases, feature.userPainPoints, feature.useCases, feature.summary], [targetUser, input.topic, input.campaignGoal], 2);
  return score;
}

function pruneFeature(feature: AnyRecord, embedLevel: string) {
  return {
    id: feature.id,
    name: feature.name,
    summary: feature.summary,
    aliases: toArray(feature.aliases).slice(0, 5),
    suitableContentTypes: toArray(feature.suitableContentTypes),
    suitableUserSegments: toArray(feature.suitableUserSegments),
    userPainPoints: toArray(feature.userPainPoints).slice(0, 4),
    useCases: toArray(feature.useCases).slice(0, 4),
    productActions: toArray(feature.productActions).slice(0, 4),
    safeClaims: toArray(feature.safeClaims).slice(0, 4),
    softInsertPhrases: toArray(feature.softInsertPhrases).slice(0, 4),
    strongInsertPhrases: embedLevel === "high" ? toArray(feature.strongInsertPhrases).slice(0, 2) : [],
    forbiddenClaims: toArray(feature.forbiddenClaims).slice(0, 4),
    riskNotes: toArray(feature.riskNotes).slice(0, 3),
  };
}

function selectFeatures(features: AnyRecord[], input: KnowledgeInput, contentTypeCandidates: string[], businessLine: string) {
  const embedLevel = normalizeText(input.embedLevel || "medium");
  const limit = EMBED_FEATURE_LIMITS[embedLevel] ?? EMBED_FEATURE_LIMITS.medium;
  if (limit === 0) return [];

  return features
    .map((feature) => ({ feature, score: scoreFeature(feature, input, contentTypeCandidates, businessLine) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ feature }) => pruneFeature(feature, embedLevel));
}

function scoreTemplate(template: AnyRecord, input: KnowledgeInput, contentTypeCandidates: string[], businessLine: string) {
  if (!matchesBusinessLine(template, businessLine)) return 0;
  const targetUser = input.targetUser || input.targetUserSegment || "";
  let score = 0;
  if (input.templateId && input.templateId === template.id) score += 100;
  if (toArray(template.bestForContentTypes).some((type) => contentTypeCandidates.includes(String(type)))) score += 20;
  if (scoreTextMatches(template.suitableUserSegments, [targetUser], 10)) score += 10;
  score += scoreTextMatches([template.name, template.emotionalHook, template.titlePatterns, template.coverTextPatterns, template.bodyStructure], [input.topic, input.campaignGoal, targetUser], 2);
  return score;
}

function pruneTemplate(template: AnyRecord) {
  return {
    id: template.id,
    name: template.name,
    bestForContentTypes: toArray(template.bestForContentTypes),
    suitableUserSegments: toArray(template.suitableUserSegments),
    emotionalHook: toArray(template.emotionalHook),
    bodyStructure: toArray(template.bodyStructure),
    recommendedInsertPosition: toArray(template.recommendedInsertPosition),
    titlePatterns: toArray(template.titlePatterns).slice(0, 3),
    coverTextPatterns: toArray(template.coverTextPatterns).slice(0, 3),
    interactionGuidePatterns: toArray(template.interactionGuidePatterns).slice(0, 3),
    riskNotes: toArray(template.riskNotes).slice(0, 3),
  };
}

function selectTemplates(templates: AnyRecord[], input: KnowledgeInput, contentTypeCandidates: string[], businessLine: string) {
  return templates
    .map((template) => ({ template, score: scoreTemplate(template, input, contentTypeCandidates, businessLine) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.templateLimit || 2)
    .map(({ template }) => pruneTemplate(template));
}

function selectPhraseGroup(phraseLibrary: AnyRecord[], input: KnowledgeInput, contentTypeCandidates: string[], businessLine: string) {
  const requested = input.phraseGroupId || input.phraseId;
  const scoped = phraseLibrary.filter((group) => matchesBusinessLine(group, businessLine));
  const exact = scoped.find((group) => group.id === requested);
  const matched = exact || scoped.find((group) => contentTypeCandidates.includes(group.contentType));
  if (!matched) return null;

  return {
    id: matched.id,
    contentType: matched.contentType,
    userGroup: matched.userGroup,
    safeOpeningHooks: toArray(matched.safeOpeningHooks).slice(0, 4),
    painPointPhrases: toArray(matched.painPointPhrases).slice(0, 4),
    solutionPhrases: toArray(matched.solutionPhrases).slice(0, 4),
    conversionPhrases: toArray(matched.conversionPhrases).slice(0, 3),
    riskReminderPhrases: toArray(matched.riskReminderPhrases).slice(0, 3),
    titlePhrases: toArray(matched.titlePhrases).slice(0, 4),
    coverPhrases: toArray(matched.coverPhrases).slice(0, 3),
    phrasesToAvoid: toArray(matched.phrasesToAvoid).slice(0, 8),
  };
}

function pruneComplianceRule(rule: AnyRecord) {
  return {
    id: rule.id,
    riskType: rule.riskType,
    riskLevel: rule.riskLevel,
    description: rule.description,
    forbiddenPatterns: toArray(rule.forbiddenPatterns).slice(0, 12),
    safeAlternatives: toArray(rule.safeAlternatives).slice(0, 5),
    appliesTo: toArray(rule.appliesTo),
    reviewAction: rule.reviewAction,
  };
}

function selectComplianceRules(rules: AnyRecord[], input: KnowledgeInput, contentTypeCandidates: string[]) {
  const generationMode = normalizeText(input.generationMode || "");
  const purpose = normalizeText(input.task || input.promptTask || "");
  return rules
    .filter((rule) => {
      const appliesTo = toArray(rule.appliesTo).map(normalizeText);
      return CORE_HIGH_RISK_RULE_IDS.has(rule.id) || appliesTo.includes("all") || appliesTo.some((type) => contentTypeCandidates.includes(type)) || appliesTo.includes(generationMode) || appliesTo.includes(purpose);
    })
    .map(pruneComplianceRule);
}

function pruneRewriteRule(rule: AnyRecord) {
  return {
    id: rule.id,
    category: rule.category,
    riskLevel: rule.riskLevel,
    bannedExpressions: toArray(rule.bannedExpressions).slice(0, 10),
    cleanedAlternatives: toArray(rule.cleanedAlternatives).slice(0, 6),
    rewriteExamples: toArray(rule.rewriteExamples).slice(0, 2),
  };
}

function selectRewriteRules(rewriteRules: AnyRecord[], complianceRules: AnyRecord[], options: KnowledgeOptions = {}) {
  const selectedRuleIds = new Set(complianceRules.map((rule) => rule.id));
  const categoryHints = [...selectedRuleIds].join(" ");
  const limit = options.rewriteRuleLimit || 6;

  return rewriteRules
    .map((rule) => {
      let score = 0;
      if (rule.id === "required_disclaimer") score += 100;
      if (normalizeText(rule.riskLevel) === "high") score += 10;
      if (scoreTextMatches([rule.id, rule.category, rule.bannedExpressions], [categoryHints], 2)) score += 2;
      return { rule, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ rule }) => pruneRewriteRule(rule));
}

function pruneBrandVoice(brandVoiceItems: AnyRecord[], input: KnowledgeInput = {}, businessLine: string) {
  const targetUser = input.targetUser || input.targetUserSegment || "";
  const brandVoice =
    brandVoiceItems.find((item) => item.businessLine === businessLine) ||
    brandVoiceItems.find((item) => item.businessLine === "all") ||
    brandVoiceItems[0] ||
    {};
  const targetUsers = toArray(brandVoice.targetUsers) as AnyRecord[];
  const targetUserProfile = targetUsers.find((user) => user.name === targetUser || scoreTextMatches([user.name, user.needs, user.tone], [targetUser], 1) > 0) || null;

  return {
    id: brandVoice.id,
    businessLine: brandVoice.businessLine || businessLine,
    version: brandVoice.version,
    brand: brandVoice.brand,
    positioning: brandVoice.positioning,
    brandRole: brandVoice.brandRole,
    targetUserProfile,
    recommendedTone: toArray(brandVoice.recommendedTone),
    standardConversionPaths: toArray(brandVoice.standardConversionPaths),
    requiredRiskReminders: toArray(brandVoice.requiredRiskReminders),
    preferredProductExpressions: toArray(brandVoice.preferredProductExpressions),
    avoidExpressions: toArray(brandVoice.avoidExpressions),
    imageAndCoverGuidelines: toArray(brandVoice.imageAndCoverGuidelines),
  };
}

function selectRiskDisclaimers(riskDisclaimers: AnyRecord, input: KnowledgeInput, contentTypeCandidates: string[], businessLine: string) {
  const items = toArray(riskDisclaimers.items) as AnyRecord[];
  const matched = items.filter((item) => {
    if (!matchesBusinessLine(item, businessLine)) return false;
    const appliesTo = toArray(item.appliesTo).map(normalizeText);
    return appliesTo.includes("all") || appliesTo.some((type) => contentTypeCandidates.includes(type)) || item.required;
  });
  const selected = matched.length ? matched : items.filter((item) => item.required);
  return {
    globalRiskReminder: riskDisclaimers.globalRiskReminder || "市场有风险，投资需谨慎。",
    requiredTexts: selected.slice(0, 3).map((item) => item.text),
  };
}

function prunePlatformRule(rule: AnyRecord) {
  return {
    id: rule.id,
    category: rule.category,
    riskLevel: rule.riskLevel,
    description: rule.description,
    forbiddenPatterns: toArray(rule.forbiddenPatterns).slice(0, 8),
    safeAlternatives: toArray(rule.safeAlternatives).slice(0, 4),
    appliesTo: toArray(rule.appliesTo),
  };
}

function selectPlatformRules(rules: AnyRecord[], input: KnowledgeInput, contentTypeCandidates: string[], purpose: string) {
  const generationMode = normalizeText(input.generationMode || "");
  const limit = purpose.includes("cover") ? 4 : 5;
  return rules
    .filter((rule) => {
      const appliesTo = toArray(rule.appliesTo).map(normalizeText);
      return appliesTo.includes("all") || appliesTo.some((type) => contentTypeCandidates.includes(type)) || appliesTo.includes(generationMode) || appliesTo.includes("cover");
    })
    .slice(0, limit)
    .map(prunePlatformRule);
}

function pruneVisualGuideline(item: AnyRecord) {
  return {
    id: item.id,
    name: item.name,
    businessLine: item.businessLine,
    primaryColors: item.primaryColors,
    coreElements: item.coreElements,
    styleKeywords: item.styleKeywords,
    forbiddenVisuals: item.forbiddenVisuals,
    safeExpressions: toArray(item.safeExpressions).slice(0, 4),
    forbiddenExpressions: toArray(item.forbiddenExpressions).slice(0, 4),
    promptSummary: item.promptSummary,
  };
}

function selectVisualGuidelines(items: AnyRecord[], businessLine: string) {
  return items
    .filter((item) => matchesBusinessLine(item, businessLine))
    .slice(0, 2)
    .map(pruneVisualGuideline);
}

function buildDebugKnowledgeUsed(basePath: string, knowledge: AnyRecord, version: string) {
  return {
    knowledgeBaseVersion: version,
    knowledgeBasePath: basePath,
    businessLine: knowledge.businessLine,
    features: knowledge.selectedFeatures.map((item: AnyRecord) => item.id),
    templates: knowledge.selectedTemplates.map((item: AnyRecord) => item.id),
    phraseGroups: knowledge.phraseGroup ? [knowledge.phraseGroup.id] : [],
    complianceRules: knowledge.complianceRules.map((item: AnyRecord) => item.id),
    rewriteRules: knowledge.rewriteRules.map((item: AnyRecord) => item.id),
    riskDisclaimers: toArray(knowledge.riskDisclaimers?.requiredTexts).length,
    platformRules: knowledge.platformRules.map((item: AnyRecord) => item.id),
    visualGuidelines: knowledge.visualGuidelines.map((item: AnyRecord) => item.id),
  };
}

export function retrieveKnowledge(input: KnowledgeInput = {}, options: KnowledgeOptions = {}) {
  const kb = loadKnowledgeBase(options);
  const businessLine = resolveBusinessLine(input);
  const contentTypeCandidates = getContentTypeCandidates(input.contentType);
  const purpose = normalizeText(input.task || input.promptTask || "");
  const selectedFeatures = selectFeatures(kb.productFeatures, input, contentTypeCandidates, businessLine);
  const selectedTemplates = selectTemplates(kb.contentTemplates, input, contentTypeCandidates, businessLine);
  const phraseGroup = selectPhraseGroup(kb.phraseLibrary, input, contentTypeCandidates, businessLine);
  const complianceRules = selectComplianceRules(kb.complianceRules, input, contentTypeCandidates);
  const rewriteRules = selectRewriteRules(kb.rewriteRules, complianceRules, options);
  const brandVoice = pruneBrandVoice(kb.brandVoiceItems, input, businessLine);
  const riskDisclaimers = selectRiskDisclaimers(kb.riskDisclaimers, input, contentTypeCandidates, businessLine);
  const platformRules = selectPlatformRules(kb.platformRules, input, contentTypeCandidates, purpose);
  const visualGuidelines = purpose.includes("cover") ? selectVisualGuidelines(kb.visualGuidelines, businessLine) : [];
  const knowledge = {
    businessLine,
    brandVoice,
    selectedFeatures,
    selectedTemplates,
    phraseGroup,
    complianceRules,
    rewriteRules,
    riskDisclaimers,
    platformRules,
    visualGuidelines,
  };

  return {
    ...knowledge,
    debugKnowledgeUsed: buildDebugKnowledgeUsed(kb.basePath, knowledge, kb.index.version || "3.3"),
  };
}

export function buildKnowledgeBaseListView(options: KnowledgeOptions = {}) {
  const kb = loadKnowledgeBase(options);
  const features = kb.productFeatures.map((feature: AnyRecord) => ({
    id: feature.id,
    businessLine: feature.businessLine || "all",
    name: feature.name,
    summary: feature.summary || "",
    aliases: toArray(feature.aliases),
    scenarios: toArray(feature.useCases),
    recommendedPhrases: toArray(feature.softInsertPhrases),
    complianceTaboo: toArray(feature.forbiddenClaims),
    suitableContentTypes: toArray(feature.suitableContentTypes),
    suitableUserSegments: toArray(feature.suitableUserSegments),
    priority: feature.priority || 0,
    sourceFile: "product-features.json",
  }));

  const complianceRules = kb.complianceRules.map((rule: AnyRecord) => [rule.riskType, rule.description].filter(Boolean).join("：") || rule.id);
  const scripts = kb.phraseLibrary.reduce((acc: Record<string, unknown>, group: AnyRecord) => {
    const contentType = group.contentType || "general";
    acc[contentType] = {
      id: group.id,
      titles: toArray(group.safeOpeningHooks),
      templates: [...toArray(group.painPointPhrases), ...toArray(group.solutionPhrases), ...toArray(group.conversionPhrases), ...toArray(group.riskReminderPhrases)],
      phrasesToAvoid: toArray(group.phrasesToAvoid),
    };
    return acc;
  }, {});

  const contentGuide = kb.contentTemplates
    .map((template: AnyRecord) => [
      `### ${template.name || template.id}`,
      `适用内容类型：${toArray(template.bestForContentTypes).join("、")}`,
      `适用人群：${toArray(template.suitableUserSegments).join("、")}`,
      `情绪钩子：${toArray(template.emotionalHook).join("、")}`,
      `正文结构：${toArray(template.bodyStructure).join(" -> ")}`,
      `风险提示：${toArray(template.riskNotes).join("、")}`,
    ].filter(Boolean).join("\n"))
    .join("\n\n");

  return {
    source: "ai-json",
    knowledgeBaseVersion: kb.index.version || "3.3",
    knowledgeBasePath: kb.basePath,
    legacyMarkdownMode: "compatibility-only",
    features,
    complianceRules,
    scripts,
    contentGuide,
    productIntro: kb.brandVoiceItems[0]?.positioning || "",
    jsonKb: {
      brandVoice: kb.brandVoiceItems,
      productFeatures: kb.productFeatures,
      contentTemplates: kb.contentTemplates,
      phraseLibrary: kb.phraseLibrary,
      complianceRules: kb.complianceRules,
      rewriteRules: kb.rewriteRules,
      riskDisclaimers: kb.riskDisclaimers,
      platformRules: kb.platformRules,
      visualGuidelines: kb.visualGuidelines,
      audienceProfiles: kb.audienceProfiles,
    },
    counts: {
      features: kb.productFeatures.length,
      templates: kb.contentTemplates.length,
      phraseGroups: kb.phraseLibrary.length,
      complianceRules: kb.complianceRules.length,
      rewriteRules: kb.rewriteRules.length,
      riskDisclaimers: toArray(kb.riskDisclaimers.items).length,
      platformRules: kb.platformRules.length,
      visualGuidelines: kb.visualGuidelines.length,
      audienceProfiles: kb.audienceProfiles.length,
    },
  };
}
