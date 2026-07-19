"use client";

import { useEffect, useMemo } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AnglesPanel } from "@/components/workspace/AnglesPanel";
import { BriefPanel } from "@/components/workspace/BriefPanel";
import { BriefSummaryCard } from "@/components/workspace/BriefSummaryCard";
import { ContentResultsPanel } from "@/components/workspace/ContentResultsPanel";
import { ReviewPanel } from "@/components/workspace/ReviewPanel";
import { VisualPlanStudio } from "@/components/workspace/VisualPlanStudio";
import { WorkflowStageShell } from "@/components/workspace/WorkflowStageShell";
import { WorkflowStepper } from "@/components/workspace/WorkflowStepper";
import {
  buildSuggestedTopic,
  buildWorkflowDefaults,
  filterOfferFeatures,
  getAnglesStatusMessage,
  getContentLengthOptions,
  isFeatureSelectionActive,
  resolveWorkflowForLine,
  type BusinessLineWorkflowConfig,
} from "@/lib/business-line-workflow";
import { getSelectedMaterials, requiresHotspotMaterials } from "@/lib/hotspot-workflow";
import { validateGeneratedBody } from "@/lib/business-line-prompt";
import { ANGLE_AXES, type AngleAxis, type AngleCoordinate } from "@/lib/creative/angle-axes";
import { sampleAngleCoordinates } from "@/lib/creative/angle-sampler";
import {
  finalizeImagePromptSuggestions,
  shouldRequestCoverSuggestions,
} from "@/lib/image-prompt-utils";
import { browserStorage, readStoredJson, writeStoredJson } from "@/lib/storage";
import { useMatrixWorkspaceSession } from "@/hooks/useMatrixWorkspaceSession";
import { parseLLMJson } from "@/lib/utils";
import {
  buildAnglesConfigFingerprint,
  buildDefaultCompliance,
  normalizeAngles,
  normalizeCompliance,
  normalizeContent,
  uid,
} from "@/lib/workbench-utils";
import {
  buildPromptApi,
  fetchApiStatus,
  generateTextApi,
  type MatrixConfirmedStage,
  type MatrixWorkflowContext,
} from "@/services/creation-api";
import type {
  BriefInput,
  BusinessLine,
  Draft,
  GeneratedContent,
  GeneratedImage,
  GenerationHistoryEntry,
  VisualPlan,
} from "@/lib/types";

const CREATION_WORKFLOW_STEPS = [
  { id: 1, label: "要素配置", capability: "creation-brief" },
  { id: 2, label: "创意角度", capability: "creative-angles" },
  { id: 3, label: "生成内容", capability: "content-generation" },
  { id: 5, label: "预览审核", capability: "content-review" },
] as const;
const LLM_NOT_CONFIGURED =
  "服务端未配置 LLM_API_KEY，请在项目根目录 .env 中设置后重启开发服务器";
const ANGLE_HISTORY_STORAGE_KEY = "lunch-angle-history";
const LEGACY_ANGLE_COORD_HISTORY_STORAGE_KEY = "lunch-angle-coord-history-v1";
const MAX_ANGLE_HISTORY_KEYS = 20;
const MAX_COORD_HISTORY_PER_KEY = 24;

interface BusinessLineWorkbenchProps {
  businessLine: BusinessLine;
}

function readCoordHistory(storageKey: string): Record<string, AngleCoordinate[]> {
  browserStorage.remove(ANGLE_HISTORY_STORAGE_KEY);
  return readStoredJson<Record<string, AngleCoordinate[]>>(
    storageKey,
    {},
    [LEGACY_ANGLE_COORD_HISTORY_STORAGE_KEY],
  );
}

function getRecentCoordsForConfig(storageKey: string, configKey: string) {
  return readCoordHistory(storageKey)[configKey] || [];
}

function appendCoordHistory(storageKey: string, configKey: string, coords: AngleCoordinate[]) {
  const history = readCoordHistory(storageKey);
  history[configKey] = [...(history[configKey] || []), ...coords].slice(-MAX_COORD_HISTORY_PER_KEY);
  writeStoredJson(storageKey, Object.fromEntries(Object.entries(history).slice(-MAX_ANGLE_HISTORY_KEYS)));
}

