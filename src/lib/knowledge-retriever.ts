import fs from "node:fs";
import path from "node:path";
import { buildWorkflowConfig, mergeWorkflowConfig } from "@/lib/business-line-workflow-config";
import {
  FALLBACK_LICAITONG_WORKFLOW,
  FALLBACK_WEISEC_WORKFLOW,
} from "@/lib/business-line-workflow";
import { normalizeBusinessLine, resolveKbTargetUser } from "@/lib/business-line";
import {
  normalizeEmbedLevel,
  resolveFeatureInjectionLimit,
  shouldIncludeStrongInsertPhrases,
} from "@/lib/embed-level";
import {
  buildHotspotCoveragePlan,
  collectAngleGenerationRetrievalTerms,
  collectMaterialRetrievalTerms,
} from "@/lib/topic-materials";
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
  offerId?: string;
  creationScene?: string;
  materials?: Array<{ title?: string; body?: string; source?: string; isPrimary?: boolean; selected?: boolean }>;
  topicMaterials?: Array<{ title?: string; body?: string; source?: string; isPrimary?: boolean; selected?: boolean }>;
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
    path.join(process.cwd(), "ai-knowledge-base-v5.0"),
    path.join(process.cwd(), "ai-knowledge-base-v4.0"),
    path.join(process.cwd(), "ai-knowledge-base-v3.3"),
    path.join(process.cwd(), "ai-knowledge-base-v3.2"),
  ].filter(Boolean) as string[];

  const resolved = candidates.find((candidate) => fs.existsSync(path.join(candidate, "index.json")));
  if (!resolved) {
    throw new Error(`未找到知识库目录。已尝试：${candidates.join(" | ")}`);
  }
  return resolved;
}

function isV5KnowledgeBase(index: AnyRecord) {
  return (
    String(index.version || "").startsWith("5") ||
    index.architecture === "single-kb-multi-layer-multi-folder"
  );
}

type KbBusinessLine = "licaitong" | "weisec";

function resolveIndexFilePath(
  index: AnyRecord,
  key: string,
  line?: KbBusinessLine | "shared",
): string | null {
  const mapped = index?.files?.[key];
  if (typeof mapped === "string" && mapped) return mapped.replace(/\\/g, "/");
  if (mapped && typeof mapped === "object" && line) {
    const relative = mapped[line];
    return typeof relative === "string" && relative ? relative.replace(/\\/g, "/") : null;
  }
  return null;
}

function extractItems(doc: AnyRecord | null | undefined) {
  if (!doc) return [] as AnyRecord[];
  return Array.isArray(doc.items) ? (doc.items as AnyRecord[]) : [];
}

function normalizeBrandVoiceDoc(doc: AnyRecord, fallbackLine: KbBusinessLine) {
  if (extractItems(doc).length) {
    return extractItems(doc).map((item) => ({
      ...item,
      businessLine: item.businessLine || fallbackLine,
    }));
  }
  if (doc.brand || doc.positioning) {
    return [{ id: `brand_voice_${fallbackLine}`, businessLine: fallbackLine, ...doc }];
  }
  return [] as AnyRecord[];
}

function normalizeVisualGuidelinesDoc(doc: AnyRecord) {
  return extractItems(doc);
}

interface LineKnowledgeBundle {
  brandVoiceItems: AnyRecord[];
  productFeatures: AnyRecord[];
  contentTemplates: AnyRecord[];
  phraseLibrary: AnyRecord[];
  visualGuidelines: AnyRecord[];
  targetReaders: AnyRecord[];
  personaOptions: AnyRecord[];
  riskDisclaimersExtra: AnyRecord[];
}

function readKbDoc(basePath: string, relativePath: string | null, fallback: AnyRecord = {}) {
  if (!relativePath) return fallback;
  return readJson(basePath, relativePath, fallback);
}

function resolveSharedFilePath(index: AnyRecord, key: string) {
  return resolveIndexFilePath(index, key) || resolveIndexFilePath(index, key, "shared");
}

