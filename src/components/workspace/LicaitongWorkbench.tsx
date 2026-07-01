"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ImageIcon, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LicaitongBriefPanel } from "@/components/workspace/LicaitongBriefPanel";
import { LicaitongAnglesPanel } from "@/components/workspace/LicaitongAnglesPanel";
import { BriefSummaryCard } from "@/components/workspace/BriefSummaryCard";
import { WorkflowStepper } from "@/components/workspace/WorkflowStepper";
import { buildLicaitongDefaults, normalizeContentLength } from "@/lib/licaitong-workflow";
import { parseLLMJson, safeJsonParse } from "@/lib/utils";
import {
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
  { id: 4, label: "审核草稿" },
];

const LLM_NOT_CONFIGURED =
  "服务端未配置 LLM_API_KEY，请在项目根目录 .env 中设置后重启开发服务器";

const DEFAULT_BRIEF: BriefInput = {
  businessLine: "licaitong",
  ...buildLicaitongDefaults(),
  generationMode: "image-text",
  bloggerLevel: "middle",
  embedLevel: "medium",
  contentLength: "200-500",
  generateCount: 2,
  customRequirement: "",
  materials: [],
};

interface ApiStatus {
  ready: boolean;
  text: boolean;
  image: boolean;
  hotspot: boolean;
  model?: string;
}