function matrixAngleAxes(embedLevel: BriefInput["embedLevel"]): AngleAxis[] {
  const cloakByLevel: Record<BriefInput["embedLevel"], string[]> = {
    none: ["完全不提产品，只讲观点（0 植入）"],
    low: [
      "完全不提产品，只讲观点（0 植入）",
      "作为顺手用到的一个工具轻描淡写带过",
      "剧情里的自然道具：故事里角色本来就在用",
      "以'我朋友告诉我'的转述形式出现",
    ],
    medium: [
      "作为解决痛点后的最后一句：'后来我用了……'",
      "作为对比选项之一（A/B/C 三个方式的其中一个）",
      "剧情里的自然道具：故事里角色本来就在用",
      "作为科普附带链接，重点在讲概念",
    ],
    high: [
      "作为踩坑后才发现的方法：'早知道有这个……'",
      "反向推荐：先讲什么样的人不适合，再讲适合谁",
      "作为解决痛点后的最后一句：'后来我用了……'",
      "作为对比选项之一（A/B/C 三个方式的其中一个）",
    ],
  };

  return ANGLE_AXES.map((axis) => {
    if (axis.key === "hook") return { ...axis, values: axis.values.filter((value) => !value.includes("热点")) };
    if (axis.key === "format") {
      return {
        ...axis,
        values: axis.values.filter((value) => !value.includes("清单") && !value.includes("SOP")),
      };
    }
    if (axis.key === "offerCloak") return { ...axis, values: cloakByLevel[embedLevel] };
    return axis;
  });
}

function buildDefaultBrief(businessLine: BusinessLine): BriefInput {
  return {
    businessLine,
    ...buildWorkflowDefaults(businessLine),
    topic: "",
    generationMode: "image-text",
    bloggerLevel: "middle",
    embedLevel: "medium",
    contentLength: "200-500",
    generateCount: 6,
    customRequirement: "",
    materials: [],
  };
}

function matrixWorkflowContext(
  confirmedStage: MatrixConfirmedStage,
  snapshotId: string,
): MatrixWorkflowContext {
  return { mode: "matrix", confirmed: true, confirmedStage, snapshotId };
}

function hasSelectedHotspotMaterials(brief: BriefInput) {
  return (brief.materials || []).some((material) => material.source && material.source !== "手动输入");
}

function getMissingBriefSelections(brief: BriefInput, config: BusinessLineWorkflowConfig) {
  const missing: string[] = [];
  if (!config.hideOfferSelection && !brief.offerId) missing.push("Offer");
  if (!brief.creationScene) missing.push("创作场景");
  if (!brief.audienceTag || !brief.targetUser) missing.push("目标读者");
  if (!brief.personaId) missing.push("创作人设");
  if (
    isFeatureSelectionActive(brief, config, brief.businessLine) &&
    brief.embedLevel !== "none" &&
    brief.selectedFeatureIds.length === 0
  ) {
    missing.push(config.hideOfferSelection ? "主推功能" : "主推卖点");
  }
  if (
    requiresHotspotMaterials({
      personaId: brief.personaId,
      creationScene: brief.creationScene,
      config,
    }) &&
    getSelectedMaterials(brief.materials || []).length === 0
  ) {
    missing.push("热点素材");
  }
  return [...new Set(missing)];
}