function loadV5LineBundle(basePath: string, index: AnyRecord, line: KbBusinessLine): LineKnowledgeBundle {
  const brandVoiceDoc = readKbDoc(basePath, resolveIndexFilePath(index, "brandVoice", line), {});
  const productDoc = readKbDoc(basePath, resolveIndexFilePath(index, "productFeatures", line), { items: [] });
  const templatesDoc = readKbDoc(basePath, resolveIndexFilePath(index, "contentTemplates", line), { items: [] });
  const phraseDoc = readKbDoc(basePath, resolveIndexFilePath(index, "phraseLibrary", line), { items: [] });
  const visualDoc = readKbDoc(basePath, resolveIndexFilePath(index, "visualGuidelines", line), { items: [] });
  const readersDoc = readKbDoc(
    basePath,
    resolveIndexFilePath(index, "targetReaders", line) || resolveIndexFilePath(index, "audienceProfiles", line),
    { items: [] },
  );
  const personaDoc = readKbDoc(basePath, resolveIndexFilePath(index, "personaOptions", line), { items: [] });
  const riskLineDoc = readKbDoc(basePath, resolveIndexFilePath(index, "riskDisclaimers", line), { items: [] });

  return {
    brandVoiceItems: normalizeBrandVoiceDoc(brandVoiceDoc, line),
    productFeatures: extractItems(productDoc),
    contentTemplates: extractItems(templatesDoc),
    phraseLibrary: extractItems(phraseDoc),
    visualGuidelines: normalizeVisualGuidelinesDoc(visualDoc),
    targetReaders: extractItems(readersDoc),
    personaOptions: extractItems(personaDoc),
    riskDisclaimersExtra: extractItems(riskLineDoc),
  };
}

function loadV5KnowledgeBase(basePath: string, index: AnyRecord) {
  const lineBundles: Record<KbBusinessLine, LineKnowledgeBundle> = {
    licaitong: loadV5LineBundle(basePath, index, "licaitong"),
    weisec: loadV5LineBundle(basePath, index, "weisec"),
  };

  const complianceRules = extractItems(readKbDoc(basePath, resolveSharedFilePath(index, "complianceRules"), { items: [] }));
  const rewriteRules = extractItems(readKbDoc(basePath, resolveSharedFilePath(index, "rewriteRules"), { items: [] }));
  const platformRules = extractItems(readKbDoc(basePath, resolveSharedFilePath(index, "platformRules"), { items: [] }));
  const riskDisclaimersShared = readKbDoc(basePath, resolveIndexFilePath(index, "riskDisclaimers", "shared"), {
    items: [],
    globalRiskReminder: "",
  });

  const offerPackPath =
    typeof index?.files?.offerPackFixedIncomePlus === "string" ? index.files.offerPackFixedIncomePlus : null;
  const offerPackFixedIncomePlus = extractItems(
    offerPackPath ? readKbDoc(basePath, offerPackPath, { items: [] }) : { items: [] },
  );

  const brandVoiceItems = [...lineBundles.licaitong.brandVoiceItems, ...lineBundles.weisec.brandVoiceItems];
  const productFeatures = [...lineBundles.licaitong.productFeatures, ...lineBundles.weisec.productFeatures];
  const contentTemplates = [...lineBundles.licaitong.contentTemplates, ...lineBundles.weisec.contentTemplates];
  const phraseLibrary = [...lineBundles.licaitong.phraseLibrary, ...lineBundles.weisec.phraseLibrary];
  const visualGuidelines = [...lineBundles.licaitong.visualGuidelines, ...lineBundles.weisec.visualGuidelines];
  const audienceProfiles = [...lineBundles.licaitong.targetReaders, ...lineBundles.weisec.targetReaders];
  const personaOptions = [...lineBundles.licaitong.personaOptions, ...lineBundles.weisec.personaOptions];

  return {
    basePath,
    index,
    isV5: true,
    lineBundles,
    riskDisclaimersShared,
    defaultBusinessLine: index.businessLineFolders ? "weisec" : "weisec",
    brandVoiceItems,
    productFeatures,
    contentTemplates,
    phraseLibrary,
    complianceRules,
    rewriteRules,
    riskDisclaimers: riskDisclaimersShared,
    platformRules,
    visualGuidelines,
    audienceProfiles,
    personaOptions,
    offerPackFixedIncomePlus,
  };
}

