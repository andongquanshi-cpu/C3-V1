"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, ImageIcon, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildContentCopyText, copyTextToClipboard } from "@/lib/clipboard-utils";
import { cn } from "@/lib/utils";
import type { GeneratedContent } from "@/lib/types";
import { VideoScriptTable } from "@/components/workspace/VideoScriptTable";

interface ContentResultsPanelProps {
  results: GeneratedContent[];
  activeResultId: string;
  isVideoScript?: boolean;
  imageApiReady: boolean;
  imageModel?: string;
  onActiveResultChange: (id: string) => void;
  onEnterVisualStudio: (contentId: string) => void;
  onSaveDraft: () => void;
  onBackToAngles: () => void;
}

function publishReadinessLabel(readiness?: string) {
  if (readiness === "ready") return "可发布";
  if (readiness === "blocked") return "需拦截";
  return "待修订";
}

function formatTag(tag: string) {
  const text = tag.trim();
  if (!text) return "";
  return text.startsWith("#") ? text : `#${text}`;
}

function TagLine({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <p className={cn("flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-primary/75", className)}>
      {tags.map((tag) => (
        <span key={tag}>{formatTag(tag)}</span>
      ))}
    </p>
  );
}

export function ContentResultsPanel({
  results,
  activeResultId,
  isVideoScript = false,
  imageApiReady,
  imageModel,
  onActiveResultChange,
  onEnterVisualStudio,
  onSaveDraft,
  onBackToAngles,
}: ContentResultsPanelProps) {
  const activeResult = results.find((item) => item.id === activeResultId) || results[0];
  const [copyHint, setCopyHint] = useState("");

  useEffect(() => {
    if (!copyHint) return;
    const timer = window.setTimeout(() => setCopyHint(""), 2000);
    return () => window.clearTimeout(timer);
  }, [copyHint]);

  async function handleCopy(label: string, text: string) {
    const ok = await copyTextToClipboard(text);
    setCopyHint(ok ? `已复制${label}` : "复制失败，请手动选择文本");
  }

  if (!activeResult) return null;

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border/80 bg-card/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <button
            type="button"
            onClick={onBackToAngles}
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回创意角度
          </button>
          <h2 className="text-lg font-semibold">{isVideoScript ? "视频脚本" : "生成内容"}</h2>
        </div>
        <Badge variant="outline" className="shrink-0">
          共 {results.length} 篇
        </Badge>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="space-y-2" aria-label="成稿列表">
          {results.map((item, index) => {
            const selected = item.id === activeResult.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onActiveResultChange(item.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
                  selected
                    ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 text-sm font-medium leading-snug line-clamp-3">{item.selectedTitle}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <article className="rounded-xl border border-border bg-card">
              <div className="border-b border-border/60 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <h3 className="text-xl font-semibold leading-snug">{activeResult.selectedTitle}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {!isVideoScript && activeResult.selectedCoverText ? (
                        <>
                          <span>封面：{activeResult.selectedCoverText}</span>
                          <span className="text-border">|</span>
                        </>
                      ) : null}
                      <Badge
                        variant={activeResult.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        {publishReadinessLabel(activeResult.complianceReport?.publishReadiness)}
                      </Badge>
                    </div>
                    <TagLine tags={activeResult.tags} />
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="inline-flex rounded-lg border border-border/70 bg-muted/20 p-0.5">
                      <button
                        type="button"
                        onClick={() => void handleCopy("标题", activeResult.selectedTitle)}
                        className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        标题
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopy("正文", activeResult.content)}
                        className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        正文
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(
                            "全文",
                            buildContentCopyText({
                              selectedTitle: activeResult.selectedTitle,
                              selectedCoverText: activeResult.selectedCoverText,
                              content: activeResult.content,
                              tags: activeResult.tags,
                              riskReminder: activeResult.riskReminder,
                              interactionGuide: activeResult.interactionGuide,
                            }),
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-md bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm"
                      >
                        <Copy className="h-3 w-3" />
                        全文
                      </button>
                    </div>
                    {copyHint ? <span className="text-[11px] text-primary">{copyHint}</span> : null}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {isVideoScript ? (
                  <VideoScriptTable content={activeResult} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{activeResult.content}</pre>
                )}
                {activeResult.riskReminder ? (
                  <p className="mt-5 border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground">
                    {activeResult.riskReminder}
                  </p>
                ) : null}
              </div>
            </article>

            <div className="space-y-4">
              <section className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  合规审查
                </div>
                <p className="text-sm text-muted-foreground">{activeResult.complianceReport?.summary}</p>
              </section>

              {!isVideoScript ? (
              <section className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="h-4 w-4" />
                    图片
                  </div>
                  {imageModel ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {imageModel}
                    </Badge>
                  ) : null}
                </div>

                {activeResult.visualPlan ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      已规划 {activeResult.visualPlan.items.length} 张（封面 + 内容图）。
                    </p>
                    {activeResult.generatedImages?.length ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {activeResult.visualPlan.items.map((item, index) => {
                          const image = activeResult.generatedImages?.find(
                            (entry) =>
                              (entry.imageIndex ?? entry.promptIndex) === item.imageIndex,
                          );
                          const url = image?.localPath || image?.url;
                          return (
                            <div
                              key={item.id}
                              className="relative aspect-[3/4] overflow-hidden rounded-md border border-border/60 bg-muted/30"
                              title={item.title}
                            >
                              {url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                                  {index === 0 ? "封面" : `图${index}`}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">尚未生成图片</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    AI 会根据正文规划封面 + 内容图，并可自由编辑后一键出图。
                  </p>
                )}

                <Button
                  className="mt-3 w-full"
                  variant={activeResult.visualPlan ? "outline" : "default"}
                  onClick={() => onEnterVisualStudio(activeResult.id)}
                >
                  <Sparkles className="h-4 w-4" />
                  {activeResult.visualPlan ? "继续编辑 / 生成" : "开始制图"}
                </Button>

                {!imageApiReady ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    未配置 IMAGE_API_KEY 时，可先进入制图编辑视觉计划。
                  </p>
                ) : null}
              </section>
              ) : null}

              <Button className="w-full" onClick={onSaveDraft}>
                <CheckCircle2 className="h-4 w-4" />
                保存草稿
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