export function BusinessLineWorkbench({ businessLine }: BusinessLineWorkbenchProps) {
  const defaultBrief = useMemo(() => buildDefaultBrief(businessLine), [businessLine]);
  const session = useMatrixWorkspaceSession({ businessLine, defaultBrief });
  const {
    storageKeys,
    step,
    setStep,
    brief,
    setBrief,
    confirmedBrief,
    setConfirmedBrief,
    angles,
    setAngles,
    selectedAngleIds,
    setSelectedAngleIds,
    confirmedAngles,
    setConfirmedAngles,
    results,
    setResults,
    activeResultId,
    setActiveResultId,
    confirmedContentId,
    setConfirmedContentId,
    confirmedImageContentId,
    setConfirmedImageContentId,
    reviewConfirmed,
    setReviewConfirmed,
    setHistory,
    setDrafts,
    knowledge,
    apiStatus,
    apiStatusResolved,
    setApiStatus,
    status,
    setStatus,
    isGeneratingAngles,
    setIsGeneratingAngles,
    isGeneratingContent,
    setIsGeneratingContent,
    anglesGeneratedForKey,
    setAnglesGeneratedForKey,
  } = session;

  const workflowConfig = useMemo(
    () => resolveWorkflowForLine(knowledge, businessLine),
    [knowledge, businessLine],
  );
  const offerFeatures = useMemo(
    () => filterOfferFeatures(knowledge?.features || [], businessLine, brief.offerId, workflowConfig),
    [knowledge, businessLine, brief.offerId, workflowConfig],
  );
  const activeResult = useMemo(
    () => results.find((result) => result.id === activeResultId) || results[0],
    [activeResultId, results],
  );
  const confirmedContent = useMemo(
    () => results.find((result) => result.id === confirmedContentId),
    [confirmedContentId, results],
  );
  const confirmedImageContent = useMemo(
    () => results.find((result) => result.id === confirmedImageContentId),
    [confirmedImageContentId, results],
  );
  const missingBriefSelections = getMissingBriefSelections(brief, workflowConfig);
  const canConfirmImages = Boolean(
    confirmedContent?.visualPlan && (confirmedContent.generatedImages?.length || 0) > 0,
  );

  useEffect(() => {
    const staleScene = Boolean(
      brief.creationScene && !workflowConfig.creationScenes.some((item) => item.id === brief.creationScene),
    );
    const stalePersona = Boolean(
      brief.personaId && !workflowConfig.personas.some((item) => item.id === brief.personaId),
    );
    const staleOffer = Boolean(
      !workflowConfig.hideOfferSelection &&
      brief.offerId &&
      !workflowConfig.offers.some((item) => item.id === brief.offerId && item.enabled),
    );
    if (!staleScene && !stalePersona && !staleOffer) return;

    setBrief((current) => ({
      ...current,
      creationScene: staleScene ? undefined : current.creationScene,
      personaId: stalePersona ? undefined : current.personaId,
      personaVariant: stalePersona ? undefined : current.personaVariant,
      offerId: staleOffer ? undefined : current.offerId,
      selectedFeatureIds: staleScene ? [] : current.selectedFeatureIds,
      selectedFeatureNames: staleScene ? [] : current.selectedFeatureNames,
    }));
    setConfirmedBrief(null);
    setAngles([]);
    setSelectedAngleIds([]);
    setConfirmedAngles([]);
    setResults([]);
    setConfirmedContentId("");
    setConfirmedImageContentId("");
    setReviewConfirmed(false);
    setAnglesGeneratedForKey(null);
    setStatus("已清理不再适用的旧版场景、人设或 Offer，请重新选择要素");
  }, [
    brief.creationScene,
    brief.offerId,
    brief.personaId,
    brief.selectedFeatureIds,
    brief.selectedFeatureNames,
    setAngles,
    setAnglesGeneratedForKey,
    setBrief,
    setConfirmedAngles,
    setConfirmedBrief,
    setConfirmedContentId,
    setConfirmedImageContentId,
    setResults,
    setReviewConfirmed,
    setSelectedAngleIds,
    setStatus,
    workflowConfig,
  ]);

  useEffect(() => {
    if (!knowledge) return;
    const names = brief.selectedFeatureIds
      .map((id) => knowledge.features.find((feature) => feature.id === id)?.name)
      .filter(Boolean) as string[];
    if (names.join("|") !== brief.selectedFeatureNames.join("|")) {
      setBrief((current) => ({ ...current, selectedFeatureNames: names }));
    }
  }, [brief.selectedFeatureIds, brief.selectedFeatureNames, knowledge, setBrief]);

  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    void fetchApiStatus().then((data) => {
      if (!cancelled) setApiStatus(data);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [setApiStatus, step]);

  function invalidateAfterBrief() {
    setConfirmedBrief(null);
    setAngles([]);
    setSelectedAngleIds([]);
    setConfirmedAngles([]);
    setResults([]);
    setActiveResultId("");
    setConfirmedContentId("");
    setConfirmedImageContentId("");
    setReviewConfirmed(false);
    setAnglesGeneratedForKey(null);
  }

  function updateBrief(patch: Partial<BriefInput> | ((current: BriefInput) => BriefInput)) {
    setBrief((current) => {
      const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      return {
        ...next,
        generateCount: 6,
      };
    });
    invalidateAfterBrief();
  }

  async function generateAngles() {
    const missing = getMissingBriefSelections(brief, workflowConfig);
    if (missing.length > 0) {
      setStatus(`还没有完成选择：请补充${missing.join("、")}后再生成创意角度`);
      return;
    }
    const generationBrief: BriefInput = {
      ...brief,
      topic: brief.topic.trim() || buildSuggestedTopic(brief, workflowConfig),
      materials: brief.materials || [],
      generateCount: 6,
    };
    const generationConfigKey = buildAnglesConfigFingerprint(generationBrief, generationBrief.materials);
    setConfirmedBrief(generationBrief);
    setIsGeneratingAngles(true);
    setStatus(angles.length > 0 ? "正在刷新 6 个创意角度…" : getAnglesStatusMessage(businessLine));
    setAngles([]);
    setSelectedAngleIds([]);
    setConfirmedAngles([]);
    setResults([]);
    setConfirmedContentId("");
    setConfirmedImageContentId("");
    setReviewConfirmed(false);
    try {
      if (!apiStatus.ready) throw new Error(LLM_NOT_CONFIGURED);
      const recentCoords = getRecentCoordsForConfig(storageKeys.angleHistory, generationConfigKey);
      const batchSeed = uid("angle_batch");
      const angleCoordinates = sampleAngleCoordinates({
        count: 6,
        recentCoords,
        seed: batchSeed,
        axes: matrixAngleAxes(generationBrief.embedLevel),
      });
      const prompt = await buildPromptApi("creativeAngles", {
        ...generationBrief,
        hotspotLinked: hasSelectedHotspotMaterials(generationBrief),
        creationMode: "matrix",
        workflowContext: matrixWorkflowContext("elements", generationConfigKey),
        generateCount: 6,
        materials: generationBrief.materials || [],
        diversitySeed: batchSeed,
        angleCoordinates,
      });
      const raw = await generateTextApi(prompt, {
        temperature: 0.95,
        topP: 0.92,
        frequencyPenalty: 0.6,
        presencePenalty: 0.4,
        seed: Math.floor(Math.random() * 2_147_483_647),
        maxTokens: 8192,
      });
      const normalized = normalizeAngles(parseLLMJson(raw), generationBrief);
      if (normalized.length !== 6) throw new Error(`模型返回 ${normalized.length} 个角度，未达到固定数量 6，请刷新重试`);
      setAngles(normalized);
      setAnglesGeneratedForKey(generationConfigKey);
      appendCoordHistory(storageKeys.angleHistory, generationConfigKey, angleCoordinates);
      setStatus("已生成 6 个创意角度，请勾选需要用于内容生成的角度");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "创意角度生成失败");
    } finally {
      setIsGeneratingAngles(false);
    }
  }

  function changeSelectedAngles(ids: string[]) {
    const selected = angles.filter((angle) => ids.includes(angle.angleId));
    setSelectedAngleIds(ids);
    setConfirmedAngles(selected);
    setResults([]);
    setActiveResultId("");
    setConfirmedContentId("");
    setConfirmedImageContentId("");
    setReviewConfirmed(false);
    setStatus(selected.length > 0 ? `已选择 ${selected.length} 个创意角度，选择已自动生效` : "请选择至少一个创意角度");
  }

  async function generateContent() {
    if (!confirmedBrief || !confirmedAngles.length) {
      setStatus("请先选择至少一个创意角度");
      return;
    }
    if (!apiStatus.ready) {
      setStatus(LLM_NOT_CONFIGURED);
      return;
    }
    setIsGeneratingContent(true);
    setStatus("正在生成正文并完成合规审查…");
    try {
      const nextResults: GeneratedContent[] = [];
      const contentBrief: BriefInput = {
        ...confirmedBrief,
        generationMode: brief.generationMode,
        contentLength: brief.contentLength,
        materials: confirmedBrief.materials || [],
      };
      for (const angle of confirmedAngles) {
        const selectedFeatureIds = contentBrief.embedLevel === "none"
          ? []
          : [...new Set([...contentBrief.selectedFeatureIds, ...angle.recommendedFeatureIds])];
        const contentAction = contentBrief.personaId ? "personaContent" : "contentGeneration";
        const contentPrompt = await buildPromptApi(contentAction, {
          ...contentBrief,
          hotspotLinked: hasSelectedHotspotMaterials(contentBrief),
          creationMode: "matrix",
          workflowContext: matrixWorkflowContext("angles", confirmedAngles.map((item) => item.angleId).join("|")),
          selectedAngle: angle,
          templateId: angle.recommendedTemplateId,
          selectedFeatureIds,
        });
        const rawContent = await generateTextApi(contentPrompt, { maxTokens: 8192 });
        const parsedContent = parseLLMJson<unknown>(rawContent);
        let content = normalizeContent(parsedContent, angle, {
          generationMode: contentBrief.generationMode,
          tagContext: {
            businessLine: contentBrief.businessLine,
            offerId: contentBrief.offerId,
            selectedFeatureIds,
            audienceTag: contentBrief.audienceTag,
            targetUser: contentBrief.targetUser,
            embedLevel: contentBrief.embedLevel,
          },
        });
        if (!content.content.trim()) {
          const payloadKeys = parsedContent && typeof parsedContent === "object" && !Array.isArray(parsedContent)
            ? Object.keys(parsedContent as Record<string, unknown>).slice(0, 12).join("、")
            : "非对象响应";
          throw new Error(`模型返回内容未包含可识别正文（顶层字段：${payloadKeys || "无"}），请重试`);
        }
        const bodyCheck = validateGeneratedBody(content.content, contentBrief.businessLine, contentBrief.generationMode);
        if (!bodyCheck.ok) throw new Error(`正文质检未通过：${bodyCheck.reason}`);

        if (contentBrief.generationMode !== "video-script" && shouldRequestCoverSuggestions(content.imagePromptSuggestions)) {
          const coverPrompt = await buildPromptApi("coverSuggestions", {
            ...contentBrief,
            hotspotLinked: hasSelectedHotspotMaterials(contentBrief),
            creationMode: "matrix",
            workflowContext: matrixWorkflowContext("angles", confirmedAngles.map((item) => item.angleId).join("|")),
            selectedAngle: angle,
            generatedContent: content,
            templateId: angle.recommendedTemplateId,
            selectedFeatureIds,
          });
          const rawCover = await generateTextApi(coverPrompt, { temperature: 0.45, maxTokens: 4096 });
          content = {
            ...content,
            imagePromptSuggestions: finalizeImagePromptSuggestions(content, angle, parseLLMJson(rawCover)),
          };
        }

        const compliancePrompt = await buildPromptApi("complianceReview", {
          ...contentBrief,
          hotspotLinked: hasSelectedHotspotMaterials(contentBrief),
          creationMode: "matrix",
          workflowContext: matrixWorkflowContext("angles", confirmedAngles.map((item) => item.angleId).join("|")),
          generatedContent: content,
          selectedFeatureIds,
        });
        const rawCompliance = await generateTextApi(compliancePrompt, { temperature: 0.2, maxTokens: 4096 });
        content.complianceReport = normalizeCompliance(parseLLMJson(rawCompliance), buildDefaultCompliance(content));
        nextResults.push(content);
      }

      setResults(nextResults);
      const firstResultId = nextResults[0]?.id || "";
      setActiveResultId(firstResultId);
      setConfirmedContentId(firstResultId);
      setConfirmedImageContentId(contentBrief.generationMode === "video-script" ? firstResultId : "");
      setReviewConfirmed(false);
      const entry: GenerationHistoryEntry = {
        historyEntryId: uid("history"),
        generatedAt: new Date().toISOString(),
        businessLine,
        generationSnapshot: contentBrief,
        results: nextResults,
      };
      setHistory((current) => [entry, ...current].slice(0, 3));
      setStatus(`已生成 ${nextResults.length} 篇正文，并自动保存到历史记录`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "正文生成失败");
    } finally {
      setIsGeneratingContent(false);
    }
  }

  function changeContentLength(contentLength: BriefInput["contentLength"]) {
    setBrief((current) => ({ ...current, contentLength }));
    setResults([]);
    setActiveResultId("");
    setConfirmedContentId("");
    setConfirmedImageContentId("");
    setReviewConfirmed(false);
  }

  function changeGenerationMode(generationMode: BriefInput["generationMode"]) {
    setBrief((current) => ({
      ...current,
      generationMode,
      contentLength: generationMode === "video-script" ? "30s" : "200-500",
    }));
    setResults([]);
    setActiveResultId("");
    setConfirmedContentId("");
    setConfirmedImageContentId("");
    setReviewConfirmed(false);
  }

  function changeActiveResult(id: string) {
    setActiveResultId(id);
    setConfirmedContentId(id);
    setConfirmedImageContentId(brief.generationMode === "video-script" ? id : "");
    setReviewConfirmed(false);
  }

  function updateResultImage(contentId: string, image: GeneratedImage) {
    setResults((current) => current.map((item) => {
      if (item.id !== contentId) return item;
      const targetIndex = image.imageIndex ?? image.promptIndex;
      const rest = (item.generatedImages || []).filter(
        (entry) => (entry.imageIndex ?? entry.promptIndex) !== targetIndex,
      );
      return { ...item, generatedImages: [...rest, image] };
    }));
    setConfirmedImageContentId("");
    setReviewConfirmed(false);
  }

  function updateResultVisualPlan(contentId: string, plan: VisualPlan | undefined) {
    setResults((current) => current.map((item) => item.id === contentId ? { ...item, visualPlan: plan } : item));
    setConfirmedImageContentId("");
    setReviewConfirmed(false);
  }

  function confirmImages() {
    if (!confirmedContent || !canConfirmImages) return;
    setConfirmedImageContentId(confirmedContent.id);
    setReviewConfirmed(false);
    setStatus(`已确认 ${confirmedContent.generatedImages?.length || 0} 张图片`);
  }

  function saveActiveDraft() {
    const draftContent = confirmedImageContent || activeResult;
    if (!draftContent || !confirmedBrief) return;
    const draft: Draft = {
      ...draftContent,
      savedAt: new Date().toISOString(),
      draftEntryId: uid("draft"),
      generationSnapshot: { ...confirmedBrief, contentLength: brief.contentLength },
    };
    setDrafts((current) => [draft, ...current].slice(0, 30));
    setStatus("已保存到左侧工具栏的草稿箱");
  }

  function goToStep(target: number) {
    setStep(target);
  }

  return (
    <div className="space-y-6">
      <WorkflowStepper
        steps={CREATION_WORKFLOW_STEPS}
        current={step === 4 ? 3 : step}
        onStepClick={goToStep}
        canClickStep={() => true}
        isStepComplete={(target) => {
          if (target === 1) return missingBriefSelections.length === 0;
          if (target === 2) return confirmedAngles.length > 0;
          if (target === 3) return Boolean(confirmedContentId);
          if (target === 5) return reviewConfirmed;
          return false;
        }}
      />

      {apiStatusResolved && !apiStatus.ready ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">LLM API 未配置</p>
            <p className="mt-1 leading-6 text-muted-foreground">请在项目根目录的 .env 中配置 LLM_API_KEY 后重启服务。</p>
          </div>
        </div>
      ) : null}

      {status ? <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">{status}</div> : null}

      {step === 1 ? (
        <WorkflowStageShell
          title="要素配置"
          description="选定产品、功能、场景、读者、人设与产品出现方式。系统会自动整理创作任务。"
          showConfirm={false}
          nextRequiresConfirmation={false}
          onNext={() => setStep(2)}
        >
          <BriefPanel brief={brief} offerFeatures={offerFeatures} workflowConfig={workflowConfig} onBriefChange={updateBrief} />
        </WorkflowStageShell>
      ) : null}

      {step === 2 ? (
        <WorkflowStageShell
          title="创意角度"
          description="默认生成 6 个角度。勾选一个或多个后立即生效，可直接进入正文生成。"
          confirmed={confirmedAngles.length > 0}
          showConfirm={false}
          onPrevious={() => setStep(1)}
          onNext={() => setStep(3)}
        >
          <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
            <BriefSummaryCard
              brief={confirmedBrief || brief}
              anglesSelected={selectedAngleIds.length}
              anglesTotal={angles.length}
              kbVersion={knowledge?.knowledgeBaseVersion}
              workflowConfig={workflowConfig}
            />
            <AnglesPanel
              angles={angles}
              selectedAngleIds={selectedAngleIds}
              isGenerating={isGeneratingAngles}
              onSelectedAngleIdsChange={changeSelectedAngles}
              onGenerate={generateAngles}
            />
          </div>
        </WorkflowStageShell>
      ) : null}

      {step === 3 ? (
        <WorkflowStageShell
          title="生成内容"
          description="选择图文或视频脚本并生成内容。当前结果会自动生效，每次生成会保留到最近 3 次历史记录。"
          confirmed={Boolean(confirmedContentId)}
          showConfirm={false}
          onPrevious={() => setStep(2)}
          onNext={() => setStep(brief.generationMode === "video-script" ? 5 : 4)}
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border/70 bg-muted/15 p-4">
            <div className="w-full max-w-xs space-y-2">
              <Label>内容形式</Label>
              <Select value={brief.generationMode} onChange={(event) => changeGenerationMode(event.target.value as BriefInput["generationMode"])}>
                <option value="image-text">图文内容</option>
                <option value="video-script">视频脚本</option>
              </Select>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Label>{brief.generationMode === "video-script" ? "视频时长" : "图文篇幅"}</Label>
              <Select value={brief.contentLength} onChange={(event) => changeContentLength(event.target.value as BriefInput["contentLength"])}>
                {getContentLengthOptions(brief.generationMode).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
            </div>
            <Button onClick={generateContent} disabled={isGeneratingContent || !apiStatus.ready || !confirmedAngles.length}>
              {isGeneratingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGeneratingContent ? "生成中…" : results.length ? "重新生成正文" : `生成正文（${confirmedAngles.length}）`}
            </Button>
          </div>
          {results.length ? (
            <ContentResultsPanel
              results={results}
              activeResultId={activeResult?.id || ""}
              isVideoScript={brief.generationMode === "video-script"}
              imageApiReady={apiStatus.image}
              imageModel={apiStatus.imageModel}
              onActiveResultChange={changeActiveResult}
              onEnterVisualStudio={(contentId) => {
                setActiveResultId(contentId);
                setConfirmedContentId(contentId);
                setStep(4);
              }}
              onSaveDraft={saveActiveDraft}
              onBackToAngles={() => setStep(2)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 py-16 text-center text-sm text-muted-foreground">尚未生成正文</div>
          )}
        </WorkflowStageShell>
      ) : null}

      {step === 4 && brief.generationMode !== "video-script" ? (
        <WorkflowStageShell
          title="生成图片"
          description="根据已确认的正文规划封面与内容图，完成生图后再确认。"
          confirmed={Boolean(confirmedImageContentId)}
          canConfirm={canConfirmImages}
          onConfirm={confirmImages}
          showConfirm={Boolean(confirmedContent)}
          onPrevious={() => setStep(3)}
          onNext={() => setStep(5)}
        >
          {confirmedContent ? (
            <VisualPlanStudio
              content={confirmedContent}
              brief={{ ...(confirmedBrief || brief), contentLength: brief.contentLength }}
              imageApiReady={apiStatus.image}
              imageModel={apiStatus.imageModel}
              workflowContext={matrixWorkflowContext("content", confirmedContent.id)}
              onVisualPlanChange={updateResultVisualPlan}
              onImageGenerated={updateResultImage}
            />
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 px-5 text-center">
              <p className="text-sm font-medium">尚未确认可用于制图的正文</p>
              <p className="text-xs leading-5 text-muted-foreground">请返回“生成内容”选择正文后，再进入图片制作。</p>
              <Button type="button" variant="outline" onClick={() => setStep(3)}>返回生成内容</Button>
            </div>
          )}
        </WorkflowStageShell>
      ) : null}

      {step === 5 ? (
        <WorkflowStageShell
          title="预览审核"
          description="统一预览正文、图片与合规结果。用户手动保存的版本会进入草稿箱。"
          confirmed={reviewConfirmed}
          canConfirm={Boolean(confirmedImageContent)}
          confirmLabel="确认审核"
          showConfirm={Boolean(confirmedImageContent)}
          onConfirm={() => {
            if (!confirmedImageContent) return;
            setReviewConfirmed(true);
            setStatus("预览审核已确认");
          }}
          onPrevious={() => setStep(brief.generationMode === "video-script" || !confirmedContent ? 3 : 4)}
        >
          {confirmedImageContent ? (
            <ReviewPanel content={confirmedImageContent} onSaveDraft={saveActiveDraft} />
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 px-5 text-center">
              <p className="text-sm font-medium">还没有可预览的内容</p>
              <p className="text-xs leading-5 text-muted-foreground">你可以先浏览本页；完成创意角度和内容生成后，预览结果会显示在这里。</p>
              <Button type="button" variant="outline" onClick={() => setStep(3)}>返回生成内容</Button>
            </div>
          )}
        </WorkflowStageShell>
      ) : null}
    </div>
  );
}