function loadV4KnowledgeBase(basePath: string, index: AnyRecord) {
  const brandVoiceRaw = readKbJson(basePath, index, "brandVoice", "brand-voice.json");
  const brandVoiceItems = brandVoiceRaw.items
    ? brandVoiceRaw.items
    : [{ id: "brand_voice_legacy", businessLine: "weisec", ...brandVoiceRaw }];
  return {
    basePath,
    index,
    isV5: false,
    lineBundles: undefined as Record<KbBusinessLine, LineKnowledgeBundle> | undefined,
    riskDisclaimersShared: undefined as AnyRecord | undefined,
    defaultBusinessLine: brandVoiceRaw.defaultBusinessLine || "weisec",
    brandVoiceItems,
    productFeatures: readKbJson(basePath, index, "productFeatures", "product-features.json", { items: [] }).items || [],
    contentTemplates: readKbJson(basePath, index, "contentTemplates", "content-templates.json", { items: [] }).items || [],
    phraseLibrary: readKbJson(basePath, index, "phraseLibrary", "phrase-library.json", { items: [] }).items || [],
    complianceRules: readKbJson(basePath, index, "complianceRules", "compliance-rules.json", { items: [] }).items || [],
    rewriteRules: readKbJson(basePath, index, "rewriteRules", "compliance-rewrite-rules.cleaned.json", { items: [] }).items || [],
    riskDisclaimers: readKbJson(basePath, index, "riskDisclaimers", "risk-disclaimers.json", {
      items: [],
      globalRiskReminder: "",
    }),
    platformRules: readKbJson(basePath, index, "platformRules", "platform-rules.json", { items: [] }).items || [],
    visualGuidelines: readKbJson(basePath, index, "visualGuidelines", "visual-guidelines.json", { items: [] }).items || [],
    audienceProfiles: readKbJson(basePath, index, "audienceProfiles", "audience-profiles.json", { items: [] }).items || [],
    personaOptions: [] as AnyRecord[],
    offerPackFixedIncomePlus: readKbJson(
      basePath,
      index,
      "offerPackFixedIncomePlus",
      "layers/L2-product/offer-packs/fixed-income-plus.json",
      { items: [] },
    ).items || [],
  };
}

function resolveBusinessLineKey(businessLine: string): KbBusinessLine {
  return businessLine === "licaitong" ? "licaitong" : "weisec";
}

function getScopedKnowledge(kb: ReturnType<typeof loadKnowledgeBase>, businessLine: string) {
  const lineKey = resolveBusinessLineKey(businessLine);
  if (kb.isV5 && kb.lineBundles) {
    const bundle = kb.lineBundles[lineKey];
    const sharedRiskItems = toArray(kb.riskDisclaimersShared?.items) as AnyRecord[];
    return {
      brandVoiceItems: bundle.brandVoiceItems.length ? bundle.brandVoiceItems : kb.brandVoiceItems,
      productFeatures: bundle.productFeatures,
      contentTemplates: bundle.contentTemplates,
      phraseLibrary: bundle.phraseLibrary,
      visualGuidelines: bundle.visualGuidelines,
      audienceProfiles: bundle.targetReaders,
      personaOptions: bundle.personaOptions,
      complianceRules: kb.complianceRules,
      rewriteRules: kb.rewriteRules,
      platformRules: kb.platformRules,
      offerPackFixedIncomePlus: kb.offerPackFixedIncomePlus,
      riskDisclaimers: {
        globalRiskReminder: kb.riskDisclaimersShared?.globalRiskReminder || "市场有风险，投资需谨慎。",
        items: [...sharedRiskItems, ...bundle.riskDisclaimersExtra],
      },
    };
  }
  return {
    brandVoiceItems: kb.brandVoiceItems,
    productFeatures: kb.productFeatures,
    contentTemplates: kb.contentTemplates,
    phraseLibrary: kb.phraseLibrary,
    visualGuidelines: kb.visualGuidelines,
    audienceProfiles: kb.audienceProfiles,
    personaOptions: kb.personaOptions,
    complianceRules: kb.complianceRules,
    rewriteRules: kb.rewriteRules,
    platformRules: kb.platformRules,
    offerPackFixedIncomePlus: kb.offerPackFixedIncomePlus,
    riskDisclaimers: kb.riskDisclaimers,
  };
}

