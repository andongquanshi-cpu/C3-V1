"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BriefPanel } from "@/components/workspace/LicaitongBriefPanel";
import { AnglesPanel } from "@/components/workspace/LicaitongAnglesPanel";
import { ContentResultsPanel } from "@/components/workspace/ContentResultsPanel";
import { VisualPlanStudio } from "@/components/workspace/VisualPlanStudio";
import { BriefSummaryCard } from "@/components/workspace/BriefSummaryCard";
import { DraftBoxPanel } from "@/components/workspace/DraftBoxPanel";
import { WorkflowStepper } from "@/components/workspace/WorkflowStepper";
import {
  buildWorkflowDefaults,
  buildSuggestedTopic,
  filterOfferFeatures,
  getAnglesStatusMessage,
  getBriefStorageKey,
  normalizeContentLength,
  resolveWorkflowForLine,
} from "@/lib/business-line-workflow";
import { assessBriefProductIntegration, resolveBriefPromptSlice } from "@/lib/brief-prompt-context";
import { normalizeEmbedLevel, requiresStrictProductHierarchy } from "@/lib/embed-level";
import { validateGeneratedBody } from "@/lib/business-line-prompt";
import { resolveContentPromptAction } from "@/lib/content-generation-routing";
import { validateVideoScriptPayload } from "@/lib/video-script-quality";
import {
  buildHotspotSearchQueries,
  canProceedFromBrief,
  findStoredHotspotMaterial,
  getSelectedMaterials,
  isHotspotTabValidForLine,
  mergeHotspotSearchCandidates,
  normalizeHotspotTabForLine,
  sceneRequiresHotspotMaterials,
  type HotspotTabId,
} from "@/lib/hotspot-workflow";
import {
  filterMaterialsForPrompt,
  isHotspotLinkedBrief,
  stripHotspotSearchMaterials,
} from "@/lib/material-prompt-routing";
import {
  dedupeHotspotMaterials,
  filterHotspotForBusinessLine,
} from "@/lib/eastmoney-hotspot";
import {
  finalizeImagePromptSuggestions,
  shouldRequestCoverSuggestions,
} from "@/lib/image-prompt-utils";
import { parseLLMJson, safeJsonParse, cn } from "@/lib/utils";
import {
  buildAnglesConfigFingerprint,
  buildDefaultCompliance,
  normalizeAngles,
  normalizeCompliance,
  normalizeContent,
  uid,
} from "@/lib/workbench-utils";
import type {
  BriefInput,
  BusinessLine,
  CreativeAngle,
  Draft,
  GeneratedContent,
  GeneratedImage,
  KnowledgeListView,
  Material,
  VisualPlan,
} from "@/lib/types";

const WORKFLOW_STEPS = [
  { id: 1, label: "创作配置" },
  { id: 2, label: "创意角度" },
  { id: 3, label: "生成内容" },
];

type WorkbenchView = "workflow" | "drafts";

const LLM_NOT_CONFIGURED =
  "服务端未配置 LLM_API_KEY，请在项目根目录 .env 中设置后重启开发服务器";
const ANGLE_HISTORY_STORAGE_KEY = "c3-v0-angle-history";
const MAX_ANGLE_HISTORY_KEYS = 20;

interface ApiStatus {
  ready: boolean;
  text: boolean;
  image: boolean;
  imageModel?: string;
  hotspot: boolean;
  model?: string;
}

interface BusinessLineWorkbenchProps {
  businessLine: BusinessLine;
}

interface RecentAngleSummary {
  angleName: string;
  coreIdea: string;
  differentiationAxis?: string;
  userPainPoint?: string;
  contentStructure?: string;
  displayTags?: string[];
}

function summarizeAnglesForAvoidance(angles: CreativeAngle[]): RecentAngleSummary[] {
  return angles.slice(0, 5).map((angle) => ({
    angleName: angle.angleName,
    coreIdea: angle.coreIdea,
    differentiationAxis: angle.differentiationAxis,
    userPainPoint: angle.userPainPoint,
    contentStructure: angle.contentStructure,
    displayTags: angle.displayTags?.slice(0, 5),
  }));
}

function readAngleHistory() {
  if (typeof window === "undefined") return {};
  return safeJsonParse<Record<string, RecentAngleSummary[]>>(
    localStorage.getItem(ANGLE_HISTORY_STORAGE_KEY) || "",
    {},
  );
}

function resolveRecentAnglesForConfig(
  configKey: string,
  generatedForKey: string | null,
  currentAngles: CreativeAngle[],
) {
  if (generatedForKey === configKey && currentAngles.length > 0) {
    return summarizeAnglesForAvoidance(currentAngles);
  }
  return readAngleHistory()[configKey] || [];
}

