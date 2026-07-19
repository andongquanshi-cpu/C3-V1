import fs from "node:fs";
import path from "node:path";
import { retrieveKnowledge } from "@/lib/knowledge-retriever";
import { formatEmbedLevelForPrompt } from "@/lib/embed-level";
import { buildBusinessLineRuntimeLock, resolveBrandName } from "@/lib/business-line-prompt";
import { formatContentLengthForPrompt, normalizeContentLength } from "@/lib/licaitong-workflow";
import {
  buildPersonaContentPrompt,
  buildPersonaSystemPrompt,
  isPersonasLibraryAvailable,
  loadAudiences,
  loadPersonaStandard,
} from "@/lib/persona-loader";
import {
  formatVisualGuidelinesForPrompt,
} from "@/lib/image-prompt-utils";
import {
  buildHotspotCoveragePlan,
  buildSceneModeCoveragePlan,
  formatBackgroundMaterialsForPrompt,
  formatMaterialsForPrompt,
  formatTopicMaterialsForPrompt,
  getPrimaryMaterialTitle,
  resolvePromptMaterials,
} from "@/lib/topic-materials";
import {
  buildBriefProductRuntimeLock,
  buildEmbedAngleProductRules,
  formatBriefBusinessContext,
  resolveBriefPromptSlice,
} from "@/lib/brief-prompt-context";
import {
  buildCreationSceneAngleRules,
  buildCreationSceneContentRules,
} from "@/lib/creation-scene-prompt";
import { isHotspotLinkedBrief } from "@/lib/material-prompt-routing";
import {
  formatVideoScriptModulesForPrompt,
  resolveVideoScriptModules,
} from "@/lib/video-script-routing";
import { formatVideoRiskReminderGuide } from "@/lib/risk-reminder";
import {
  formatTagStrategyForPrompt,
  formatXhsContentMethodologyForPrompt,
} from "@/lib/viral-methodology";
import {
  ANGLE_AXES,
  formatCoordinateForPrompt,
  type AngleCoordinate,
} from "@/lib/creative/angle-axes";

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

function buildCreativeAngleL4Context(input: AnyRecord, businessLine: string) {
  const line = businessLine === "licaitong" ? "licaitong" : "weisec";
  const audienceTag = String(input.audienceTag || "").trim();
  const targetUser = String(input.targetUser || "").trim();
  const personaId = String(input.personaId || "").trim();
  const creationScene = String(input.creationScene || "").trim();

  const audiences = loadAudiences();
  const audience = audiences.find(
    (item) =>
      item.businessLine === line &&
      (item.id === audienceTag || item.name === targetUser || item.kbMatchName === targetUser),
  );

  let persona: AnyRecord | null = null;
  if (personaId && isPersonasLibraryAvailable(line)) {
    try {
      const standard = loadPersonaStandard(personaId, line);
      const sceneAdaptation = creationScene ? standard.sceneAdaptation?.[creationScene] : undefined;
      persona = {
        id: standard.id,
        label: standard.label,
        summary: standard.summary,
        contentArchetype: standard.contentArchetypeLabel || standard.contentArchetype,
        identityTags: standard.identity?.tags,
        targetAudience: standard.identity?.targetAudience,
        tone: standard.style?.tone,
        perspective: standard.style?.perspective,
        titleStyle: standard.style?.titleStyle,
        coreAngle: standard.differentiation?.coreAngle,
        openingHookPatterns: standard.differentiation?.openingHookPatterns?.slice(0, 3),
        productImplantStyle: standard.differentiation?.productImplantStyle,
        forbiddenVoice: standard.differentiation?.forbiddenVoice,
        antiHomogeneity: standard.antiHomogeneity
          ? {
              neverUse: standard.antiHomogeneity.neverUse?.slice(0, 6),
              neverSoundLike: standard.antiHomogeneity.neverSoundLike?.slice(0, 4),
              mandatoryMarkers: standard.antiHomogeneity.mandatoryMarkers?.slice(0, 4),
            }
          : undefined,
        sceneAdaptation,
      };
    } catch {
      persona = null;
    }
  }

  return {
    targetReader: audience
      ? {
          id: audience.id,
          name: audience.name,
          promptSummary: audience.promptSummary,
          painPoints: audience.painPoints?.slice(0, 4),
          infoHabits: audience.infoHabits?.slice(0, 3),
          tone: audience.tone,
          safeExpressions: audience.safeExpressions?.slice(0, 3),
          forbiddenExpressions: audience.forbiddenExpressions?.slice(0, 4),
        }
      : targetUser
        ? { name: targetUser }
        : null,
    persona,
  };
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
    visualGuidelines: taskName === "video-script-generation" ? "不适用（视频脚本不接生图）" : knowledge.visualGuidelines,
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
  if (!Number.isFinite(count)) return 6;
  return Math.min(6, Math.max(1, Math.round(count)));
}