function resolveKbFile(basePath: string, index: AnyRecord, key: string, fallbackFile: string) {
  const mapped = index?.files?.[key];
  const relative = typeof mapped === "string" && mapped ? mapped : fallbackFile;
  return relative.replace(/\\/g, "/");
}

function readKbJson(basePath: string, index: AnyRecord, key: string, fallbackFile: string, fallback: AnyRecord = {}) {
  const fileName = resolveKbFile(basePath, index, key, fallbackFile);
  return readJson(basePath, fileName, fallback);
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
  const index = readJson(basePath, "index.json");
  if (isV5KnowledgeBase(index)) {
    return loadV5KnowledgeBase(basePath, index);
  }
  return loadV4KnowledgeBase(basePath, index);
}

function resolveRetrievalFeatures(scoped: ReturnType<typeof getScopedKnowledge>, input: KnowledgeInput) {
  const offerId = normalizeText(input.offerId || "");
  const useOfferPack = offerId === "fixed-income-plus" || offerId === "fixed_income_plus";
  if (useOfferPack && scoped.offerPackFixedIncomePlus.length) {
    return scoped.offerPackFixedIncomePlus;
  }
  if (useOfferPack) {
    return scoped.productFeatures.filter((feature: AnyRecord) =>
      toArray(feature.campaignTags).includes("fixed-income-plus"),
    );
  }
  return scoped.productFeatures;
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
  const materialTerms = collectMaterialRetrievalTerms(input.materials || input.topicMaterials);
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
  const creationScene = normalizeText(input.creationScene || "");
  if (creationScene && toArray(feature.suitableCreationScenes).includes(creationScene)) score += 25;
  if (scoreTextMatches(feature.suitableUserSegments, [targetUser], 12)) score += 12;
  score += scoreTextMatches([feature.aliases, feature.userPainPoints, feature.useCases, feature.summary], [targetUser, input.topic, input.campaignGoal], 2);
  if (materialTerms.length) {
    score += scoreTextMatches(
      [feature.aliases, feature.userPainPoints, feature.useCases, feature.summary, feature.softInsertPhrases],
      materialTerms,
      5,
    );
  }
  return score;
}

function pruneFeature(feature: AnyRecord, embedLevel: string) {
  const includeStrong = shouldIncludeStrongInsertPhrases(embedLevel);
  return {
    id: feature.id,
    name: feature.name,
    summary: feature.summary,
    aliases: toArray(feature.aliases).slice(0, 5),
    suitableContentTypes: toArray(feature.suitableContentTypes),
    suitableUserSegments: toArray(feature.suitableUserSegments),
    userPainPoints: toArray(feature.userPainPoints).slice(0, 4),
    useCases: toArray(feature.useCases).slice(0, 4),
    productActions: includeStrong ? toArray(feature.productActions).slice(0, 3) : [],
    safeClaims: toArray(feature.safeClaims).slice(0, 4),
    softInsertPhrases: normalizeEmbedLevel(embedLevel) === "none" ? [] : toArray(feature.softInsertPhrases).slice(0, 3),
    strongInsertPhrases: includeStrong ? toArray(feature.strongInsertPhrases).slice(0, 2) : [],
    forbiddenClaims: toArray(feature.forbiddenClaims).slice(0, 4),
    riskNotes: toArray(feature.riskNotes).slice(0, 3),
  };
}

