"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Copy, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildDraftArchiveFields, getOffer, getWorkflowFallback } from "@/lib/business-line-workflow";
import { buildContentCopyText, copyTextToClipboard } from "@/lib/clipboard-utils";
import { cn } from "@/lib/utils";
import type { Draft } from "@/lib/types";

interface DraftBoxPanelProps {
  drafts: Draft[];
  onDeleteDraft: (draftEntryId: string) => void;
  onBackToWorkflow: () => void;
}

function draftKey(draft: Draft) {
  return draft.draftEntryId || `${draft.id}_${draft.savedAt}`;
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

export function DraftBoxPanel({ drafts, onDeleteDraft, onBackToWorkflow }: DraftBoxPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState("");
  const selectedDraft = drafts.find((item) => draftKey(item) === selectedId);

  useEffect(() => {
    if (!copyHint) return;
    const timer = window.setTimeout(() => setCopyHint(""), 2000);
    return () => window.clearTimeout(timer);
  }, [copyHint]);

  async function handleCopy(label: string, text: string) {
    const ok = await copyTextToClipboard(text);
    setCopyHint(ok ? `已复制${label}` : "复制失败，请手动选择文本");
  }

  if (selectedDraft) {
    const archiveFields = buildDraftArchiveFields(
      selectedDraft.generationSnapshot,
      selectedDraft.angleName,
      getWorkflowFallback(selectedDraft.generationSnapshot.businessLine),
    );
    const key = draftKey(selectedDraft);

    return (
      <div className="space-y-5 rounded-xl border border-border/80 bg-card/50 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="-ml-2">
            <ArrowLeft className="h-4 w-4" />
            返回草稿列表
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              onDeleteDraft(key);
              setSelectedId(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            删除
          </Button>
        </div>

        <article className="rounded-xl border border-border bg-card">
          <div className="border-b border-border/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="text-xl font-semibold leading-snug">{selectedDraft.selectedTitle}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>封面：{selectedDraft.selectedCoverText}</span>
                  <span className="text-border">|</span>
                  <Badge
                    variant={selectedDraft.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}
                    className="text-[10px]"
                  >
                    {publishReadinessLabel(selectedDraft.complianceReport?.publishReadiness)}
                  </Badge>
                  <span className="text-border">|</span>
                  <span className="text-xs">保存于 {new Date(selectedDraft.savedAt).toLocaleString()}</span>
                </div>
                <TagLine tags={selectedDraft.tags} />
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="inline-flex rounded-lg border border-border/70 bg-muted/20 p-0.5">
                  <button
                    type="button"
                    onClick={() => void handleCopy("标题", selectedDraft.selectedTitle)}
                    className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  >
                    标题
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopy("正文", selectedDraft.content)}
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
                          selectedTitle: selectedDraft.selectedTitle,
                          selectedCoverText: selectedDraft.selectedCoverText,
                          content: selectedDraft.content,
                          tags: selectedDraft.tags,
                          riskReminder: selectedDraft.riskReminder,
                          interactionGuide: selectedDraft.interactionGuide,
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

          <div className="p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{selectedDraft.content}</pre>
            {selectedDraft.riskReminder ? (
              <p className="mt-5 border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground">
                {selectedDraft.riskReminder}
              </p>
            ) : null}
          </div>
        </article>

        <section className="rounded-xl border border-border/70 bg-muted/15 p-4">
          <h3 className="text-sm font-semibold">创作快照</h3>
          <p className="mt-1 text-xs text-muted-foreground">保存时的配置记录，与当前第二步 Brief 侧栏无关。</p>
          <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {archiveFields.map((field) => (
              <div key={field.label} className="rounded-lg bg-background/60 px-3 py-2">
                <dt className="text-[11px] text-muted-foreground">{field.label}</dt>
                <dd className="mt-0.5 text-sm font-medium leading-snug">{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {selectedDraft.generatedImages && selectedDraft.generatedImages.length > 0 ? (
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">已生成图片</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[...selectedDraft.generatedImages]
                .sort((a, b) => (a.imageIndex ?? a.promptIndex) - (b.imageIndex ?? b.promptIndex))
                .map((image) => {
                  const url = image.localPath || image.url;
                  const idx = image.imageIndex ?? image.promptIndex;
                  const label = image.kind === "content" ? `内容图 ${idx}` : idx === 0 ? "封面" : `图 ${idx}`;
                  return (
                    <div key={`${idx}-${url}`} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{label}</span>
                        {image.coverText ? (
                          <span className="text-muted-foreground">字：{image.coverText}</span>
                        ) : null}
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={label}
                        className="w-full rounded-md border border-border/60 object-cover bg-background aspect-[3/4]"
                      />
                      <div className="flex items-center gap-2 text-[11px]">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          原图
                        </a>
                        <a
                          href={url}
                          download={`${selectedDraft.id}_${label}.png`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          下载
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ) : null}

        {selectedDraft.complianceReport ? (
          <section className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              合规审查
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{selectedDraft.complianceReport.summary}</p>
            {selectedDraft.complianceReport.requiredFixes.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {selectedDraft.complianceReport.requiredFixes.map((fix) => (
                  <li key={fix}>· {fix}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-border/80 bg-card/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">草稿箱</h2>
          <p className="mt-1 text-sm text-muted-foreground">已保存的成稿会归档在这里，可随时查看全文与创作快照。</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onBackToWorkflow}>
          返回创作
        </Button>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 py-16 text-center text-sm text-muted-foreground">
          暂无草稿。在「生成内容」步骤保存后会出现在这里。
        </div>
      ) : (
        <ul className="space-y-2">
          {drafts.map((draft, index) => {
            const key = draftKey(draft);
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setSelectedId(key)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border border-border/80 bg-card/40 p-4 text-left transition-colors",
                    "hover:border-primary/30 hover:bg-accent/20",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium leading-snug">{draft.selectedTitle}</span>
                      <Badge
                        variant={draft.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        {publishReadinessLabel(draft.complianceReport?.publishReadiness)}
                      </Badge>
                      {draft.generatedImages && draft.generatedImages.length > 0 ? (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          含 {draft.generatedImages.length} 张图
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {draft.angleName}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {getOffer(
                          draft.generationSnapshot.offerId,
                          getWorkflowFallback(draft.generationSnapshot.businessLine),
                          draft.generationSnapshot.businessLine,
                        ).label}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{draft.content}</p>
                    <p className="text-xs text-muted-foreground">{new Date(draft.savedAt).toLocaleString()}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
