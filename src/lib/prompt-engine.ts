import fs from "node:fs";
import path from "node:path";
import { retrieveKnowledge } from "@/lib/knowledge-retriever";
import { formatEmbedLevelForPrompt } from "@/lib/embed-level";
import { buildBusinessLineRuntimeLock, resolveBrandName } from "@/lib/business-line-prompt";
import { formatContentLengthForPrompt, normalizeContentLength } from "@/lib/licaitong-workflow";
import { buildPersonaContentPrompt, isPersonasLibraryAvailable } from "@/lib/persona-loader";
import {
  formatTopicMaterialsForPrompt,
  getPrimaryMaterialTitle,
  resolvePromptMaterials,
} from "@/lib/topic-materials";

type AnyRecord = Record<string, any>;

const PROMPT_DIR = path.join(process.cwd(), "prompts");

function readPromptTemplate(name: string) {
  return fs.readFileSync(path.join(PROMPT_DIR, name), "utf8");
}

function stringifyForPrompt(value: unknown) {
  if (value === undefined || value === null || value === "") return "未提供";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function replaceTemplate(template: string, variables: AnyRecord) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in variables)) return match;
    return stringifyForPrompt(variables[key]);
  });
}

function buildSystemPrompt(knowledge: AnyRecord) {
  const template = readPromptTemplate("system.md");
  const line = normalizeText(knowledge.businessLine || "weisec");
  const brandName = line === "licaitong" ? "腾讯理财通" : "腾讯微证券";
  return replaceTemplate(template, { brandName });
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function buildPrompt(templateName: string, input: AnyRecord, taskName: string, variablesBuilder: (input: AnyRecord, knowledge: AnyRecord) => AnyRecord) {
  const knowledge = retrieveKnowledge({ ...input, promptTask: taskName }, input.knowledgeOptions || {});
  const systemPrompt = buildSystemPrompt(knowledge);
  const taskTemplate = readPromptTemplate(templateName);
  const variables = variablesBuilder(input, knowledge);
  const taskPrompt = replaceTemplate(taskTemplate, {
    ...variables,
    brandVoice: knowledge.brandVoice,
    selectedFeatures: knowledge.selectedFeatures,
    selectedTemplates: knowledge.selectedTemplates,
    phraseGroup: knowledge.phraseGroup,
    complianceRules: knowledge.complianceRules,
    rewriteRules: knowledge.rewriteRules,
    riskDisclaimers: knowledge.riskDisclaimers,
    platformRules: knowledge.platformRules,
    visualGuidelines: knowledge.visualGuidelines,
    businessLine: knowledge.businessLine,
    debugKnowledgeUsed: knowledge.debugKnowledgeUsed,
  });

  return {
    system: systemPrompt,
    user: taskPrompt,
    prompt: `${systemPrompt}\n\n${taskPrompt}`,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: taskPrompt },
    ],
    knowledge,
    debugKnowledgeUsed: knowledge.debugKnowledgeUsed,
  };
}

function clampGenerateCount(value: unknown) {
  const count = Number(value);
  if (!Number.isFinite(count)) return 3;
  return Math.min(5, Math.max(1, Math.round(count)));
}

export function buildCreativeAnglesPrompt(input: AnyRecord = {}) {
  const generateCount = clampGenerateCount(input.generateCount);
  const materials = resolvePromptMaterials(input);
  const topicMaterialsText = formatTopicMaterialsForPrompt(materials);
  const primaryHotspot = getPrimaryMaterialTitle(materials);
  return buildPrompt("creative-angles.md", input, "creative-angles", (data) => ({
    contentType: data.contentType || "brand-seed",
    topic: primaryHotspot || data.topic || data.hotspot || "未提供",
    targetUser: data.targetUser || "投资小白",
    campaignGoal: data.campaignGoal || "内容种草和功能认知",
    embedLevel: formatEmbedLevelForPrompt(data.embedLevel || "low"),
    bloggerLevel: data.bloggerLevel || "middle",
    customRequirement: data.customRequirement || data.customPrompt || "无",
    topicMaterials: topicMaterialsText,
    generateCount,
  }));
}

