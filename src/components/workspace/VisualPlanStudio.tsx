"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { copyTextToClipboard } from "@/lib/clipboard-utils";
import { parseLLMJson, cn } from "@/lib/utils";
import {
  buildFallbackVisualPlan,
  parseVisualPlanPayload,
} from "@/lib/visual-plan-utils";
import {
  buildPromptApi,
  generateImageApi,
  generateTextApi,
  persistGeneratedImageApi,
  type MatrixWorkflowContext,
} from "@/services/creation-api";
import type {
  BriefInput,
  GeneratedContent,
  GeneratedImage,
  VisualPlan,
  VisualPlanItem,
} from "@/lib/types";

interface VisualPlanStudioProps {
  content: GeneratedContent;
  brief: BriefInput;
  imageApiReady: boolean;
  imageModel?: string;
  workflowContext?: MatrixWorkflowContext;
  onBack?: () => void;
  onVisualPlanChange: (contentId: string, plan: VisualPlan | undefined) => void;
  onImageGenerated: (contentId: string, image: GeneratedImage) => void;
}

type SlotState = {
  loading?: boolean;
  error?: string;
  url?: string;
  localPath?: string;
};

function displayUrl(slot: SlotState | undefined, image: GeneratedImage | undefined) {
  if (slot?.loading) return undefined;
  if (slot?.localPath) return slot.localPath;
  if (slot?.url) return slot.url;
  if (image?.localPath) return image.localPath;
  return image?.url;
}

