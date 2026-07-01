import type { BriefInput, ComplianceReport, CreativeAngle, GeneratedContent } from "@/lib/types";

export function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
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

export function normalizeAngles(value: unknown, brief: BriefInput): CreativeAngle[] {
  const parsed = value as { angles?: CreativeAngle[] } | CreativeAngle[];
  const angles = Array.isArray(parsed) ? parsed : Array.isArray(parsed.angles) ? parsed.angles : [];
  return angles.slice(0, 8).map((angle, index) => ({
    angleId: angle.angleId || `angle_${String(index + 1).padStart(3, "0")}`,
    angleName: angle.angleName || `创意角度 ${index + 1}`,
    angleType: angle.angleType || "内容角度",
    coreIdea: angle.coreIdea || "",
    targetUser: angle.targetUser || brief.targetUser,
    emotionalHook: Array.isArray(angle.emotionalHook) ? angle.emotionalHook : [],
    userPainPoint: angle.userPainPoint || "",
    contentStructure: angle.contentStructure || "",
    recommendedTemplateId: angle.recommendedTemplateId || "",
    recommendedFeatureIds: Array.isArray(angle.recommendedFeatureIds) ? angle.recommendedFeatureIds : [],
    productBridge: angle.productBridge || {},
    titleDirections: Array.isArray(angle.titleDirections) ? angle.titleDirections : [],
    coverDirection: angle.coverDirection || "",
    riskLevel: angle.riskLevel || "low",
    riskNotes: Array.isArray(angle.riskNotes) ? angle.riskNotes : [],
  }));
}

export function normalizeContent(value: unknown, angle: CreativeAngle): GeneratedContent {
  const data = value as Partial<GeneratedContent>;
  return {
    id: uid("content"),
    angleId: data.angleId || angle.angleId,
    angleName: data.angleName || angle.angleName,
    titleCandidates: Array.isArray(data.titleCandidates) ? data.titleCandidates : [],
    selectedTitle: data.selectedTitle || data.titleCandidates?.[0]?.text || angle.titleDirections[0] || angle.angleName,
    coverTextCandidates: Array.isArray(data.coverTextCandidates) ? data.coverTextCandidates : [],
    selectedCoverText: data.selectedCoverText || data.coverTextCandidates?.[0]?.text || "财经干货",
    content: data.content || "",
    insertStrategy: data.insertStrategy || {},
    tags: Array.isArray(data.tags) ? data.tags : [],
    interactionGuide: data.interactionGuide || "",
    riskReminder: data.riskReminder || "市场有风险，投资需谨慎。",
    imagePromptSuggestions: Array.isArray(data.imagePromptSuggestions) ? data.imagePromptSuggestions : [],
    qualityScore: data.qualityScore,
    complianceReport: data.complianceReport,
    debugKnowledgeUsed: data.debugKnowledgeUsed,
  };
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