export function buildContentGenerationPrompt(input: AnyRecord = {}) {
  const generationMode = input.generationMode || "image-text";
  const contentLength = normalizeContentLength(input.contentLength || input.length, generationMode);
  const lengthHint = formatContentLengthForPrompt(contentLength, generationMode);
  const built = buildPrompt("content-generation.md", input, "content-generation", (data, knowledge) => ({
    contentType: data.contentType || "brand-seed",
    generationMode,
    length: lengthHint,
    bloggerLevel: data.bloggerLevel || "middle",
    embedLevel: formatEmbedLevelForPrompt(data.embedLevel || "low"),
    topic: data.topic || data.hotspot || "未提供",
    customRequirement: data.customRequirement || data.customPrompt || "无",
    selectedAngle: data.selectedAngle || data.angle || "未提供，请基于主题生成一个保守安全的单一角度",
    selectedTemplate: data.selectedTemplate || knowledge.selectedTemplates[0] || null,
    topicMaterials: data.topicMaterials || data.materials || [],
  }));
  const businessLine = built.knowledge?.businessLine || input.businessLine || "weisec";
  const runtimeLock = buildBusinessLineRuntimeLock(businessLine, built.knowledge?.brandVoice, input.embedLevel);
  const user = `${built.user}\n\n${runtimeLock}`;
  return {
    ...built,
    user,
    prompt: `${built.system}\n\n${user}`,
    messages: [
      { role: "system", content: built.system },
      { role: "user", content: user },
    ],
  };
}

export function buildComplianceReviewPrompt(input: AnyRecord = {}) {
  return buildPrompt("compliance-review.md", input, "compliance-review", (data) => ({
    generatedContent: data.generatedContent || data.content || "未提供",
  }));
}

export function buildCoverSuggestionsPrompt(input: AnyRecord = {}) {
  return buildPrompt("cover-suggestions.md", input, "cover-suggestions", (data, knowledge) => ({
    generatedContent: data.generatedContent || data.content || "未提供",
    selectedTemplate: data.selectedTemplate || knowledge.selectedTemplates[0] || null,
  }));
}

export function buildPersonaContentGenerationPrompt(input: AnyRecord = {}) {
  const personaId = dataPersonaId(input);
  if (!personaId) throw new Error("personaContent 需要 personaId");

  if (!isPersonasLibraryAvailable()) {
    console.warn("[prompt-engine] L4 人设库缺失，personaContent 降级为 contentGeneration");
    return buildContentGenerationPrompt(input);
  }

  const generationMode = input.generationMode || "image-text";
  const contentLength = normalizeContentLength(input.contentLength || input.length, generationMode);
  const lengthHint = formatContentLengthForPrompt(contentLength, generationMode);

  const knowledge = retrieveKnowledge({ ...input, promptTask: "content-generation" }, input.knowledgeOptions || {});
  const businessLine = knowledge.businessLine || input.businessLine || "weisec";
  const runtimeLock = buildBusinessLineRuntimeLock(businessLine, knowledge.brandVoice, input.embedLevel);

  const personaPrompt = buildPersonaContentPrompt(
    personaId,
    {
      contentType: input.contentType || "brand-seed",
      topic: input.topic || input.hotspot || "未提供",
      targetUser: input.targetUser || "投资小白",
      contentLength: lengthHint,
      generationMode,
      businessLine: resolveBrandName(businessLine),
      selectedAngle: input.selectedAngle || input.angle || "未提供",
      embedLevel: formatEmbedLevelForPrompt(input.embedLevel || "low"),
      customRequirement: input.customRequirement || input.customPrompt || "无",
      topicMaterials: input.topicMaterials || input.materials || [],
      selectedFeatures: knowledge.selectedFeatures,
      selectedTemplate: knowledge.selectedTemplates[0] || null,
      phraseGroup: knowledge.phraseGroup,
      brandVoice: knowledge.brandVoice,
      complianceRules: knowledge.complianceRules,
      riskDisclaimers: knowledge.riskDisclaimers,
      platformRules: knowledge.platformRules,
      debugKnowledgeUsed: knowledge.debugKnowledgeUsed,
    },
    input.personaVariant,
    businessLine === "licaitong" ? "licaitong" : "weisec",
  );

  const globalSystem = buildSystemPrompt(knowledge);
  const personaSystem = `${personaPrompt.system}\n\n${runtimeLock}`;
  const personaUser = `${personaPrompt.user}\n\n${runtimeLock}`;
  return {
    ...personaPrompt,
    system: `${globalSystem}\n\n${personaSystem}`,
    prompt: `${globalSystem}\n\n${personaSystem}\n\n${personaUser}`,
    messages: [
      { role: "system", content: `${globalSystem}\n\n${personaSystem}` },
      { role: "user", content: personaUser },
    ],
    knowledge,
    debugKnowledgeUsed: knowledge.debugKnowledgeUsed,
  };
}

function dataPersonaId(input: AnyRecord) {
  return String(input.personaId || "").trim() || "";
}