function buildDiversityAxisPlan(coords: AngleCoordinate[] | undefined, count: number): string {
  if (!coords?.length) return "本次未提供结构化坐标，须自行保证角度间至少两个维度不同。";
  return coords
    .slice(0, count)
    .map((coord, index) => `【角度 ${index + 1} 的创意坐标】\n${formatCoordinateForPrompt(coord, ANGLE_AXES)}`)
    .join("\n\n");
}

export function buildCreativeAnglesPrompt(input: AnyRecord = {}) {
  const generateCount = clampGenerateCount(input.generateCount);
  const diversityAxisPlan = buildDiversityAxisPlan(input.angleCoordinates, generateCount);
  const hotspotLinked =
    input.hotspotLinked !== undefined
      ? Boolean(input.hotspotLinked)
      : isHotspotLinkedBrief(input, input.workflowConfig);
  const allMaterials = resolvePromptMaterials(input);
  const materials = hotspotLinked
    ? allMaterials
    : allMaterials.filter((item) => !item.source || item.source === "手动输入");
  const topicMaterialsText = hotspotLinked
    ? formatTopicMaterialsForPrompt(materials)
    : formatBackgroundMaterialsForPrompt(materials);
  const primaryHotspot = hotspotLinked ? getPrimaryMaterialTitle(materials) : "无（场景创作模式，不以新闻为主线）";
  const hotspotCoveragePlan = hotspotLinked
    ? buildHotspotCoveragePlan(materials, generateCount)
    : buildSceneModeCoveragePlan(generateCount, materials.length > 0);
  return buildPrompt("creative-angles.md", input, "creative-angles", (data, knowledge) => ({
    ...buildBriefPromptFields(data),
    creationSceneRules: buildCreationSceneAngleRules(
      (knowledge.businessLine || data.businessLine || "weisec") as "weisec" | "licaitong",
      data.creationScene,
      data.workflowConfig,
      data.embedLevel,
    ),
    contentType: data.contentType || "brand-seed",
    topic: data.topic || data.hotspot || "未提供",
    primaryHotspotReference: primaryHotspot || "无",
    materialModeHint: hotspotLinked
      ? "热点解读模式：已选热点是选题主线，每个角度都必须挂钩热点素材；用户主题决定「怎么聊」，不是「聊别的」。"
      : "场景创作模式：角度必须围绕主题与创作场景，不得做新闻解读；背景补充仅可一句带过。",
    targetUser: data.targetUser || "投资小白",
    campaignGoal: data.campaignGoal || "内容种草和功能认知",
    embedLevel: formatEmbedLevelForPrompt(data.embedLevel || "medium"),
    bloggerLevel: data.bloggerLevel || "middle",
    customRequirement: data.customRequirement || data.customPrompt || "无",
    topicMaterials: topicMaterialsText,
    hotspotCoveragePlan,
    personaContext: buildCreativeAngleL4Context(data, knowledge.businessLine || data.businessLine || "weisec"),
    avoidRecentAngles: data.avoidRecentAngles || [],
    diversityAxisPlan,
    diversitySeed: data.diversitySeed || "default",
    generateCount,
  }));
}

function isVideoScriptMode(input: AnyRecord) {
  return (input.generationMode || "image-text") === "video-script";
}

