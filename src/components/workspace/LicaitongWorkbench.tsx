"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LicaitongBriefPanel } from "@/components/workspace/LicaitongBriefPanel";
import { LicaitongAnglesPanel } from "@/components/workspace/LicaitongAnglesPanel";
import { BriefSummaryCard } from "@/components/workspace/BriefSummaryCard";
import { DraftBoxPanel } from "@/components/workspace/DraftBoxPanel";
import { ImagePromptLab } from "@/components/workspace/ImagePromptLab";
import { WorkflowStepper } from "@/components/workspace/WorkflowStepper";
import { buildLicaitongDefaults, FALLBACK_LICAITONG_WORKFLOW, normalizeContentLength } from "@/lib/licaitong-workflow";
import { validateGeneratedBody } from "@/lib/business-line-prompt";
import {
  buildHotspotSearchQuery,
  canProceedFromBrief,
  getSelectedMaterials,
  type HotspotTabId,
} from "@/lib/hotspot-workflow";
import { HOTSPOT_TAB_DOMAINS, normalizeHotspotFromTavily, buildHotspotSearchFallbackQuery } from "@/lib/hotspot-display";
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
  ComplianceReport,
  CreativeAngle,
  Draft,
  GeneratedContent,
  KnowledgeListView,
  Material,
} from "@/lib/types";

const STORAGE_KEYS = {
  drafts: "c3-v0-drafts",
  materials: "c3-v0-materials",
  brief: "c3-v0-brief-licaitong",
};

const LICAITONG_STEPS = [
  { id: 1, label: "创作配置" },
  { id: 2, label: "创意角度" },
  { id: 3, label: "生成内容" },
];

type WorkbenchView = "workflow" | "drafts";

const LLM_NOT_CONFIGURED =
  "服务端未配置 LLM_API_KEY，请在项目根目录 .env 中设置后重启开发服务器";

const DEFAULT_BRIEF: BriefInput = {
  businessLine: "licaitong",
  ...buildLicaitongDefaults(),
  generationMode: "image-text",
  bloggerLevel: "middle",
  embedLevel: "low",
  contentLength: "200-500",
  generateCount: 2,
  customRequirement: "",
  materials: [],
};

interface ApiStatus {
  ready: boolean;
  text: boolean;
  image: boolean;
  imageModel?: string;
  hotspot: boolean;
  model?: string;
}

