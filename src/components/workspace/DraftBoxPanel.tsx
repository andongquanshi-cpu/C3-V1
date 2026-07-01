"use client";

import { useState } from "react";
import { ArrowLeft, ChevronRight, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildDraftArchiveFields, getLicaitongOffer } from "@/lib/licaitong-workflow";
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

export function DraftBoxPanel({ drafts, onDeleteDraft, onBackToWorkflow }: DraftBoxPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedDraft = drafts.find((item) => draftKey(item) === selectedId);

  if (selectedDraft) {
    const archiveFields = buildDraftArchiveFields(selectedDraft.generationSnapshot, selectedDraft.angleName);
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

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{selectedDraft.angleName}</Badge>
            <Badge
              variant={selectedDraft.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}
            >
              {publishReadinessLabel(selectedDraft.complianceReport?.publishReadiness)}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold leading-snug">{selectedDraft.selectedTitle}</h2>
          <p className="text-xs text-muted-foreground">
            保存于 {new Date(selectedDraft.savedAt).toLocaleString()}
          </p>
        </div>

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

        <article className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">封面文案：{selectedDraft.selectedCoverText}</p>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7">{selectedDraft.content}</pre>
          {selectedDraft.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {selectedDraft.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          ) : null}
          {selectedDraft.riskReminder ? (
            <p className="mt-4 text-xs leading-5 text-muted-foreground">{selectedDraft.riskReminder}</p>
          ) : null}
        </article>

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
          {drafts.map((draft) => {
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
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium leading-snug">{draft.selectedTitle}</span>
                      <Badge
                        variant={draft.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        {publishReadinessLabel(draft.complianceReport?.publishReadiness)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {draft.angleName}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {getLicaitongOffer(draft.generationSnapshot.offerId).label}
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