function buildVideoScriptVariables(data: AnyRecord, knowledge: AnyRecord) {
  const generationMode = "video-script";
  const contentLength = normalizeContentLength(data.contentLength || data.length, generationMode);
  const lengthHint = formatContentLengthForPrompt(contentLength, generationMode);
  const selectedAngle = data.selectedAngle || data.angle;
  const materialFields = resolveContentMaterialFields(data);
  const modules = resolveVideoScriptModules({
    campaignGoal: data.campaignGoal,
    contentLength,
    selectedAngle,
  });
  return {
    ...materialFields,
    contentType: data.contentType || "brand-seed",
    generationMode,
    length: lengthHint,
    campaignGoal: data.campaignGoal || "内容种草和功能认知",
    bloggerLevel: data.bloggerLevel || "middle",
    embedLevel: formatEmbedLevelForPrompt(data.embedLevel || "medium"),
    topic: data.topic || data.hotspot || "未提供",
    customRequirement: data.customRequirement || data.customPrompt || "无",
    selectedAngle: selectedAngle || "未提供，请基于主题生成一个保守安全的单一角度",
    selectedTemplate: data.selectedTemplate || knowledge.selectedTemplates[0] || null,
    viralMethodology: formatVideoScriptModulesForPrompt(modules, selectedAngle),
    tagStrategy: formatTagStrategyForPrompt({
      businessLine: knowledge.businessLine || data.businessLine,
      offerId: data.offerId,
      selectedFeatureIds: data.selectedFeatureIds,
      embedLevel: data.embedLevel,
    }),
    videoRiskReminderGuide: formatVideoRiskReminderGuide(
      knowledge.riskDisclaimers,
      String(
        (selectedAngle as { angleId?: string })?.angleId ||
          data.diversitySeed ||
          data.topic ||
          "video",
      ),
    ),
  };
}

function appendBriefLocks(user: string, input: AnyRecord) {
  const slice = resolveBriefPromptSlice(input, input.workflowConfig);
  const briefLock = buildBriefProductRuntimeLock(slice, input.embedLevel);
  if (!briefLock) return user;
  return `${user}\n\n${briefLock}`;
}

function buildBriefPromptFields(input: AnyRecord) {
  const slice = resolveBriefPromptSlice(input, input.workflowConfig);
  return {
    briefBusinessContext: formatBriefBusinessContext(slice, input.embedLevel),
    embedAngleProductRules: buildEmbedAngleProductRules(input.embedLevel, slice),
  };
}

function buildRuntimeNarrativeOptions(input: AnyRecord) {
  return {
    creationScene: input.creationScene,
    personaId: input.personaId,
  };
}