function selectFeatures(features: AnyRecord[], input: KnowledgeInput, contentTypeCandidates: string[], businessLine: string) {
  const embedLevel = normalizeEmbedLevel(input.embedLevel || "medium");
  const requestedFeatureIds = unique([
    ...toArray(input.featureId),
    ...toArray(input.featureIds),
    ...toArray(input.selectedFeatureIds),
    ...toArray(input.mainFeatureId),
    ...toArray(input.productFeatureId),
  ].map(String));
  const limit = resolveFeatureInjectionLimit(embedLevel, requestedFeatureIds);
  if (limit === 0) return [];

  const scored = features
    .map((feature) => ({ feature, score: scoreFeature(feature, input, contentTypeCandidates, businessLine) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const explicit = requestedFeatureIds.length
    ? requestedFeatureIds
        .map((id) => scored.find((item) => item.feature.id === id))
        .filter(Boolean)
        .map((item) => item!.feature)
    : scored.slice(0, limit).map(({ feature }) => feature);

  return explicit.slice(0, limit).map((feature) => pruneFeature(feature, embedLevel));
}

function scoreTemplate(template: AnyRecord, input: KnowledgeInput, contentTypeCandidates: string[], businessLine: string) {
  if (!matchesBusinessLine(template, businessLine)) return 0;
  const targetUser = input.targetUser || input.targetUserSegment || "";
  const materialTerms = collectMaterialRetrievalTerms(input.materials || input.topicMaterials);
  let score = 0;
  if (input.templateId && input.templateId === template.id) score += 100;
  if (toArray(template.bestForContentTypes).some((type) => contentTypeCandidates.includes(String(type)))) score += 20;
  if (scoreTextMatches(template.suitableUserSegments, [targetUser], 10)) score += 10;
  score += scoreTextMatches([template.name, template.emotionalHook, template.titlePatterns, template.coverTextPatterns, template.bodyStructure], [input.topic, input.campaignGoal, targetUser], 2);
  if (materialTerms.length) {
    score += scoreTextMatches(
      [template.name, template.emotionalHook, template.titlePatterns, template.coverTextPatterns, template.bodyStructure],
      materialTerms,
      6,
    );
    if (toArray(template.bestForContentTypes).includes("hotspot-analysis")) score += 18;
  }
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

function buildDebugKnowledgeUsed(basePath: string, knowledge: AnyRecord, version: string, materialTerms: string[] = []) {
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
    topicMaterialCount: materialTerms.length,
  };
}

export function retrieveKnowledge(input: KnowledgeInput = {}, options: KnowledgeOptions = {}) {
  const kb = loadKnowledgeBase(options);
  const businessLine = resolveBusinessLine(input);
  const scoped = getScopedKnowledge(kb, businessLine);
  const targetUserLabel = input.targetUser || input.targetUserSegment || "";
  const resolvedInput = {
    ...input,
    targetUser: targetUserLabel
      ? resolveKbTargetUser(normalizeBusinessLine(businessLine), targetUserLabel)
      : targetUserLabel,
  };
  const contentTypeCandidates = getContentTypeCandidates(resolvedInput.contentType);
  const purpose = normalizeText(resolvedInput.task || resolvedInput.promptTask || "");
  const rawMaterialTerms =
    purpose === "creative-angles"
      ? collectAngleGenerationRetrievalTerms(resolvedInput.materials || resolvedInput.topicMaterials)
      : collectMaterialRetrievalTerms(resolvedInput.materials || resolvedInput.topicMaterials);
  const materialTerms = purpose === "creative-angles" ? rawMaterialTerms : [];
  const retrievalInput = resolvedInput;
  const featurePool = resolveRetrievalFeatures(scoped, retrievalInput);
  const selectedFeatures = selectFeatures(featurePool, retrievalInput, contentTypeCandidates, businessLine);
  const selectedTemplates = selectTemplates(scoped.contentTemplates, retrievalInput, contentTypeCandidates, businessLine);
  const phraseGroup = selectPhraseGroup(scoped.phraseLibrary, retrievalInput, contentTypeCandidates, businessLine);
  const complianceRules = selectComplianceRules(scoped.complianceRules, resolvedInput, contentTypeCandidates);
  const rewriteRules = selectRewriteRules(scoped.rewriteRules, complianceRules, options);
  const brandVoice = pruneBrandVoice(scoped.brandVoiceItems, resolvedInput, businessLine);
  const riskDisclaimers = selectRiskDisclaimers(scoped.riskDisclaimers, resolvedInput, contentTypeCandidates, businessLine);
  const platformRules = selectPlatformRules(scoped.platformRules, resolvedInput, contentTypeCandidates, purpose);
  const visualGuidelines =
    purpose === "video-script-generation"
      ? []
      : /cover|content-generation|persona/.test(purpose)
        ? selectVisualGuidelines(scoped.visualGuidelines, businessLine)
        : [];
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
    debugKnowledgeUsed: buildDebugKnowledgeUsed(kb.basePath, knowledge, kb.index.version || "5.0", rawMaterialTerms),
  };
}

export function buildKnowledgeBaseListView(options: KnowledgeOptions = {}) {
  const kb = loadKnowledgeBase(options);
  const mapFeature = (feature: AnyRecord, sourceFile: string) => ({
    id: feature.id,
    businessLine: feature.businessLine || "all",
    offerId: feature.offerId,
    name: feature.name,
    summary: feature.summary || "",
    aliases: toArray(feature.aliases),
    scenarios: toArray(feature.useCases),
    recommendedPhrases: toArray(feature.softInsertPhrases),
    complianceTaboo: toArray(feature.forbiddenClaims),
    suitableContentTypes: toArray(feature.suitableContentTypes),
    suitableCreationScenes: toArray(feature.suitableCreationScenes),
    suitableUserSegments: toArray(feature.suitableUserSegments),
    priority: feature.priority || 0,
    sourceFile,
  });
  const features = [
    ...kb.productFeatures.map((feature: AnyRecord) => mapFeature(feature, "product-features.json")),
    ...kb.offerPackFixedIncomePlus.map((feature: AnyRecord) => mapFeature(feature, "offer-packs/fixed-income-plus.json")),
  ];

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

  const licaitongWorkflow = kb.isV5
    ? mergeWorkflowConfig(buildWorkflowConfig(kb, "licaitong"), FALLBACK_LICAITONG_WORKFLOW)
    : FALLBACK_LICAITONG_WORKFLOW;
  const weisecWorkflow = kb.isV5
    ? mergeWorkflowConfig(buildWorkflowConfig(kb, "weisec"), FALLBACK_WEISEC_WORKFLOW)
    : FALLBACK_WEISEC_WORKFLOW;

  return {
    source: "ai-json",
    knowledgeBaseVersion: kb.index.version || "5.0",
    knowledgeBasePath: kb.basePath,
    legacyMarkdownMode: "compatibility-only",
    licaitongWorkflow,
    weisecWorkflow,
    features,
    complianceRules,
    scripts,
    contentGuide,
    productIntro: kb.brandVoiceItems[0]?.positioning || "",
    jsonKb: {
      brandVoice: kb.brandVoiceItems,
      productFeatures: kb.productFeatures,
      offerPackFixedIncomePlus: kb.offerPackFixedIncomePlus,
      contentTemplates: kb.contentTemplates,
      phraseLibrary: kb.phraseLibrary,
      complianceRules: kb.complianceRules,
      rewriteRules: kb.rewriteRules,
      riskDisclaimers: kb.riskDisclaimers,
      platformRules: kb.platformRules,
      visualGuidelines: kb.visualGuidelines,
      audienceProfiles: kb.audienceProfiles,
      personaOptions: kb.personaOptions,
    },
    counts: {
      features: features.length,
      offerPackFeatures: kb.offerPackFixedIncomePlus.length,
      templates: kb.contentTemplates.length,
      phraseGroups: kb.phraseLibrary.length,
      complianceRules: kb.complianceRules.length,
      rewriteRules: kb.rewriteRules.length,
      riskDisclaimers: kb.isV5
        ? toArray(kb.riskDisclaimersShared?.items).length +
          Object.values(kb.lineBundles || {}).reduce(
            (sum, bundle) => sum + bundle.riskDisclaimersExtra.length,
            0,
          )
        : toArray(kb.riskDisclaimers.items).length,
      platformRules: kb.platformRules.length,
      visualGuidelines: kb.visualGuidelines.length,
      audienceProfiles: kb.audienceProfiles.length,
      personaOptions: kb.personaOptions.length,
    },
  };
}