export function LicaitongWorkbench() {
  const [view, setView] = useState<WorkbenchView>("workflow");
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState<BriefInput>(DEFAULT_BRIEF);
  const [knowledge, setKnowledge] = useState<KnowledgeListView | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ ready: false, text: false, image: false, hotspot: false });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialDraft, setMaterialDraft] = useState("");
  const [hotspotPanelOpen, setHotspotPanelOpen] = useState(false);
  const [activeHotspotTab, setActiveHotspotTab] = useState<HotspotTabId>("finance");
  const [customHotspotQuery, setCustomHotspotQuery] = useState("");
  const [hotspotCandidates, setHotspotCandidates] = useState<Material[]>([]);
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [selectedAngleIds, setSelectedAngleIds] = useState<string[]>([]);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeResultId, setActiveResultId] = useState("");
  const [status, setStatus] = useState("");
  const [isSearchingHotspot, setIsSearchingHotspot] = useState(false);
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [anglesGeneratedForKey, setAnglesGeneratedForKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = safeJsonParse<Partial<BriefInput>>(localStorage.getItem(STORAGE_KEYS.brief) || "", {});
    const mode = stored.generationMode || DEFAULT_BRIEF.generationMode;
    setBrief({
      ...DEFAULT_BRIEF,
      ...stored,
      businessLine: "licaitong",
      generationMode: mode,
      contentLength: normalizeContentLength(stored.contentLength, mode),
    });
    setMaterials(safeJsonParse(localStorage.getItem(STORAGE_KEYS.materials) || "", []));
    setDrafts(safeJsonParse(localStorage.getItem(STORAGE_KEYS.drafts) || "", []));

    fetch("/api/knowledge-base/list")
      .then((r) => r.json())
      .then((data: KnowledgeListView) => setKnowledge(data))
      .catch(() => setStatus("知识库加载失败"));

    fetch("/api/config/status")
      .then((r) => r.json())
      .then((data: ApiStatus) => setApiStatus(data))
      .catch(() => setApiStatus({ ready: false, text: false, image: false, hotspot: false }));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.brief, JSON.stringify(brief));
  }, [brief]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.materials, JSON.stringify(materials));
    setBrief((current) => ({ ...current, materials }));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(drafts));
  }, [drafts]);

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
    () => (knowledge?.features || []).filter((f) => f.offerId === "fixed-income-plus"),
    [knowledge],
  );
  const workflowConfig = useMemo(
    () => knowledge?.licaitongWorkflow ?? FALLBACK_LICAITONG_WORKFLOW,
    [knowledge],
  );
  const selectedAngles = useMemo(
    () => angles.filter((a) => selectedAngleIds.includes(a.angleId)),
    [angles, selectedAngleIds],
  );
  const activeResult = useMemo(
    () => results.find((r) => r.id === activeResultId) || results[0],
    [activeResultId, results],
  );
  const anglesConfigKey = useMemo(
    () => buildAnglesConfigFingerprint(brief, materials),
    [brief, materials],
  );
  const selectedMaterials = useMemo(() => getSelectedMaterials(materials), [materials]);
  const canContinueFromBrief = useMemo(
    () => canProceedFromBrief(brief.personaId, materials),
    [brief.personaId, materials],
  );
  const anglesUpToDate = anglesGeneratedForKey === anglesConfigKey && angles.length > 0;

  useEffect(() => {
    if (isGeneratingAngles) return;
    if (anglesGeneratedForKey && anglesConfigKey !== anglesGeneratedForKey) {
      setAngles([]);
      setSelectedAngleIds([]);
      setAnglesGeneratedForKey(null);
    }
  }, [anglesConfigKey, anglesGeneratedForKey, isGeneratingAngles]);

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
    setStatus("素材已加入已选列表");
  }

  async function fetchHotspotResults(
    query: string,
    options: { includeDomains?: string[]; timeRange?: "day" | "week" | "month" } = {},
  ) {
    const response = await fetch("/api/tavily-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        maxResults: 8,
        topic: "news",
        timeRange: options.timeRange || "week",
        searchDepth: "basic",
        ...(options.includeDomains?.length ? { includeDomains: options.includeDomains } : {}),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Tavily API Key 无效，请到 tavily.com Dashboard 重新复制 Key 并更新 .env");
      }
      throw new Error(data.error || "热点搜索失败");
    }
    return (data.results || []) as Array<{ title?: string; content?: string; snippet?: string; url?: string }>;
  }

  async function searchHotspot(tab: HotspotTabId = activeHotspotTab) {
    setIsSearchingHotspot(true);
    setStatus("正在搜索热点...");
    try {
      const query = buildHotspotSearchQuery(tab, brief.topic, customHotspotQuery);
      const includeDomains = HOTSPOT_TAB_DOMAINS[tab];

      let rawResults = await fetchHotspotResults(query, { includeDomains, timeRange: "week" });
      if (rawResults.length === 0 && includeDomains?.length) {
        rawResults = await fetchHotspotResults(query, { timeRange: "week" });
      }
      if (rawResults.length === 0) {
        const fallbackQuery = buildHotspotSearchFallbackQuery(tab, customHotspotQuery);
        rawResults = await fetchHotspotResults(fallbackQuery, { timeRange: "week" });
      }

      const next: Material[] = rawResults
        .slice(0, 8)
        .map((item) => {
          const normalized = normalizeHotspotFromTavily(item);
          return {
            id: uid("hotspot"),
            title: normalized.title,
            body: normalized.body,
            source: normalized.source,
            tags: ["热点"],
            selected: false,
            createdAt: new Date().toISOString(),
          };
        })
        .filter((item) => item.title);

      setHotspotCandidates(next);
      setStatus(next.length > 0 ? `找到 ${next.length} 条热点，请勾选要使用的素材` : "暂无匹配热点，可换分类或自定义搜索词");
    } catch (error) {
      setHotspotCandidates([]);
      setStatus(error instanceof Error ? error.message : "热点搜索失败，可手动粘贴素材");
    } finally {
      setIsSearchingHotspot(false);
    }
  }

  async function openHotspotPanel() {
    const status = await refreshApiStatus();
    if (!status.hotspot) {
      setStatus("未检测到 TAVILY_API_KEY，请保存 .env 后重启 npm run dev");
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
    const query = customHotspotQuery.trim();
    if (!query) {
      setStatus("请输入搜索词");
      return;
    }
    setHotspotPanelOpen(true);
    setActiveHotspotTab("custom");
    void searchHotspot("custom");
  }

  function toggleHotspotCandidate(candidate: Material, selected: boolean) {
    if (selected) {
      setMaterials((current) => {
        const exists = current.find((item) => item.id === candidate.id);
        const selectedCount = getSelectedMaterials(current).length;
        const nextItem: Material = {
          ...candidate,
          selected: true,
          isPrimary: selectedCount === 0 ? true : exists?.isPrimary,
        };
        if (exists) {
          return current.map((item) => (item.id === candidate.id ? { ...item, selected: true } : item));
        }
        return [nextItem, ...current].slice(0, 12);
      });
      setStatus(`已选用：${candidate.title.slice(0, 24)}…`);
      return;
    }
    setMaterials((current) => current.filter((item) => item.id !== candidate.id));
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
    setIsGeneratingAngles(true);
    setStatus("正在检索固收+ 知识库并生成创意角度...");
    setAngles([]);
    setSelectedAngleIds([]);
    setAnglesGeneratedForKey(null);
    try {
      if (!apiStatus.ready) throw new Error(LLM_NOT_CONFIGURED);
      const input = { ...brief, materials: selectedMaterials };
      const prompt = await buildPrompt("creativeAngles", input);
      const raw = await callTextModel(prompt, { temperature: 0.35, maxTokens: 8192 });
      const normalized = normalizeAngles(parseLLMJson(raw), brief);
      setAngles(normalized);
      setSelectedAngleIds([]);
      setAnglesGeneratedForKey(configKey);
      setStatus(`已生成 ${normalized.length} 个创意角度，请勾选要写成稿的角度`);
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
    if (!selectedAngles.length) {
      setStatus("请至少选择一个创意角度");
      return;
    }
    setIsGeneratingContent(true);
    setStatus("正在生成正文并完成合规审查...");
    try {
      const nextResults: GeneratedContent[] = [];
      for (const angle of selectedAngles) {
        const contentAction = brief.personaId ? "personaContent" : "contentGeneration";
        const contentPrompt = await buildPrompt(contentAction, {
          ...brief,
          materials: selectedMaterials,
          selectedAngle: angle,
          templateId: angle.recommendedTemplateId,
          selectedFeatureIds: [...new Set([...brief.selectedFeatureIds, ...angle.recommendedFeatureIds])],
        });
        const rawContent = await callTextModel(contentPrompt, { maxTokens: 8192 });
        const content = normalizeContent(parseLLMJson(rawContent), angle);
        const bodyCheck = validateGeneratedBody(content.content, brief.businessLine);
        if (!bodyCheck.ok) {
          throw new Error(`正文质检未通过：${bodyCheck.reason}。请调整「产品出现方式」或换角度后重试。`);
        }
        if (!content.content.trim()) {
          throw new Error("模型返回的正文为空，请重试或检查人设 Prompt 输出格式");
        }
        const compliancePrompt = await buildPrompt("complianceReview", {
          ...brief,
          generatedContent: content,
          selectedFeatureIds: [...new Set([...brief.selectedFeatureIds, ...angle.recommendedFeatureIds])],
        });
        const rawCompliance = await callTextModel(compliancePrompt, { temperature: 0.2, maxTokens: 4096 });
        content.complianceReport = normalizeCompliance(parseLLMJson(rawCompliance), buildDefaultCompliance(content));
        nextResults.push(content);
      }
      setResults(nextResults);
      setActiveResultId(nextResults[0]?.id || "");
      setView("workflow");
      setStep(3);
      setStatus(`已生成 ${nextResults.length} 条内容`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "内容生成失败");
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
      generationSnapshot: { ...brief, materials: selectedMaterials },
    };
    setDrafts((current) => [draft, ...current].slice(0, 30));
    setView("drafts");
    setStatus("已保存到草稿箱");
  }

  function deleteDraft(draftEntryId: string) {
    setDrafts((current) => current.filter((item) => (item.draftEntryId || `${item.id}_${item.savedAt}`) !== draftEntryId));
    setStatus("草稿已删除");
  }

  function goToWorkflowStep(nextStep: number) {
    setView("workflow");
    if (nextStep <= step) setStep(nextStep);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <WorkflowStepper steps={LICAITONG_STEPS} current={step} onStepClick={goToWorkflowStep} />
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
          <DraftBoxPanel
            drafts={drafts}
            onDeleteDraft={deleteDraft}
            onBackToWorkflow={() => setView("workflow")}
          />
        ) : null}

        {view === "workflow" && step === 1 && (
            <LicaitongBriefPanel
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
              canContinue={canContinueFromBrief}
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
              onContinue={() => {
                if (!canContinueFromBrief) {
                  setStatus("市场观察员需先选择至少 1 条热点素材");
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
              <LicaitongAnglesPanel
                brief={brief}
                angles={angles}
                selectedAngleIds={selectedAngleIds}
                isGeneratingAngles={isGeneratingAngles}
                isGeneratingContent={isGeneratingContent}
                anglesUpToDate={anglesUpToDate}
                apiReady={apiStatus.ready}
                onBriefChange={updateBrief}
                onBriefReplace={(updater) => setBrief(updater)}
                onSelectedAngleIdsChange={setSelectedAngleIds}
                onGenerateAngles={generateAngles}
                onGenerateContent={generateContent}
                onBackToConfig={() => setStep(1)}
              />
            </div>
          )}

          {view === "workflow" && step === 3 && (
            <div className="space-y-5">
              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  暂无生成结果
                  <div className="mt-4"><Button variant="secondary" onClick={() => setStep(2)}>返回角度</Button></div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {results.map((item) => (
                      <Button key={item.id} size="sm" variant={activeResult?.id === item.id ? "default" : "secondary"} onClick={() => setActiveResultId(item.id)}>
                        {item.selectedTitle}
                      </Button>
                    ))}
                  </div>
                  {activeResult ? (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                      <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <Badge variant="secondary">{activeResult.angleName}</Badge>
                        <h2 className="mt-3 text-xl font-semibold leading-snug">{activeResult.selectedTitle}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">封面：{activeResult.selectedCoverText}</p>
                        <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-sans text-sm leading-7">{activeResult.content}</pre>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {activeResult.tags.map((tag) => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                        </div>
                      </article>
                      <div className="space-y-4">
                        <section className="rounded-xl border border-border p-4">
                          <div className="mb-2 flex items-center gap-2 font-medium text-sm"><ShieldCheck className="h-4 w-4" /> 合规审查</div>
                          <p className="text-sm text-muted-foreground">{activeResult.complianceReport?.summary}</p>
                          <div className="mt-3 flex gap-2">
                            <Badge variant={activeResult.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}>
                              {activeResult.complianceReport?.publishReadiness || "unknown"}
                            </Badge>
                          </div>
                        </section>
                        <ImagePromptLab
                          contentId={activeResult.id}
                          prompts={activeResult.imagePromptSuggestions}
                          imageApiReady={apiStatus.image}
                          imageModel={apiStatus.imageModel}
                        />
                        <Button className="w-full" onClick={saveActiveDraft}><CheckCircle2 className="h-4 w-4" /> 保存草稿</Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
