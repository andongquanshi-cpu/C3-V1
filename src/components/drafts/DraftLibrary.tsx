"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Clock3, Copy, FileText, Layers3, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildContentCopyText, copyTextToClipboard } from "@/lib/clipboard-utils";
import {
  MATRIX_DRAFTS_STORAGE_KEY,
  MATRIX_HISTORY_STORAGE_KEY,
  readStoredJson,
  writeStoredJson,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Draft, GeneratedContent, GenerationHistoryEntry } from "@/lib/types";
import { VideoScriptTable } from "@/components/workspace/VideoScriptTable";

type LibraryTab = "history" | "drafts";
type SelectedEntry = {
  key: string;
  content: GeneratedContent;
  time: string;
  source: "history" | "draft";
};

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function businessLineLabel(line: GenerationHistoryEntry["businessLine"]) {
  return line === "weisec" ? "微证券" : "理财通";
}

export function DraftLibrary() {
  const [tab, setTab] = useState<LibraryTab>("history");
  const [history, setHistory] = useState<GenerationHistoryEntry[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHistory(readStoredJson<GenerationHistoryEntry[]>(MATRIX_HISTORY_STORAGE_KEY, []).slice(0, 3));
      setDrafts(readStoredJson<Draft[]>(MATRIX_DRAFTS_STORAGE_KEY, [], ["lunch-drafts"]));
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const historyEntries = useMemo<SelectedEntry[]>(
    () => history.flatMap((entry) => entry.results.map((content) => ({
      key: `${entry.historyEntryId}:${content.id}`,
      content,
      time: entry.generatedAt,
      source: "history" as const,
    }))),
    [history],
  );
  const draftEntries = useMemo<SelectedEntry[]>(
    () => drafts.map((draft) => ({
      key: draft.draftEntryId || `${draft.id}:${draft.savedAt}`,
      content: draft,
      time: draft.savedAt,
      source: "draft" as const,
    })),
    [drafts],
  );
  const entries = tab === "history" ? historyEntries : draftEntries;
  const selected = entries.find((entry) => entry.key === selectedKey) || entries[0];

  function changeTab(next: LibraryTab) {
    setTab(next);
    setSelectedKey("");
  }

  function deleteDraft(key: string) {
    const next = drafts.filter((draft) => (draft.draftEntryId || `${draft.id}:${draft.savedAt}`) !== key);
    setDrafts(next);
    writeStoredJson(MATRIX_DRAFTS_STORAGE_KEY, next);
    setSelectedKey("");
  }

  if (!ready) {
    return <div className="rounded-xl border border-border/80 bg-card/50 py-20 text-center text-sm text-muted-foreground">正在读取草稿箱…</div>;
  }

  return (
    <div className="draft-library space-y-5">
      <div className="draft-library-hero">
        <div className="draft-library-icon"><Layers3 className="h-5 w-5" /></div>
        <div>
          <span className="draft-library-kicker">Content Archive</span>
          <h1 className="text-2xl font-semibold tracking-tight">你的内容资产</h1>
          <p className="mt-1 text-sm text-muted-foreground">历史记录自动保留最近 3 次正文生成，主动保存的内容会沉淀为草稿。</p>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-border/70 bg-muted/20 p-1">
        <button type="button" onClick={() => changeTab("history")} className={cn("rounded-lg px-4 py-2 text-sm font-medium", tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
          历史记录·{history.length}/3
        </button>
        <button type="button" onClick={() => changeTab("drafts")} className={cn("rounded-lg px-4 py-2 text-sm font-medium", tab === "drafts" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
          草稿·{drafts.length}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 text-center">
          <Archive className="mb-3 h-7 w-7 text-muted-foreground/60" />
          <p className="text-sm font-medium">{tab === "history" ? "还没有生成历史" : "还没有保存草稿"}</p>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            {tab === "history" ? history.map((run, runIndex) => (
              <section key={run.historyEntryId} className="rounded-xl border border-border/80 bg-card/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium"><Clock3 className="h-3.5 w-3.5" />第 {runIndex + 1} 次记录</div>
                  <Badge variant="outline" className="text-[10px]">{businessLineLabel(run.businessLine)}</Badge>
                </div>
                <p className="mb-2 text-[11px] text-muted-foreground">{formatTime(run.generatedAt)}</p>
                <div className="space-y-1.5">
                  {run.results.map((content) => {
                    const key = `${run.historyEntryId}:${content.id}`;
                    return <EntryButton key={key} active={selected?.key === key} title={content.selectedTitle} onClick={() => setSelectedKey(key)} />;
                  })}
                </div>
              </section>
            )) : draftEntries.map((entry) => (
              <div key={entry.key} className="group relative">
                <EntryButton active={selected?.key === entry.key} title={entry.content.selectedTitle} subtitle={formatTime(entry.time)} onClick={() => setSelectedKey(entry.key)} />
                <button type="button" aria-label="删除草稿" onClick={() => deleteDraft(entry.key)} className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </aside>

          {selected ? <DraftPreview entry={selected} /> : null}
        </div>
      )}
    </div>
  );
}

function EntryButton({ active, title, subtitle, onClick }: { active: boolean; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("w-full rounded-lg border px-3 py-2.5 text-left transition-colors", active ? "border-primary/50 bg-primary/5" : "border-border/70 hover:border-primary/30")}>
      <span className="block pr-7 text-sm font-medium leading-snug line-clamp-2">{title}</span>
      {subtitle ? <span className="mt-1 block text-[11px] text-muted-foreground">{subtitle}</span> : null}
    </button>
  );
}

function DraftPreview({ entry }: { entry: SelectedEntry }) {
  const images = entry.content.generatedImages || [];
  return (
    <article className="rounded-xl border border-border/80 bg-card/60">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 p-5">
        <div>
          <div className="mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /><Badge variant="outline">{entry.source === "history" ? "历史记录" : "用户草稿"}</Badge></div>
          <h2 className="text-xl font-semibold leading-snug">{entry.content.selectedTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{formatTime(entry.time)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void copyTextToClipboard(buildContentCopyText(entry.content))}>
          <Copy className="h-4 w-4" />复制全文
        </Button>
      </header>
      <div className="space-y-5 p-5">
        {images.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {images.map((image, index) => (
              <div key={`${image.imageIndex ?? image.promptIndex}-${index}`} className="aspect-[3/4] overflow-hidden rounded-lg border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.localPath || image.url} alt={`草稿图 ${index + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        {entry.content.generationMode === "video-script" || entry.content.storyboard?.length ? (
          <VideoScriptTable content={entry.content} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{entry.content.content}</pre>
        )}
      </div>
    </article>
  );
}