export function LicaitongWorkbench() {
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState<BriefInput>(DEFAULT_BRIEF);
  const [knowledge, setKnowledge] = useState<KnowledgeListView | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ ready: false, text: false, image: false, hotspot: false });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialDraft, setMaterialDraft] = useState("");
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [selectedAngleIds, setSelectedAngleIds] = useState<string[]>([]);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeResultId, setActiveResultId] = useState("");
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [imageResult, setImageResult] = useState("");

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
  const selectedAngles = useMemo(
    () => angles.filter((a) => selectedAngleIds.includes(a.angleId)),
    [angles, selectedAngleIds],
  );
  const activeResult = useMemo(
    () => results.find((r) => r.id === activeResultId) || results[0],
    [activeResultId, results],
  );

  function updateBrief(patch: Partial<BriefInput>) {
    setBrief((current) => ({ ...current, ...patch }));
  }

  function addManualMaterial() {
    const text = materialDraft.trim();
    if (!text) return;
    const material: Material = {
      id: uid("material"),
      title: text.split("\n")[0].slice(0, 48) || "手动素材",
      body: text,
      source: "手动输入",
      createdAt: new Date().toISOString(),
    };
    setMaterials((current) => [material, ...current].slice(0, 12));
    setMaterialDraft("");
    setStatus("素材已加入");
  }

  async function searchHotspot() {
    setIsBusy(true);
    setStatus("正在搜索热点...");
    try {
      const response = await fetch("/api/tavily-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${brief.topic || "理财"} 基金 固收 政策 小红书`,
          maxResults: 5,
          topic: "news",
          timeRange: "day",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "热点搜索失败");
      const next: Material[] = (data.results || []).slice(0, 5).map((item: { title?: string; content?: string; snippet?: string; url?: string }) => ({
        id: uid("hotspot"),
        title: item.title || "财经热点",
        body: item.content || item.snippet || "",
        source: item.url || "Tavily",
        tags: ["热点"],
        createdAt: new Date().toISOString(),
      }));
      setMaterials((current) => [...next, ...current].slice(0, 12));
      setStatus(`已加入 ${next.length} 条热点素材`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "热点搜索失败，可手动粘贴素材");
    } finally {
      setIsBusy(false);
    }
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
    setIsBusy(true);
    setStatus("正在检索固收+ 知识库并生成创意角度...");
    setAngles([]);
    setSelectedAngleIds([]);
    try {
      if (!apiStatus.ready) throw new Error(LLM_NOT_CONFIGURED);
      const input = { ...brief, materials };
      const prompt = await buildPrompt("creativeAngles", input);
      const raw = await callTextModel(prompt, { temperature: 0.35, maxTokens: 8192 });
      const normalized = normalizeAngles(parseLLMJson(raw), brief);
      setAngles(normalized);
      setSelectedAngleIds(normalized.slice(0, brief.generateCount).map((a) => a.angleId));
      setStatus(`已生成 ${normalized.length} 个创意角度`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "创意角度生成失败");
    } finally {
      setIsBusy(false);
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
    setIsBusy(true);
    setStatus("正在生成正文并完成合规审查...");
    setImageResult("");
    try {
      const nextResults: GeneratedContent[] = [];
      for (const angle of selectedAngles) {
        const contentAction = brief.personaId ? "personaContent" : "contentGeneration";
        const contentPrompt = await buildPrompt(contentAction, {
          ...brief,
          materials,
          selectedAngle: angle,
          templateId: angle.recommendedTemplateId,
          selectedFeatureIds: [...new Set([...brief.selectedFeatureIds, ...angle.recommendedFeatureIds])],
        });
        const rawContent = await callTextModel(contentPrompt, { maxTokens: 4096 });
        const content = normalizeContent(parseLLMJson(rawContent), angle);
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
      setStep(3);
      setStatus(`已生成 ${nextResults.length} 条内容`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "内容生成失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function generateImage() {
    const prompt = activeResult?.imagePromptSuggestions?.[0]?.prompt;
    if (!prompt) return setStatus("当前内容没有图片 Prompt");
    if (!apiStatus.image) return setStatus("服务端未配置 IMAGE_API_KEY");
    setIsBusy(true);
    try {
      const response = await fetch("/api/image-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "图片生成失败");
      setImageResult(data.data?.[0]?.url || "");
      setStatus("图片生成完成");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "图片生成失败");
    } finally {
      setIsBusy(false);
    }
  }

  function saveActiveDraft() {
    if (!activeResult) return;
    const draft: Draft = {
      ...activeResult,
      savedAt: new Date().toISOString(),
      generationSnapshot: { ...brief, materials },
    };
    setDrafts((current) => [draft, ...current].slice(0, 30));
    setStep(4);
    setStatus("已保存到草稿箱");
  }

  return (
    <div className="space-y-6">
      <WorkflowStepper steps={LICAITONG_STEPS} current={step} onStepClick={(s) => s <= step && setStep(s)} />

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
        {step === 1 && (
            <LicaitongBriefPanel
              brief={brief}
              materials={materials}
              materialDraft={materialDraft}
              offerFeatures={offerFeatures}
              isBusy={isBusy}
              onBriefChange={(patch) => {
                if (typeof patch === "function") setBrief((c) => patch(c));
                else updateBrief(patch);
              }}
              onMaterialDraftChange={setMaterialDraft}
              onAddMaterial={addManualMaterial}
              onSearchHotspot={searchHotspot}
              onContinue={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="xl:sticky xl:top-4 xl:self-start">
                <BriefSummaryCard
                  brief={brief}
                  materials={materials}
                  anglesSelected={selectedAngleIds.length}
                  anglesTotal={angles.length}
                  kbVersion={knowledge?.knowledgeBaseVersion}
                />
              </aside>
              <LicaitongAnglesPanel
                brief={brief}
                angles={angles}
                selectedAngleIds={selectedAngleIds}
                isBusy={isBusy}
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

          {step === 3 && (
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
                        <section className="rounded-xl border border-border p-4">
                          <div className="mb-2 flex items-center gap-2 font-medium text-sm"><ImageIcon className="h-4 w-4" /> 封面 Prompt</div>
                          <p className="max-h-40 overflow-auto text-xs leading-5 text-muted-foreground">{activeResult.imagePromptSuggestions[0]?.prompt}</p>
                          {apiStatus.image ? (
                            <Button className="mt-3 w-full" variant="secondary" size="sm" onClick={generateImage} disabled={isBusy}>生成封面图</Button>
                          ) : null}
                        </section>
                        <Button className="w-full" onClick={saveActiveDraft}><CheckCircle2 className="h-4 w-4" /> 保存草稿</Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 rounded-xl border border-border/80 bg-card/50 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">草稿箱</h2>
              {drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无草稿。生成内容后点击「保存草稿」。</p>
              ) : (
                drafts.map((draft) => (
                  <div key={draft.id + draft.savedAt} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <strong>{draft.selectedTitle}</strong>
                      <Badge variant={draft.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}>
                        {draft.complianceReport?.publishReadiness || "needs_review"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(draft.savedAt).toLocaleString()}</p>
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{draft.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
      </div>
    </div>
  );
}
