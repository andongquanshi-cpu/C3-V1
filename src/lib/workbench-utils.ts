import { validateGeneratedBody } from "@/lib/business-line-prompt";
import { getSelectedMaterials } from "@/lib/hotspot-workflow";
import type { BriefInput, ComplianceReport, CreativeAngle, GeneratedContent, Material } from "@/lib/types";

type LooseRecord = Record<string, unknown>;

export function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

/** 创作配置 + 角度生成参数指纹，用于判断当前角度是否仍有效 */
export function buildAnglesConfigFingerprint(brief: BriefInput, materials: Material[]) {
  return JSON.stringify({
    offerId: brief.offerId,
    creationScene: brief.creationScene,
    audienceTag: brief.audienceTag,
    personaId: brief.personaId,
    personaVariant: brief.personaVariant,
    selectedFeatureIds: [...brief.selectedFeatureIds].sort(),
    topic: brief.topic,
    targetUser: brief.targetUser,
    contentType: brief.contentType,
    materialIds: getSelectedMaterials(materials)
      .map((item) => item.id)
      .sort(),
    generateCount: brief.generateCount,
    embedLevel: brief.embedLevel,
    customRequirement: brief.customRequirement || "",
  });
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as LooseRecord) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** LLM 常在 JSON 字符串里输出字面量 \\n，解析后不会变成真实换行 */
export function normalizeMultilineText(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assembleGeneratedContentText(data: LooseRecord): string {
  const opening = normalizeMultilineText(data.opening);
  const body = normalizeMultilineText(data.body);
  const closing = normalizeMultilineText(data.closing);
  const explicit = normalizeMultilineText(data.content);
  const fromParts = [opening, body, closing].filter(Boolean).join("\n\n");

  if (!explicit) return fromParts;
  if (!fromParts) return explicit;

  const explicitHasBreaks = explicit.includes("\n");
  const partsHasBreaks = fromParts.includes("\n");

  if (partsHasBreaks && !explicitHasBreaks) return fromParts;
  if (explicitHasBreaks && !partsHasBreaks) return explicit;

  return explicit.length >= fromParts.length ? explicit : fromParts;
}

/** 将 personaContent 等人设专用 JSON 映射为 contentGeneration 标准字段 */
export function adaptPersonaContentPayload(value: unknown): Partial<GeneratedContent> & LooseRecord {
  const data = asRecord(value);

  const content = assembleGeneratedContentText(data);

  const titleOptions = Array.isArray(data.titleOptions) ? data.titleOptions : [];
  const titleCandidates =
    Array.isArray(data.titleCandidates) && data.titleCandidates.length > 0
      ? (data.titleCandidates as GeneratedContent["titleCandidates"])
      : titleOptions
          .map((item) => {
            const row = asRecord(item);
            const text = asString(row.text);
            if (!text) return null;
            return {
              text,
              type: asString(row.type) || undefined,
              riskLevel: (row.riskLevel as GeneratedContent["titleCandidates"][number]["riskLevel"]) || "low",
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const imageTextSuggestions = Array.isArray(data.imageTextSuggestions) ? data.imageTextSuggestions : [];
  const coverSuggestions = Array.isArray(data.coverSuggestions) ? data.coverSuggestions : [];
  const imagePromptSuggestions =
    Array.isArray(data.imagePromptSuggestions) && data.imagePromptSuggestions.length > 0
      ? (data.imagePromptSuggestions as GeneratedContent["imagePromptSuggestions"])
      : [
          ...imageTextSuggestions.map((item) => {
            const row = asRecord(item);
            const scene = asString(row.scene);
            const visualNotes = Array.isArray(row.visualNotes) ? row.visualNotes.map(String).join("；") : "";
            const prompt = asString(row.prompt) || [scene, visualNotes].filter(Boolean).join("。");
            if (!prompt) return null;
            return {
              style: asString(row.style) || "default",
              prompt,
              coverText: asString(row.coverText) || undefined,
              riskNotes: Array.isArray(row.riskNotes) ? row.riskNotes.map(String) : [],
            };
          }),
          ...coverSuggestions.map((item) => {
            const row = asRecord(item);
            const visualNotes = Array.isArray(row.visualNotes) ? row.visualNotes.map(String).join("；") : "";
            const prompt = asString(row.prompt) || asString(row.imagePrompt) || [asString(row.style), visualNotes].filter(Boolean).join("。");
            if (!prompt) return null;
            return {
              style: asString(row.style) || "cover",
              prompt,
              coverText: asString(row.coverText) || undefined,
              riskNotes: Array.isArray(row.riskNotes) ? row.riskNotes.map(String) : [],
            };
          }),
        ]
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const naturalInsertion = asRecord(data.naturalInsertion);
  const insertStrategy =
    data.insertStrategy && Object.keys(asRecord(data.insertStrategy)).length > 0
      ? (data.insertStrategy as Record<string, string>)
      : naturalInsertion.productName || naturalInsertion.sceneContext
        ? {
            featureName: asString(naturalInsertion.productName),
            scene: asString(naturalInsertion.sceneContext),
            usedPhrase: asString(naturalInsertion.usedPhrase),
            whyNatural: asString(naturalInsertion.whyNatural),
          }
        : {};

  const coverFromImage =
    imagePromptSuggestions[0]?.coverText ||
    (imageTextSuggestions[0] ? asString(asRecord(imageTextSuggestions[0]).coverText) : "") ||
    (coverSuggestions[0] ? asString(asRecord(coverSuggestions[0]).coverText) : "");

  const coverTextCandidates =
    Array.isArray(data.coverTextCandidates) && data.coverTextCandidates.length > 0
      ? (data.coverTextCandidates as GeneratedContent["coverTextCandidates"])
      : coverFromImage
        ? [{ text: coverFromImage, style: "人设封面", riskLevel: "low" as const }]
        : [];

  return {
    ...data,
    content,
    titleCandidates,
    selectedTitle: asString(data.selectedTitle) || titleCandidates[0]?.text,
    coverTextCandidates,
    selectedCoverText: asString(data.selectedCoverText) || coverTextCandidates[0]?.text,
    imagePromptSuggestions,
    insertStrategy,
    interactionGuide: asString(data.interactionGuide) || asString(data.cta),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
  };
}

/** 模型未输出封面 prompt 时，用标题/封面字/角度信息拼一条可试用的生图 prompt */
export function buildFallbackImagePromptSuggestions(
  content: Pick<GeneratedContent, "selectedTitle" | "selectedCoverText" | "content">,
  angle: CreativeAngle,
): GeneratedContent["imagePromptSuggestions"] {
  const coverText = content.selectedCoverText || angle.coverDirection || "";
  const title = content.selectedTitle || angle.angleName || "";
  const prompt = [
    "小红书财经笔记封面，竖版 3:4",
    coverText ? `封面大字：${coverText}` : "",
    title ? `内容主题：${title}` : "",
    angle.coreIdea ? `画面方向：${angle.coreIdea.slice(0, 100)}` : "",
    "风格：清晰、生活化、偏干货笔记感",
    "禁止：股票代码、收益数字、承诺性文案、二维码",
  ]
    .filter(Boolean)
    .join("。");

  return [
    {
      style: "fallback-cover",
      prompt,
      coverText: coverText || undefined,
      riskNotes: ["由标题与封面字自动拼装，仅供试生成"],
    },
  ];
}

function hasUsableImagePrompts(items: GeneratedContent["imagePromptSuggestions"]) {
  return items.some((item) => asString(item.prompt));
}

export function buildDefaultCompliance(content: GeneratedContent): ComplianceReport {
  const hasRiskReminder =
    content.content.includes("市场有风险") || content.riskReminder.includes("市场有风险");
  return {
    overallRiskLevel: "medium",
    publishReadiness: "needs_revision",
    riskFindings: [],
    missingRequiredElements: hasRiskReminder
      ? []
      : [{ type: "riskReminder", suggestedText: "市场有风险，投资需谨慎。" }],
    qualityScore: content.qualityScore,
    requiredFixes: hasRiskReminder ? [] : ["补充标准风险提示。"],
    summary: "合规审查结果解析不完整，请人工复核后再发布。",
  };
}

function normalizeDisplayTag(value: unknown) {
  const text = asString(value).replace(/^#+/, "").trim();
  if (!text || text.length > 12) return "";
  return text.startsWith("#") ? text : `#${text}`;
}

function buildFallbackContentTags(angle: CreativeAngle): string[] {
  const fromAngle = (angle.displayTags || [])
    .map((tag) => tag.replace(/^#+/, "").trim())
    .filter(Boolean);
  if (fromAngle.length) return fromAngle.slice(0, 6);
  const candidates = [
    angle.angleType,
    angle.targetUser,
    ...angle.emotionalHook,
    angle.userPainPoint?.slice(0, 12),
  ]
    .map((item) => asString(item))
    .filter(Boolean);
  return [...new Set(candidates)].slice(0, 5);
}

function buildFallbackDisplayTags(angle: CreativeAngle, brief: BriefInput) {
  const candidates = [
    angle.angleType,
    angle.targetUser || brief.targetUser,
    ...angle.emotionalHook,
    angle.userPainPoint,
  ];
  return [...new Set(candidates.map(normalizeDisplayTag).filter(Boolean))].slice(0, 4);
}

export function normalizeAngles(value: unknown, brief: BriefInput): CreativeAngle[] {
  const parsed = value as { angles?: CreativeAngle[] } | CreativeAngle[];
  const angles = Array.isArray(parsed) ? parsed : Array.isArray(parsed.angles) ? parsed.angles : [];
  const limit = Math.min(5, Math.max(1, Math.round(Number(brief.generateCount) || 3)));
  return angles.slice(0, limit).map((angle, index) => {
    const normalized: CreativeAngle = {
      angleId: angle.angleId || `angle_${String(index + 1).padStart(3, "0")}`,
      angleName: angle.angleName || `创意角度 ${index + 1}`,
      angleType: angle.angleType || "内容角度",
      coreIdea: angle.coreIdea || "",
      targetUser: angle.targetUser || brief.targetUser,
      emotionalHook: Array.isArray(angle.emotionalHook) ? angle.emotionalHook : [],
      userPainPoint: angle.userPainPoint || "",
      contentStructure: angle.contentStructure || "",
      differentiationAxis: angle.differentiationAxis || "",
      recommendedTemplateId: angle.recommendedTemplateId || "",
      recommendedFeatureIds: Array.isArray(angle.recommendedFeatureIds) ? angle.recommendedFeatureIds : [],
      productBridge: angle.productBridge || {},
      displayTags: Array.isArray(angle.displayTags)
        ? angle.displayTags.map(normalizeDisplayTag).filter(Boolean).slice(0, 5)
        : [],
      titleDirections: Array.isArray(angle.titleDirections) ? angle.titleDirections : [],
      coverDirection: angle.coverDirection || "",
      riskLevel: angle.riskLevel || "low",
      riskNotes: Array.isArray(angle.riskNotes) ? angle.riskNotes : [],
    };
    if (!normalized.displayTags?.length) {
      normalized.displayTags = buildFallbackDisplayTags(normalized, brief);
    }
    return normalized;
  });
}

export function normalizeContent(value: unknown, angle: CreativeAngle): GeneratedContent {
  const data = adaptPersonaContentPayload(value) as Partial<GeneratedContent>;
  const base: GeneratedContent = {
    id: uid("content"),
    angleId: data.angleId || angle.angleId,
    angleName: data.angleName || angle.angleName,
    titleCandidates: Array.isArray(data.titleCandidates) ? data.titleCandidates : [],
    selectedTitle: data.selectedTitle || data.titleCandidates?.[0]?.text || angle.titleDirections[0] || angle.angleName,
    coverTextCandidates: Array.isArray(data.coverTextCandidates) ? data.coverTextCandidates : [],
    selectedCoverText: data.selectedCoverText || data.coverTextCandidates?.[0]?.text || "财经干货",
    content: data.content || "",
    insertStrategy: data.insertStrategy || {},
    tags: Array.isArray(data.tags) && data.tags.length ? data.tags : buildFallbackContentTags(angle),
    interactionGuide: data.interactionGuide || "",
    riskReminder: data.riskReminder || "市场有风险，投资需谨慎。",
    imagePromptSuggestions: Array.isArray(data.imagePromptSuggestions) ? data.imagePromptSuggestions : [],
    qualityScore: data.qualityScore,
    complianceReport: data.complianceReport,
    debugKnowledgeUsed: data.debugKnowledgeUsed,
  };

  if (!hasUsableImagePrompts(base.imagePromptSuggestions)) {
    base.imagePromptSuggestions = buildFallbackImagePromptSuggestions(base, angle);
  }

  return base;
}

export function normalizeCompliance(value: unknown, fallback: ComplianceReport): ComplianceReport {
  const data = value as Partial<ComplianceReport>;
  return {
    overallRiskLevel: data.overallRiskLevel || fallback.overallRiskLevel,
    publishReadiness: data.publishReadiness || fallback.publishReadiness,
    riskFindings: Array.isArray(data.riskFindings) ? data.riskFindings : fallback.riskFindings,
    missingRequiredElements: Array.isArray(data.missingRequiredElements)
      ? data.missingRequiredElements
      : fallback.missingRequiredElements,
    qualityScore: data.qualityScore || fallback.qualityScore,
    requiredFixes: Array.isArray(data.requiredFixes) ? data.requiredFixes : fallback.requiredFixes,
    summary: data.summary || fallback.summary,
    debugKnowledgeUsed: data.debugKnowledgeUsed,
  };
}