function writeAngleHistory(configKey: string, angles: CreativeAngle[]) {
  const history = readAngleHistory();
  delete history[configKey];
  history[configKey] = summarizeAnglesForAvoidance(angles);
  const compact = Object.fromEntries(Object.entries(history).slice(-MAX_ANGLE_HISTORY_KEYS));
  localStorage.setItem(ANGLE_HISTORY_STORAGE_KEY, JSON.stringify(compact));
}

function buildDefaultBrief(businessLine: BusinessLine): BriefInput {
  return {
    businessLine,
    ...buildWorkflowDefaults(businessLine),
    generationMode: "image-text",
    bloggerLevel: "middle",
    embedLevel: "medium",
    contentLength: "200-500",
    generateCount: 2,
    customRequirement: "",
    materials: [],
  };
}

export function BusinessLineWorkbench({ businessLine }: BusinessLineWorkbenchProps) {
  const defaultBrief = useMemo(() => buildDefaultBrief(businessLine), [businessLine]);
  const storageKeys = useMemo(
    () => ({
      drafts: "c3-v0-drafts",
      materials: "c3-v0-materials",
      brief: getBriefStorageKey(businessLine),
    }),
    [businessLine],
  );

  const [view, setView] = useState<WorkbenchView>("workflow");
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState<BriefInput>(defaultBrief);
  const [knowledge, setKnowledge] = useState<KnowledgeListView | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ ready: false, text: false, image: false, hotspot: false });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialDraft, setMaterialDraft] = useState("");
  const [hotspotPanelOpen, setHotspotPanelOpen] = useState(false);
  const [activeHotspotTab, setActiveHotspotTab] = useState<HotspotTabId>("trending");
  const [customHotspotQuery, setCustomHotspotQuery] = useState("");
  const [hotspotCandidates, setHotspotCandidates] = useState<Material[]>([]);
  const [hotspotSearchError, setHotspotSearchError] = useState<string | null>(null);
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [selectedAngleIds, setSelectedAngleIds] = useState<string[]>([]);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeResultId, setActiveResultId] = useState("");
  const [contentSubView, setContentSubView] = useState<"result" | "studio">("result");
  const [status, setStatus] = useState("");
  const [isSearchingHotspot, setIsSearchingHotspot] = useState(false);
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [anglesGeneratedForKey, setAnglesGeneratedForKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = safeJsonParse<Partial<BriefInput>>(localStorage.getItem(storageKeys.brief) || "", {});
    const mode = stored.generationMode || defaultBrief.generationMode;
    setBrief({
      ...defaultBrief,
      ...stored,
      businessLine,
      generationMode: mode,
      contentLength: normalizeContentLength(stored.contentLength, mode),
      embedLevel: normalizeEmbedLevel(stored.embedLevel ?? defaultBrief.embedLevel),
    });
    setMaterials(safeJsonParse(localStorage.getItem(storageKeys.materials) || "", []));
    setDrafts(safeJsonParse(localStorage.getItem(storageKeys.drafts) || "", []));
    setStep(1);
    setView("workflow");
    setAngles([]);
    setSelectedAngleIds([]);
    setResults([]);
    setAnglesGeneratedForKey(null);

    fetch("/api/knowledge-base/list")
      .then((r) => r.json())
      .then((data: KnowledgeListView) => setKnowledge(data))
      .catch(() => setStatus("知识库加载失败"));

    fetch("/api/config/status")
      .then((r) => r.json())
      .then((data: ApiStatus) => setApiStatus(data))
      .catch(() => setApiStatus({ ready: false, text: false, image: false, hotspot: false }));
  }, [businessLine, defaultBrief, storageKeys.brief, storageKeys.drafts, storageKeys.materials]);

  useEffect(() => {
    setActiveHotspotTab((current) => {
      const normalized = normalizeHotspotTabForLine(current, businessLine);
      return isHotspotTabValidForLine(normalized, businessLine) ? normalized : "trending";
    });
  }, [businessLine]);

  useEffect(() => {
    localStorage.setItem(storageKeys.brief, JSON.stringify(brief));
  }, [brief, storageKeys.brief]);

  useEffect(() => {
    localStorage.setItem(storageKeys.materials, JSON.stringify(materials));
    setBrief((current) => ({ ...current, materials }));
  }, [materials, storageKeys.materials]);

  useEffect(() => {
    localStorage.setItem(storageKeys.drafts, JSON.stringify(drafts));
  }, [drafts, storageKeys.drafts]);

  const workflowConfig = useMemo(
    () => resolveWorkflowForLine(knowledge, businessLine),
    [knowledge, businessLine],
  );

  useEffect(() => {
    if (!knowledge) return;
    const names = brief.selectedFeatureIds
      .map((id) => knowledge.features.find((f) => f.id === id)?.name)
      .filter(Boolean) as string[];
    if (names.length && names.join("|") !== brief.selectedFeatureNames.join("|")) {
      setBrief((current) => ({ ...current, selectedFeatureNames: names }));
    }
  }, [brief.selectedFeatureIds, brief.selectedFeatureNames, knowledge]);

  const offerFeatures = useMemo(
    () => filterOfferFeatures(knowledge?.features || [], businessLine, brief.offerId, workflowConfig),
    [knowledge, businessLine, brief.offerId, workflowConfig],
  );

  const selectedAngles = useMemo(
    () => angles.filter((a) => selectedAngleIds.includes(a.angleId)),
    [angles, selectedAngleIds],
  );
  const activeResult = useMemo(
    () => results.find((r) => r.id === activeResultId) || results[0],
    [activeResultId, results],
  );
  const hotspotLinked = useMemo(
    () => isHotspotLinkedBrief(brief, workflowConfig),
    [brief.personaId, brief.creationScene, workflowConfig],
  );
  const promptMaterials = useMemo(
    () => filterMaterialsForPrompt(materials, hotspotLinked),
    [materials, hotspotLinked],
  );
  const anglesConfigKey = useMemo(
    () => buildAnglesConfigFingerprint(brief, promptMaterials),
    [brief, promptMaterials],
  );
  const selectedMaterials = useMemo(() => getSelectedMaterials(materials), [materials]);
  const canContinueFromBrief = useMemo(
    () => canProceedFromBrief(brief, materials, workflowConfig),
    [brief, materials, workflowConfig],
  );
  const suggestedTopic = useMemo(
    () => buildSuggestedTopic(brief, workflowConfig),
    [brief, workflowConfig],
  );
  const anglesUpToDate = anglesGeneratedForKey === anglesConfigKey && angles.length > 0;

  useEffect(() => {
    if (hotspotLinked) return;
    setMaterials((current) => {
      const next = stripHotspotSearchMaterials(current);
      return next.length === current.length ? current : next;
    });
    setHotspotPanelOpen(false);
    setHotspotCandidates([]);
  }, [hotspotLinked]);

  useEffect(() => {
    if (isGeneratingAngles) return;
    if (anglesGeneratedForKey && anglesConfigKey !== anglesGeneratedForKey) {
      setAngles([]);
      setSelectedAngleIds([]);
      setAnglesGeneratedForKey(null);
    }
  }, [anglesConfigKey, anglesGeneratedForKey, isGeneratingAngles]);

  useEffect(() => {
    // 切换到不同结果 / 离开第 3 步时，退出制图子视图
    setContentSubView("result");
  }, [activeResultId, step, view]);

  async function refreshApiStatus() {
    try {
      const response = await fetch("/api/config/status");
      const data = (await response.json()) as ApiStatus;
      setApiStatus(data);
      return data;
    } catch {
      return apiStatus;
    }
  }

  useEffect(() => {
    if (step !== 1 || view !== "workflow") return;
    void refreshApiStatus();
  }, [step, view]);

  function updateBrief(patch: Partial<BriefInput>) {
    setBrief((current) => ({ ...current, ...patch }));
  }

  function commitMaterialDraft() {
    const text = materialDraft.trim();
    if (!text) return;
    const material: Material = {
      id: uid("material"),
      title: text.split("\n")[0].slice(0, 48) || "手动素材",
      body: text,
      source: "手动输入",
      tags: ["粘贴"],
      selected: true,
      isPrimary: getSelectedMaterials(materials).length === 0,
      createdAt: new Date().toISOString(),
    };
    setMaterials((current) => [material, ...current].slice(0, 12));
    setMaterialDraft("");
    setStatus(hotspotLinked ? "素材已加入已选列表" : "背景补充已加入");
  }

  async function fetchEastMoneyNews(query: string) {
    const response = await fetch("/api/eastmoney-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "东财资讯搜索失败");
    }
    return (data.items || []) as Array<Pick<Material, "title" | "body" | "source">>;
  }

  async function searchHotspot(tab: HotspotTabId = activeHotspotTab) {
    setIsSearchingHotspot(true);
    setHotspotSearchError(null);
      setStatus("正在拉取热榜...");
    try {
      const queries = buildHotspotSearchQueries(tab, brief.topic, customHotspotQuery, businessLine);
      const errors: string[] = [];
      const batches: Awaited<ReturnType<typeof fetchEastMoneyNews>>[] = [];

      for (const query of queries) {
        try {
          batches.push(await fetchEastMoneyNews(query));
        } catch (error) {
          const message = error instanceof Error ? error.message : "东财资讯搜索失败";
          errors.push(message);
          batches.push([]);
        }
      }

      let mergedItems = filterHotspotForBusinessLine(
        dedupeHotspotMaterials(batches.flat()),
        businessLine,
        tab,
      );
      if (!mergedItems.length && errors.length === queries.length) {
        throw new Error(errors[0] || "东财 MCP 资讯搜索失败，请检查 EASTMONEY_API_KEY");
      }
      if (!mergedItems.length) {
        throw new Error("热榜结果质量过低（多为日报聚合页），请换「财经热搜」分类或手动粘贴新闻");
      }

      const normalizedResults = mergedItems.filter((item) => item.title);

      const next = mergeHotspotSearchCandidates(normalizedResults, materials);

      setHotspotCandidates(next);
      setMaterials((current) =>
        current.map((item) => {
          const refreshed = next.find((candidate) => findStoredHotspotMaterial([item], candidate));
          if (refreshed?.body?.trim()) {
            return { ...item, body: refreshed.body, tags: refreshed.tags || item.tags };
          }
          return item;
        }),
      );
      setHotspotSearchError(null);
      setStatus(
        next.length > 0
          ? `热榜 ${next.length} 条，勾选即可`
          : "暂无匹配资讯，可换分类、用主题搜索或手动粘贴",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "东财资讯搜索失败，可手动粘贴素材";
      setHotspotCandidates([]);
      setHotspotSearchError(message);
      setStatus(message);
    } finally {
      setIsSearchingHotspot(false);
    }
  }

  async function openHotspotPanel() {
    const nextStatus = await refreshApiStatus();
    if (!nextStatus.hotspot) {
      setStatus("未检测到 EASTMONEY_API_KEY，请到妙想平台领取后写入 .env 并重启 dev");
      return;
    }
    setHotspotPanelOpen(true);
    void searchHotspot(activeHotspotTab);
  }

  function changeHotspotTab(tab: HotspotTabId) {
    setHotspotPanelOpen(true);
    setActiveHotspotTab(tab);
    if (tab === "custom") {
      setHotspotCandidates([]);
      return;
    }
    void searchHotspot(tab);
  }

  function searchCustomHotspot() {
    const query = customHotspotQuery.trim() || brief.topic.trim();
    if (!query) {
      setStatus("请输入搜索问句，或先填写主题");
      return;
    }
    setHotspotPanelOpen(true);
    setActiveHotspotTab("custom");
    void searchHotspot("custom");
  }

  function editHotspotMaterials() {
    setHotspotPanelOpen(true);
    setView("workflow");
    setStep(1);
    if (hotspotCandidates.length === 0 && !isSearchingHotspot) {
      void searchHotspot(activeHotspotTab);
    }
  }

  function closeHotspotPanel() {
    setHotspotPanelOpen(false);
  }

  function toggleHotspotCandidate(candidate: Material, selected: boolean) {
    if (selected) {
      setMaterials((current) => {
        const stored = findStoredHotspotMaterial(current, candidate);
        const selectedCount = getSelectedMaterials(current).length;
        const nextItem: Material = {
          ...candidate,
          id: stored?.id || candidate.id,
          selected: true,
          isPrimary: selectedCount === 0 ? true : stored?.isPrimary,
          createdAt: stored?.createdAt || candidate.createdAt || new Date().toISOString(),
        };
        if (stored) {
          return current.map((item) => (item.id === stored.id ? nextItem : item));
        }
        return [nextItem, ...current].slice(0, 12);
      });
      setHotspotCandidates((current) =>
        current.map((item) => (item.id === candidate.id ? { ...item, selected: true } : item)),
      );
      setStatus(`已选用：${candidate.title.slice(0, 24)}…`);
      return;
    }

    setMaterials((current) => {
      const stored = findStoredHotspotMaterial(current, candidate);
      if (!stored) return current;
      const remaining = current.filter((item) => item.id !== stored.id);
      const stillSelected = getSelectedMaterials(remaining);
      if (stillSelected.length === 1 && !stillSelected[0]?.isPrimary) {
        return remaining.map((item) =>
          item.id === stillSelected[0].id ? { ...item, isPrimary: true } : item,
        );
      }
      return remaining;
    });
    setHotspotCandidates((current) =>
      current.map((item) => (item.id === candidate.id ? { ...item, selected: false } : item)),
    );
    setStatus("已取消选用该热点");
  }

  function setPrimaryMaterial(id: string) {
    setMaterials((current) =>
      current.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      })),
    );
  }

  function removeMaterial(id: string) {
    setMaterials((current) => current.filter((item) => item.id !== id));
  }

  function deselectHotspotMaterial(material: Material) {
    if (material.source === "手动输入") {
      removeMaterial(material.id);
      setStatus("已移除粘贴素材");
      return;
    }

    const candidate = hotspotCandidates.find((item) => {
      const stored = findStoredHotspotMaterial(materials, item);
      return stored?.id === material.id || item.id === material.id;
    });

    if (candidate) {
      toggleHotspotCandidate(candidate, false);
      return;
    }

    removeMaterial(material.id);
    setStatus("已取消选用该热点");
  }

  function clearHotspotSelection() {
    const selected = getSelectedMaterials(materials);
    if (!selected.length) return;

    const selectedIds = new Set(selected.map((item) => item.id));
    setMaterials((current) => current.filter((item) => !selectedIds.has(item.id)));
    setHotspotCandidates((current) => current.map((item) => ({ ...item, selected: false })));
    setStatus("已清空选用");
  }

  async function buildPrompt(action: string, input: Record<string, unknown>) {
    const response = await fetch("/api/prompt-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, input }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Prompt Engine 失败");
    return data as { system: string; user: string };
  }

  async function callTextModel(prompt: { system: string; user: string }, options: { temperature?: number; maxTokens?: number } = {}) {
    const response = await fetch("/api/llm-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 4096,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "文字生成失败");
    return data.choices?.[0]?.message?.content || "";
  }

  async function generateAngles() {
    const configKey = anglesConfigKey;
    const avoidRecentAngles = resolveRecentAnglesForConfig(configKey, anglesGeneratedForKey, angles);
    setIsGeneratingAngles(true);
    setStatus(
      avoidRecentAngles.length > 0
        ? "正在刷新创意角度，并避开上一批相似表达..."
        : getAnglesStatusMessage(businessLine),
    );
    setAngles([]);
    setSelectedAngleIds([]);
    setAnglesGeneratedForKey(null);
    try {
      if (!apiStatus.ready) throw new Error(LLM_NOT_CONFIGURED);
      const input = {
        ...brief,
        materials: promptMaterials,
        hotspotLinked,
        workflowConfig,
        avoidRecentAngles,
        diversitySeed: uid("angle_batch"),
      };
      const prompt = await buildPrompt("creativeAngles", input);
      const hasHotspotMaterials = hotspotLinked && promptMaterials.some((item) => item.source !== "手动输入");
      const raw = await callTextModel(prompt, {
        temperature: avoidRecentAngles.length > 0 ? 0.75 : hasHotspotMaterials ? 0.58 : 0.45,
        maxTokens: 8192,
      });
      const normalized = normalizeAngles(parseLLMJson(raw), brief);
      setAngles(normalized);
      setSelectedAngleIds([]);
      setAnglesGeneratedForKey(configKey);
      writeAngleHistory(configKey, normalized);
      setStatus(`已生成 ${normalized.length} 个创意角度，请勾选要写成正文的角度（可点全选）`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "创意角度生成失败");
    } finally {
      setIsGeneratingAngles(false);
    }
  }

  async function generateContent() {
    if (!apiStatus.ready) {
      setStatus(LLM_NOT_CONFIGURED);
      return;
    }
    if (angles.length === 0) {
      setStatus("请先在上方生成创意角度");
      return;
    }
    if (!selectedAngles.length) {
      setStatus("请至少勾选一个创意角度（点击下方角度卡片左侧复选框）");
      return;
    }
    setIsGeneratingContent(true);
    setStatus("正在生成正文并完成合规审查...");
    try {
      const nextResults: GeneratedContent[] = [];
      const failedAngles: string[] = [];
      const isVideo = (brief.generationMode || "image-text") === "video-script";
      const needsProductEmbed = requiresStrictProductHierarchy(brief.embedLevel);
      const maxAttempts = isVideo ? 3 : needsProductEmbed ? 3 : 2;

      for (let angleIndex = 0; angleIndex < selectedAngles.length; angleIndex++) {
        const angle = selectedAngles[angleIndex];
        const ordinal = angleIndex + 1;
        const total = selectedAngles.length;

        try {
          setStatus(`正在生成第 ${ordinal}/${total} 条：「${angle.angleName}」…`);

          const contentAction = resolveContentPromptAction(brief);
          let content: GeneratedContent | null = null;
          let lastError = "";
          let lastMissingFeatures: string[] = [];
          const briefSlice = resolveBriefPromptSlice({ ...brief }, workflowConfig);

          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const retryHint =
              attempt > 0
                ? isVideo
                  ? "\n\n【重试 · 上次只有镜头时长占位、没有口播原文】本次 storyboard 每镜 voiceover 和 visual 必填，每镜口播≥12字，content 写完整分镜稿。"
                  : needsProductEmbed
                    ? `\n\n【重试 · high 强硬植入不合规】层级：${briefSlice.brandName}(平台) → ${briefSlice.offerLabel}(主推产品) → 子功能。${
                        lastMissingFeatures.length
                          ? `须补充子功能：${lastMissingFeatures.join("、")}，且必须写在${briefSlice.offerLabel}的语境里。`
                          : ""
                      }正文须同时体现平台、主推产品「${briefSlice.offerLabel}」，禁止只写子功能。`
                    : lastError === "模型返回的 JSON 格式有误"
                      ? "\n\n【重试 · 上次 JSON 非法】只输出合法 JSON：不要用 Markdown 代码块；字符串里的换行写成 \\n，双引号写成 \\\"；确保括号配对完整。"
                      : ""
                : "";
            const contentPrompt = await buildPrompt(contentAction, {
              ...brief,
              materials: promptMaterials,
              hotspotLinked,
              workflowConfig,
              selectedAngle: angle,
              templateId: angle.recommendedTemplateId,
              selectedFeatureIds:
                normalizeEmbedLevel(brief.embedLevel) === "none"
                  ? []
                  : [...new Set([...(brief.selectedFeatureIds || []), ...(angle.recommendedFeatureIds || [])])],
            });
            const rawContent = await callTextModel(
              { system: contentPrompt.system, user: contentPrompt.user + retryHint },
              {
                maxTokens: isVideo ? 12288 : 8192,
                temperature: isVideo ? (attempt > 0 ? 0.72 : 0.62) : attempt > 0 ? 0.78 : 0.72,
              },
            );
            let parsed: Record<string, unknown>;
            try {
              parsed = parseLLMJson<Record<string, unknown>>(rawContent);
            } catch {
              lastError = "模型返回的 JSON 格式有误（可能输出被截断）";
              if (attempt < maxAttempts - 1) {
                setStatus(`第 ${ordinal}/${total} 条「${angle.angleName}」JSON 解析失败，正在重试…`);
              }
              continue;
            }
            const candidate = normalizeContent(parsed, angle, { generationMode: brief.generationMode });
            if (isVideo) {
              const videoCheck = validateVideoScriptPayload(candidate.content, parsed);
              if (!videoCheck.ok) {
                lastError = videoCheck.reason || "视频脚本不完整";
                if (attempt < maxAttempts - 1) {
                  setStatus(`第 ${ordinal}/${total} 条「${angle.angleName}」${lastError}，正在重试…`);
                }
                continue;
              }
            }
            const bodyCheck = validateGeneratedBody(candidate.content, brief.businessLine, brief.generationMode);
            if (!bodyCheck.ok) {
              lastError = bodyCheck.reason || "质检未通过";
              if (isVideo && attempt < maxAttempts - 1) {
                setStatus(`第 ${ordinal}/${total} 条「${angle.angleName}」${lastError}，正在重试…`);
              }
              continue;
            }
            const embedCheck = assessBriefProductIntegration(candidate.content, brief.embedLevel, briefSlice);
            if (!embedCheck.ok) {
              lastError = embedCheck.reason || "植入质检未通过";
              lastMissingFeatures = embedCheck.missingFeatures;
              if (needsProductEmbed) {
                setStatus(`第 ${ordinal}/${total} 条「${angle.angleName}」${lastError}，正在重试…`);
              }
              continue;
            }
            if (!candidate.content.trim()) {
              lastError = "正文为空";
              continue;
            }
            content = candidate;
            break;
          }

          if (!content) {
            failedAngles.push(`「${angle.angleName}」${lastError || "生成失败"}`);
            continue;
          }

          const isImageText = !isVideo;
          if (isImageText && shouldRequestCoverSuggestions(content.imagePromptSuggestions)) {
            setStatus(`第 ${ordinal}/${total} 条：正在为「${angle.angleName}」生成封面 Prompt…`);
            const coverPrompt = await buildPrompt("coverSuggestions", {
              ...brief,
              materials: promptMaterials,
              hotspotLinked,
              selectedAngle: angle,
              generatedContent: content,
              templateId: angle.recommendedTemplateId,
              selectedFeatureIds: [...new Set([...brief.selectedFeatureIds, ...angle.recommendedFeatureIds])],
            });
            const rawCover = await callTextModel(coverPrompt, { temperature: 0.45, maxTokens: 4096 });
            let coverPayload: unknown;
            try {
              coverPayload = parseLLMJson(rawCover);
            } catch {
              coverPayload = undefined;
            }
            content = {
              ...content,
              imagePromptSuggestions: finalizeImagePromptSuggestions(content, angle, coverPayload),
            };
          }

          setStatus(`第 ${ordinal}/${total} 条：正在为「${angle.angleName}」完成合规审查…`);
          const defaultCompliance = buildDefaultCompliance(content, { generationMode: brief.generationMode });
          try {
            const compliancePrompt = await buildPrompt("complianceReview", {
              ...brief,
              generatedContent: content,
              selectedFeatureIds: [...new Set([...brief.selectedFeatureIds, ...angle.recommendedFeatureIds])],
            });
            const rawCompliance = await callTextModel(compliancePrompt, { temperature: 0.2, maxTokens: 4096 });
            content.complianceReport = normalizeCompliance(parseLLMJson(rawCompliance), defaultCompliance);
          } catch {
            content.complianceReport = defaultCompliance;
          }

          nextResults.push(content);
        } catch (error) {
          const message = error instanceof Error ? error.message : "未知错误";
          failedAngles.push(`「${angle.angleName}」${message}`);
          console.error(`[generateContent] angle ${angle.angleId}`, error);
        }
      }

      setResults(nextResults);
      setActiveResultId(nextResults[0]?.id || "");
      setView("workflow");
      setStep(3);

      if (nextResults.length === selectedAngles.length) {
        setStatus(`已生成 ${nextResults.length} 条${isVideo ? "视频脚本" : "内容"}`);
      } else if (nextResults.length > 0) {
        setStatus(
          `已生成 ${nextResults.length}/${selectedAngles.length} 条；未成功 ${failedAngles.length} 条：${failedAngles.join("；")}`,
        );
      } else {
        setStatus(
          failedAngles.length
            ? `全部角度生成失败：${failedAngles.join("；")}`
            : "全部角度生成失败，请检查植入档位或换角度后重试",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "内容生成失败";
      setStatus(`内容生成失败：${message}`);
      console.error("[generateContent]", error);
    } finally {
      setIsGeneratingContent(false);
    }
  }

  function saveActiveDraft() {
    if (!activeResult) return;
    const draft: Draft = {
      ...activeResult,
      savedAt: new Date().toISOString(),
      draftEntryId: uid("draft"),
      generationSnapshot: { ...brief, materials: promptMaterials },
    };
    setDrafts((current) => [draft, ...current].slice(0, 30));
    setView("drafts");
    setStatus("已保存到草稿箱");
  }

  function updateResultImage(contentId: string, image: GeneratedImage) {
    setResults((current) =>
      current.map((item) => {
        if (item.id !== contentId) return item;
        const targetIndex = image.imageIndex ?? image.promptIndex;
        const rest = (item.generatedImages || []).filter((entry) => {
          const entryIndex = entry.imageIndex ?? entry.promptIndex;
          return entryIndex !== targetIndex;
        });
        return { ...item, generatedImages: [...rest, image] };
      }),
    );
  }

  function updateResultVisualPlan(contentId: string, plan: VisualPlan | undefined) {
    setResults((current) =>
      current.map((item) => (item.id === contentId ? { ...item, visualPlan: plan } : item)),
    );
  }

  function deleteDraft(draftEntryId: string) {
    setDrafts((current) => current.filter((item) => (item.draftEntryId || `${item.id}_${item.savedAt}`) !== draftEntryId));
    setStatus("草稿已删除");
  }

  function goToWorkflowStep(nextStep: number) {
    setView("workflow");
    if (nextStep === 1 || nextStep <= step || (nextStep === 2 && angles.length > 0) || (nextStep === 3 && results.length > 0)) {
      setStep(nextStep);
      if (nextStep === 1 && getSelectedMaterials(materials).length > 0) {
        setHotspotPanelOpen(true);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <WorkflowStepper
            steps={WORKFLOW_STEPS}
            current={step}
            onStepClick={goToWorkflowStep}
            canClickStep={(targetStep) =>
              targetStep === 1 || (targetStep === 2 && angles.length > 0) || (targetStep === 3 && results.length > 0)
            }
            isStepComplete={(targetStep) =>
              (targetStep === 2 && angles.length > 0) || (targetStep === 3 && results.length > 0)
            }
          />
        </div>
        <button
          type="button"
          onClick={() => setView((current) => (current === "drafts" ? "workflow" : "drafts"))}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            view === "drafts"
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/80 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
          )}
        >
          <Archive className="h-4 w-4" />
          <span>草稿箱</span>
          {drafts.length > 0 ? (
            <Badge variant={view === "drafts" ? "default" : "secondary"} className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
              {drafts.length}
            </Badge>
          ) : null}
        </button>
      </div>

      {!apiStatus.ready ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">LLM API 未配置</p>
            <p className="mt-1 leading-6 text-muted-foreground">
              请在项目根目录创建 <code className="text-foreground">.env</code>，填入{" "}
              <code className="text-foreground">LLM_API_KEY</code> 后重启开发服务器。可参考{" "}
              <code className="text-foreground">.env.example</code>。
            </p>
          </div>
        </div>
      ) : null}

      {status ? (
        <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
          {status}
        </div>
      ) : null}

      <div className="min-w-0 space-y-6">
        {view === "drafts" ? (
          <DraftBoxPanel drafts={drafts} onDeleteDraft={deleteDraft} onBackToWorkflow={() => setView("workflow")} />
        ) : null}

        {view === "workflow" && step === 1 && (
          <BriefPanel
            brief={brief}
            materials={materials}
            materialDraft={materialDraft}
            offerFeatures={offerFeatures}
            workflowConfig={workflowConfig}
            hotspotPanelOpen={hotspotPanelOpen}
            activeHotspotTab={activeHotspotTab}
            customHotspotQuery={customHotspotQuery}
            hotspotCandidates={hotspotCandidates}
            isSearchingHotspot={isSearchingHotspot}
            hotspotSearchError={hotspotSearchError}
            canContinue={canContinueFromBrief}
            topicExample={suggestedTopic}
            onBriefChange={(patch) => {
              if (typeof patch === "function") setBrief((c) => patch(c));
              else updateBrief(patch);
            }}
            onMaterialDraftChange={setMaterialDraft}
            onMaterialDraftCommit={commitMaterialDraft}
            onCustomHotspotQueryChange={setCustomHotspotQuery}
            onCustomHotspotSearch={searchCustomHotspot}
            onSearchHotspot={openHotspotPanel}
            onHotspotTabChange={changeHotspotTab}
            onToggleCandidate={toggleHotspotCandidate}
            onSetPrimaryMaterial={setPrimaryMaterial}
            onRemoveMaterial={removeMaterial}
            onDeselectHotspot={deselectHotspotMaterial}
            onClearHotspotSelection={clearHotspotSelection}
            onEditHotspotMaterials={editHotspotMaterials}
            onCloseHotspotPanel={closeHotspotPanel}
            onContinue={() => {
              if (!canContinueFromBrief) {
                const needsSceneHotspot = sceneRequiresHotspotMaterials(brief.creationScene, workflowConfig);
                setStatus(
                  needsSceneHotspot
                    ? "市场热点解读需先选择至少 1 条热点素材"
                    : brief.personaId === "hotspot_observer"
                      ? "市场观察员需先选择至少 1 条热点素材"
                      : "请先选择至少 1 条热点素材",
                );
                return;
              }
              setView("workflow");
              setStep(2);
            }}
          />
        )}

        {view === "workflow" && step === 2 && (
          <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="xl:sticky xl:top-4 xl:self-start">
              <BriefSummaryCard
                brief={brief}
                materials={materials}
                anglesSelected={selectedAngleIds.length}
                anglesTotal={angles.length}
                kbVersion={knowledge?.knowledgeBaseVersion}
                workflowConfig={workflowConfig}
              />
            </aside>
            <AnglesPanel
              brief={brief}
              angles={angles}
              selectedAngleIds={selectedAngleIds}
              isGeneratingAngles={isGeneratingAngles}
              isGeneratingContent={isGeneratingContent}
              anglesUpToDate={anglesUpToDate}
              hasGeneratedContent={results.length > 0}
              apiReady={apiStatus.ready}
              onBriefChange={updateBrief}
              onBriefReplace={(updater) => setBrief(updater)}
              onSelectedAngleIdsChange={setSelectedAngleIds}
              onGenerateAngles={generateAngles}
              onGenerateContent={generateContent}
              onBackToConfig={editHotspotMaterials}
            />
          </div>
        )}

        {view === "workflow" && step === 3 && (
          <div className="space-y-5">
            {results.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                暂无生成结果
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    返回角度
                  </Button>
                </div>
              </div>
            ) : contentSubView === "studio" && activeResult && (brief.generationMode || "image-text") !== "video-script" ? (
              <VisualPlanStudio
                content={activeResult}
                brief={brief}
                imageApiReady={apiStatus.image}
                imageModel={apiStatus.imageModel}
                onBack={() => setContentSubView("result")}
                onVisualPlanChange={updateResultVisualPlan}
                onImageGenerated={updateResultImage}
              />
            ) : (
              <ContentResultsPanel
                results={results}
                activeResultId={activeResult?.id || results[0]?.id || ""}
                isVideoScript={(brief.generationMode || "image-text") === "video-script"}
                imageApiReady={apiStatus.image}
                imageModel={apiStatus.imageModel}
                onActiveResultChange={setActiveResultId}
                onEnterVisualStudio={(contentId) => {
                  setActiveResultId(contentId);
                  setContentSubView("studio");
                }}
                onSaveDraft={saveActiveDraft}
                onBackToAngles={() => setStep(2)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