function triggerDownload(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function VisualPlanStudio({
  content,
  brief,
  imageApiReady,
  imageModel,
  workflowContext,
  onBack,
  onVisualPlanChange,
  onImageGenerated,
}: VisualPlanStudioProps) {
  const [plan, setPlan] = useState<VisualPlan | undefined>(content.visualPlan);
  const [isPlanning, setIsPlanning] = useState(false);
  const [status, setStatus] = useState("");
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [copyHint, setCopyHint] = useState("");
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // 切换到不同的 content 时才重置。同一个 content 内的编辑通过本地 setPlan
  // 与 onVisualPlanChange 双向同步，无需依赖上游 content.visualPlan 变化。
  useEffect(() => {
    setPlan(content.visualPlan);
    setSlots({});
    setStatus("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]);

  useEffect(() => {
    if (!copyHint) return;
    const timer = window.setTimeout(() => setCopyHint(""), 1800);
    return () => window.clearTimeout(timer);
  }, [copyHint]);

  const existingImagesByIndex = useMemo(() => {
    const map = new Map<number, GeneratedImage>();
    for (const image of content.generatedImages || []) {
      const key = image.imageIndex ?? image.promptIndex;
      map.set(key, image);
    }
    return map;
  }, [content.generatedImages]);

  const canBatchGenerate =
    Boolean(plan) &&
    imageApiReady &&
    !isBatchGenerating &&
    !isPlanning &&
    (plan?.items || []).some((item) => item.prompt.trim());

  async function generatePlan(mode: "create" | "regenerate") {
    setIsPlanning(true);
    setStatus(
      mode === "regenerate" ? "正在让 AI 重新规划视觉方案…" : "正在让 AI 生成视觉计划…",
    );
    try {
      const promptData = await buildPromptApi("visualPlan", {
        ...brief,
        creationMode: workflowContext?.mode,
        workflowContext,
        selectedTitle: content.selectedTitle,
        selectedCoverText: content.selectedCoverText,
        generatedContent: content.content,
        selectedAngle: {
          angleName: content.angleName,
          angleId: content.angleId,
        },
      });

      const raw = await generateTextApi(promptData, {
        temperature: 0.55,
        maxTokens: 4096,
      });
      const parsed = parseVisualPlanPayload(parseLLMJson(raw));
      const nextPlan = parsed || buildFallbackVisualPlan(content);
      setPlan(nextPlan);
      onVisualPlanChange(content.id, nextPlan);
      setSlots({});
      setStatus(parsed ? "已生成视觉计划，可自由编辑后一键生图" : "AI 返回解析异常，已用兜底计划占位，请手动调整");
    } catch (error) {
      const fallback = buildFallbackVisualPlan(content);
      setPlan(fallback);
      onVisualPlanChange(content.id, fallback);
      setStatus(error instanceof Error ? `${error.message}；已用兜底计划占位` : "生成失败，已用兜底计划占位");
    } finally {
      setIsPlanning(false);
    }
  }

  function patchItem(itemId: string, patch: Partial<VisualPlanItem>) {
    setPlan((current) => {
      if (!current) return current;
      const nextItems = current.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      );
      const nextPlan = { ...current, items: nextItems };
      onVisualPlanChange(content.id, nextPlan);
      return nextPlan;
    });
  }

  function patchOverallStyle(nextStyle: string) {
    setPlan((current) => {
      if (!current) return current;
      const nextPlan = { ...current, overallStyle: nextStyle };
      onVisualPlanChange(content.id, nextPlan);
      return nextPlan;
    });
  }

  async function generateOne(item: VisualPlanItem, overallStyle: string) {
    if (!item.prompt.trim()) {
      setSlots((current) => ({ ...current, [item.id]: { error: "请先填写提示词" } }));
      return null;
    }
    setSlots((current) => ({ ...current, [item.id]: { loading: true } }));
    try {
      const url = await generateImageApi({
        prompt: item.prompt,
        overallStyle,
        coverText: item.copy,
        role: item.role,
        workflowContext,
      });

      // 立即持久化到本地
      let localPath: string | undefined;
      try {
        localPath = await persistGeneratedImageApi({
          url,
          contentId: content.id,
          imageIndex: item.imageIndex,
        });
      } catch {
        // 保存失败仍返回原始 URL，不阻断流程
      }

      const image: GeneratedImage = {
        promptIndex: item.imageIndex,
        imageIndex: item.imageIndex,
        url,
        localPath,
        kind: item.role === "cover" ? "cover" : "content",
        style: item.role,
        coverText: item.copy || undefined,
        promptSnapshot: item.prompt,
        createdAt: new Date().toISOString(),
      };

      setSlots((current) => ({
        ...current,
        [item.id]: { url, localPath, loading: false },
      }));
      onImageGenerated(content.id, image);
      return image;
    } catch (error) {
      setSlots((current) => ({
        ...current,
        [item.id]: {
          error: error instanceof Error ? error.message : "生成失败",
        },
      }));
      return null;
    }
  }

  async function batchGenerate() {
    if (!plan) return;
    setIsBatchGenerating(true);
    setStatus("正在按整体风格依次生成每张图…");
    let successCount = 0;
    for (const item of plan.items) {
      const image = await generateOne(item, plan.overallStyle);
      if (image) successCount += 1;
    }
    setIsBatchGenerating(false);
    setStatus(
      successCount === plan.items.length
        ? `已生成全部 ${successCount} 张图`
        : `完成 ${successCount}/${plan.items.length} 张，其余请检查错误后重试`,
    );
  }

  async function handleCopyCopy(item: VisualPlanItem) {
    if (!item.copy.trim()) {
      setCopyHint("暂无文案可复制");
      return;
    }
    const ok = await copyTextToClipboard(item.copy);
    setCopyHint(ok ? "已复制文案" : "复制失败");
  }

  async function handleCopyOverall() {
    if (!plan?.overallStyle.trim()) return;
    const ok = await copyTextToClipboard(plan.overallStyle);
    setCopyHint(ok ? "已复制整体把控提示词" : "复制失败");
  }

  async function handleCopyAllCopy() {
    if (!plan) return;
    const text = plan.items
      .map((item, index) => `【${index === 0 ? "封面" : `图 ${index}`}】${item.copy || "(空)"}`)
      .join("\n");
    const ok = await copyTextToClipboard(text);
    setCopyHint(ok ? "已复制全部画面文案" : "复制失败");
  }

  function downloadOne(item: VisualPlanItem) {
    const image = existingImagesByIndex.get(item.imageIndex);
    const slot = slots[item.id];
    const url = slot?.localPath || slot?.url || image?.localPath || image?.url;
    if (!url) {
      setCopyHint("尚未生成图片");
      return;
    }
    const suffix = item.role === "cover" ? "cover" : `content_${item.imageIndex}`;
    triggerDownload(url, `${content.id}_${suffix}.png`);
  }

  function downloadAll() {
    if (!plan) return;
    let count = 0;
    plan.items.forEach((item, index) => {
      const image = existingImagesByIndex.get(item.imageIndex);
      const slot = slots[item.id];
      const url = slot?.localPath || slot?.url || image?.localPath || image?.url;
      if (!url) return;
      const suffix = item.role === "cover" ? "cover" : `content_${item.imageIndex}`;
      // 依次触发下载，间隔避免浏览器拦截
      window.setTimeout(() => {
        triggerDownload(url, `${content.id}_${suffix}.png`);
      }, index * 300);
      count += 1;
    });
    setCopyHint(count > 0 ? `已触发 ${count} 张下载` : "尚无可下载的图片");
  }

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border/80 bg-card/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回正文
            </button>
          ) : null}
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ImageIcon className="h-5 w-5" />
            制图工作台
          </h2>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            正在为：{content.selectedTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {imageModel ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              {imageModel}
            </Badge>
          ) : null}
          {plan ? (
            <Badge variant="secondary" className="text-[10px]">
              {plan.items.length} 张（含封面）
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {status ? (
          <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
            {status}
          </div>
        ) : null}

        {!plan ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold">先生成视觉计划</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              AI 将阅读正文，规划 1 张封面 + 3–5 张内容图的分镜：先产整体把控提示词统一风格，再为每张图产出可编辑的画面文案与提示词。
            </p>
            <Button className="mt-4" onClick={() => void generatePlan("create")} disabled={isPlanning}>
              {isPlanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  规划中…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  生成视觉计划
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">整体把控提示词</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    每次生图会自动拼接在你的提示词前，用于统一整套图的风格 / 色调 / 版式。
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => void handleCopyOverall()}
                  >
                    <Copy className="h-3 w-3" />
                    复制
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={isPlanning}
                    onClick={() => void generatePlan("regenerate")}
                  >
                    <RefreshCw className={cn("h-3 w-3", isPlanning && "animate-spin")} />
                    重新规划整套
                  </Button>
                </div>
              </div>
              <Textarea
                value={plan.overallStyle}
                onChange={(event) => patchOverallStyle(event.target.value)}
                className="min-h-[140px] bg-background/70 text-sm leading-6"
              />
            </section>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                共 {plan.items.length} 张：封面 1 + 内容图 {plan.items.length - 1}。可修改每张的文案与提示词，然后一键生图。
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => void handleCopyAllCopy()}
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制全部画面文案
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={downloadAll}
                >
                  <Download className="h-3.5 w-3.5" />
                  批量下载
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  disabled={!canBatchGenerate}
                  onClick={() => void batchGenerate()}
                >
                  {isBatchGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      生成中…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      一次性生成
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!imageApiReady ? (
              <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-200">
                当前未配置 IMAGE_API_KEY，无法生成图片；可先编辑视觉计划，配置后再生图。
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plan.items.map((item, index) => {
                const image = existingImagesByIndex.get(item.imageIndex);
                const slot = slots[item.id];
                const url = displayUrl(slot, image);
                const isCover = item.role === "cover" || index === 0;
                return (
                  <article
                    key={item.id}
                    className={cn(
                      "flex flex-col rounded-xl border bg-card p-3",
                      isCover ? "border-primary/50 shadow-sm" : "border-border",
                    )}
                  >
                    <header className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={isCover ? "default" : "secondary"} className="text-[10px]">
                          {isCover ? "封面" : `图 ${item.imageIndex}`}
                        </Badge>
                        <span className="text-xs font-medium">{item.title}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item.role}
                      </span>
                    </header>

                    <div
                      className={cn(
                        "relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/30",
                      )}
                    >
                      {slot?.loading ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-[11px]">生成中…</span>
                        </div>
                      ) : url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageIcon className="h-6 w-6" />
                          <span className="text-[11px]">未生成</span>
                        </div>
                      )}
                    </div>

                    {slot?.error ? (
                      <p className="mt-2 text-[11px] text-destructive">{slot.error}</p>
                    ) : null}

                    <div className="mt-3 space-y-2">
                      <label className="block">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          画面文案（图上直接出现的字）
                        </span>
                        <Textarea
                          value={item.copy}
                          onChange={(event) => patchItem(item.id, { copy: event.target.value })}
                          placeholder={isCover ? "8–14 字，具备钩子" : "≤25 字，突出本张核心信息"}
                          className="mt-1 min-h-[52px] text-xs leading-5"
                        />
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {item.copy.replace(/\s/g, "").length} / {isCover ? 14 : 25} 字
                        </span>
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          生图提示词
                        </span>
                        <Textarea
                          value={item.prompt}
                          onChange={(event) => patchItem(item.id, { prompt: event.target.value })}
                          className="mt-1 min-h-[96px] text-xs leading-5"
                        />
                      </label>

                      {item.hookAngle ? (
                        <p className="rounded-md bg-muted/40 px-2 py-1.5 text-[11px] leading-4 text-muted-foreground">
                          <span className="font-medium text-foreground">钩子：</span>
                          {item.hookAngle}
                        </p>
                      ) : null}
                      {item.connection ? (
                        <p className="rounded-md bg-muted/30 px-2 py-1.5 text-[11px] leading-4 text-muted-foreground">
                          <span className="font-medium text-foreground">衔接：</span>
                          {item.connection}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        disabled={!imageApiReady || slot?.loading}
                        onClick={() => void generateOne(item, plan.overallStyle)}
                      >
                        {slot?.loading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            生成中
                          </>
                        ) : url ? (
                          <>
                            <RefreshCw className="h-3 w-3" />
                            重新生成
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            生成
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        onClick={() => void handleCopyCopy(item)}
                      >
                        <Copy className="h-3 w-3" />
                        复制文案
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        disabled={!url}
                        onClick={() => downloadOne(item)}
                      >
                        <Download className="h-3 w-3" />
                        下载
                      </Button>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          原图
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {copyHint ? (
          <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-lg">
            {copyHint}
          </div>
        ) : null}
      </div>
    </div>
  );
}