function finalizePromptWithRuntimeLock(built: ReturnType<typeof buildPrompt>, input: AnyRecord) {
  const businessLine = built.knowledge?.businessLine || input.businessLine || "weisec";
  const generationMode = input.generationMode || "image-text";
  const runtimeLock = buildBusinessLineRuntimeLock(
    businessLine,
    built.knowledge?.brandVoice,
    input.embedLevel,
    generationMode,
    buildRuntimeNarrativeOptions(input),
  );
  const user = appendBriefLocks(`${built.user}\n\n${runtimeLock}`, input);
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

function resolveHotspotLinked(input: AnyRecord) {
  return input.hotspotLinked !== undefined
    ? Boolean(input.hotspotLinked)
    : isHotspotLinkedBrief(input, input.workflowConfig);
}

function resolveContentMaterialFields(input: AnyRecord) {
  const hotspotLinked = resolveHotspotLinked(input);
  const allMaterials = resolvePromptMaterials(input);
  const materials = hotspotLinked
    ? allMaterials
    : allMaterials.filter((item) => !item.source || item.source === "手动输入");
  return {
    hotspotLinked,
    topicMaterials: formatMaterialsForPrompt(materials, hotspotLinked),
    primaryHotspotReference: hotspotLinked
      ? getPrimaryMaterialTitle(materials) || "未指定"
      : "无（场景创作模式）",
    hotspotContentHint: hotspotLinked
      ? "热点解读成稿：正文=事实引用+因果分析+普通人视角，至少2个来自事实要点的信息点；禁止编造数据/公司/政策原文；禁止只有「我的第一反应」类空泛Reaction。"
      : "场景创作成稿：不得做新闻解读；背景补充最多一句带过。",
  };
}

export function buildContentGenerationPrompt(input: AnyRecord = {}) {
  if (isVideoScriptMode(input)) {
    return buildVideoScriptGenerationPrompt(input);
  }
  const generationMode = input.generationMode || "image-text";
  const contentLength = normalizeContentLength(input.contentLength || input.length, generationMode);
  const lengthHint = formatContentLengthForPrompt(contentLength, generationMode);
  const materialFields = resolveContentMaterialFields(input);
  const built = buildPrompt("content-generation.md", input, "content-generation", (data, knowledge) => ({
    ...buildBriefPromptFields(data),
    ...materialFields,
    creationSceneRules: buildCreationSceneContentRules(
      (knowledge.businessLine || data.businessLine || "weisec") as "weisec" | "licaitong",
      data.creationScene,
      data.workflowConfig,
      data.embedLevel,
    ),
    contentType: data.contentType || "brand-seed",
    generationMode,
    length: lengthHint,
    bloggerLevel: data.bloggerLevel || "middle",
    embedLevel: formatEmbedLevelForPrompt(data.embedLevel || "medium"),
    topic: data.topic || data.hotspot || "未提供",
    customRequirement: data.customRequirement || data.customPrompt || "无",
    selectedAngle: data.selectedAngle || data.angle || "未提供，请基于主题生成一个保守安全的单一角度",
    selectedTemplate: data.selectedTemplate || knowledge.selectedTemplates[0] || null,
    xhsMethodology: formatXhsContentMethodologyForPrompt(),
    tagStrategy: formatTagStrategyForPrompt({
      businessLine: knowledge.businessLine || data.businessLine,
      offerId: data.offerId,
      selectedFeatureIds: data.selectedFeatureIds,
      embedLevel: data.embedLevel,
    }),
  }));
  return finalizePromptWithRuntimeLock(built, input);
}

export function buildVideoScriptGenerationPrompt(input: AnyRecord = {}) {
  const built = buildPrompt("video-script-generation.md", input, "video-script-generation", (data, knowledge) => ({
    ...buildVideoScriptVariables(data, knowledge),
    ...buildBriefPromptFields(data),
    creationSceneRules: buildCreationSceneContentRules(
      (knowledge.businessLine || data.businessLine || "weisec") as "weisec" | "licaitong",
      data.creationScene,
      data.workflowConfig,
      data.embedLevel,
    ),
  }));
  return finalizePromptWithRuntimeLock(built, { ...input, generationMode: "video-script" });
}

const VIDEO_PERSONA_TASK_LOCK = [
  "【视频任务锁定 · 覆盖人设模板中的图文要求】",
  "- 当前任务：口播短视频脚本（JSON），不是小红书图文笔记",
  "- 人设 system 只约束：语气、场景、称呼、禁忌词、口播气质",
  "- 忽略人设中的：图文正文结构、emoji 分段标题、400-500 字篇幅、imageTextSuggestions、封面文案",
  "- 创作优先级：先写满 storyboard[].voiceover 口播原文，再填 visual；禁止只输出镜头时长占位",
  "- 忽略人设模板里固定的 ⚠️ 风险标语句式；风险提示须口语化嵌入最后一镜，禁止每条都念「市场有风险投资需谨慎」",
].join("\n");

/** 有人设时：user 统一走 video-script-generation.md，避免 persona video 模板的 Markdown 格式冲突 */
export function buildPersonaVideoScriptGenerationPrompt(input: AnyRecord = {}) {
  const personaId = dataPersonaId(input);
  if (!personaId) return buildVideoScriptGenerationPrompt(input);

  if (!isPersonasLibraryAvailable()) {
    return buildVideoScriptGenerationPrompt(input);
  }

  const videoBuilt = buildVideoScriptGenerationPrompt(input);
  const businessLine = videoBuilt.knowledge?.businessLine || input.businessLine || "weisec";
  const line = businessLine === "licaitong" ? "licaitong" : "weisec";
  const personaSystem = buildPersonaSystemPrompt(personaId, input.personaVariant, line);
  const system = `${videoBuilt.system}\n\n${personaSystem}\n\n${VIDEO_PERSONA_TASK_LOCK}`;

  return {
    ...videoBuilt,
    personaId,
    system,
    prompt: `${system}\n\n${videoBuilt.user}`,
    messages: [
      { role: "system", content: system },
      { role: "user", content: videoBuilt.user },
    ],
  };
}

function sanitizeGeneratedContentForCompliance(content: unknown, generationMode?: string) {
  if (!content || typeof content !== "object") return content;
  if ((generationMode || "image-text") !== "video-script") return content;
  const raw = content as AnyRecord;
  const { imagePromptSuggestions, coverTextCandidates, selectedCoverText, visualPlan, generatedImages, ...rest } =
    raw;
  return {
    ...rest,
    generationMode: "video-script",
    note: "口播短视频脚本；无封面文案、无文生图字段",
  };
}

export function buildComplianceReviewPrompt(input: AnyRecord = {}) {
  const isVideo = isVideoScriptMode(input);
  const template = isVideo ? "compliance-review-video.md" : "compliance-review.md";
  const taskName = isVideo ? "compliance-review-video" : "compliance-review";
  return buildPrompt(template, input, taskName, (data) => ({
    generatedContent: sanitizeGeneratedContentForCompliance(
      data.generatedContent || data.content || "未提供",
      input.generationMode || data.generationMode,
    ),
  }));
}

export function buildCoverSuggestionsPrompt(input: AnyRecord = {}) {
  return buildPrompt("cover-suggestions.md", input, "cover-suggestions", (data, knowledge) => ({
    generatedContent: data.generatedContent || data.content || "未提供",
    selectedTemplate: data.selectedTemplate || knowledge.selectedTemplates[0] || null,
  }));
}

export function buildVisualPlanPrompt(input: AnyRecord = {}) {
  return buildPrompt("visual-plan.md", input, "visual-plan", (data) => ({
    selectedTitle: data.selectedTitle || "未提供",
    selectedCoverText: data.selectedCoverText || "未提供",
    generatedContent: data.generatedContent || data.content || "未提供",
    selectedAngle: data.selectedAngle || data.angle || "未提供",
  }));
}

export function buildPersonaContentGenerationPrompt(input: AnyRecord = {}) {
  if (isVideoScriptMode(input)) {
    return buildPersonaVideoScriptGenerationPrompt(input);
  }

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
  const runtimeLock = buildBusinessLineRuntimeLock(
    businessLine,
    knowledge.brandVoice,
    input.embedLevel,
    generationMode,
    buildRuntimeNarrativeOptions(input),
  );

  const briefFields = buildBriefPromptFields(input);
  const sceneRules = buildCreationSceneContentRules(
    businessLine as "weisec" | "licaitong",
    input.creationScene,
    input.workflowConfig,
    input.embedLevel,
  );

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
      embedLevel: formatEmbedLevelForPrompt(input.embedLevel || "medium"),
      customRequirement: input.customRequirement || input.customPrompt || "无",
      ...resolveContentMaterialFields(input),
      selectedFeatures: knowledge.selectedFeatures,
      selectedTemplate: knowledge.selectedTemplates[0] || null,
      phraseGroup: knowledge.phraseGroup,
      brandVoice: knowledge.brandVoice,
      complianceRules: knowledge.complianceRules,
      riskDisclaimers: knowledge.riskDisclaimers,
      platformRules: knowledge.platformRules,
      visualGuidelines: formatVisualGuidelinesForPrompt(knowledge.visualGuidelines),
      debugKnowledgeUsed: knowledge.debugKnowledgeUsed,
      briefBusinessContext: briefFields.briefBusinessContext,
    },
    input.personaVariant,
    businessLine === "licaitong" ? "licaitong" : "weisec",
  );

  const globalSystem = buildSystemPrompt(knowledge);
  const personaSystem = `${personaPrompt.system}\n\n${runtimeLock}`;
  const personaUser = appendBriefLocks(
    `${personaPrompt.user}\n\n【Brief 业务配置 · 必须服从】\n${briefFields.briefBusinessContext}${
      sceneRules ? `\n\n${sceneRules}` : ""
    }\n\n${formatXhsContentMethodologyForPrompt()}\n\n${formatTagStrategyForPrompt({
      businessLine,
      offerId: input.offerId,
      selectedFeatureIds: input.selectedFeatureIds,
      embedLevel: input.embedLevel,
    })}\n\n${runtimeLock}`,
    input,
  );
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
