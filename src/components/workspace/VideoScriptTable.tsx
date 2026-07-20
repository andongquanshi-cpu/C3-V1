"use client";

import { Download, Film, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GeneratedContent, VideoScriptShot } from "@/lib/types";

interface VideoScriptTableProps {
  content: GeneratedContent;
  showExport?: boolean;
}

function parseStoryboardText(text: string): VideoScriptShot[] {
  return text
    .split(/\n+/)
    .map<VideoScriptShot | null>((line, index) => {
      const shot = line.match(/【镜头(\d+)】/);
      if (!shot) return null;
      const visual = line.match(/画面：(.*?)(?=\s*\|\s*口播：|$)/)?.[1]?.trim() || "";
      const voiceover = line.match(/口播：(.*?)(?=\s*\|\s*时长：|\s*\|\s*运镜：|\s*\|\s*音效：|\s*\|\s*转场：|\s*\|\s*字幕：|$)/)?.[1]?.trim() || "";
      const duration = Number(line.match(/时长：([\d.]+)秒/)?.[1] || 0);
      const cameraMove = line.match(/运镜：(.*?)(?=\s*\||$)/)?.[1]?.trim();
      const sfx = line.match(/音效：(.*?)(?=\s*\||$)/)?.[1]?.trim();
      const transition = line.match(/转场：(.*?)(?=\s*\||$)/)?.[1]?.trim();
      const onScreenText = line.match(/字幕：(.*)$/)?.[1]?.trim() || undefined;
      if (!visual && !voiceover) return null;
      return {
        shotIndex: Number(shot[1]) || index + 1,
        durationSec: Number.isFinite(duration) ? duration : 0,
        visual,
        voiceover,
        onScreenText,
        cameraMove: cameraMove || undefined,
        sfx: sfx || undefined,
        transition: transition || undefined,
      };
    })
    .filter((item): item is VideoScriptShot => Boolean(item));
}

export function getVideoScriptShots(content: GeneratedContent) {
  if (content.storyboard?.length) return content.storyboard;
  return parseStoryboardText(content.content);
}

function safeCsvCell(value: unknown) {
  let text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadStoryboard(content: GeneratedContent, shots: VideoScriptShot[]) {
  const cover = content.coverDesign;
  const rows = [
    ["标题", content.selectedTitle, "", "", "", "", "", ""],
    ["钩子类型", content.openingHook?.type || content.scriptMeta?.hookType || "", "", "", "", "", "", ""],
    ["钩子口播", content.openingHook?.spokenLine || "", "", "", "", "", "", ""],
    ["钩子画面", content.openingHook?.visualNote || "", "", "", "", "", "", ""],
    ["节奏", content.scriptMeta?.rhythmNote || "", "", "", "", "", "", ""],
    ["封面画面", cover?.visual || "", "", "", "", "", "", ""],
    ["封面大字", cover?.headline || "", "", "", "", "", "", ""],
    ["封面小字", cover?.subline || "", "", "", "", "", "", ""],
    ["封面气质", cover?.mood || "", "", "", "", "", "", ""],
    ["镜头", "时长（秒）", "运镜", "转场", "画面/景别", "口播", "音效", "屏幕字幕"],
    ...shots.map((shot) => [
      shot.shotIndex,
      shot.durationSec || "",
      shot.cameraMove || "",
      shot.transition || "",
      shot.visual,
      shot.voiceover,
      shot.sfx || "",
      shot.onScreenText || "",
    ]),
    ["BGM", content.bgmSuggestion || "", "", "", "", "", "", ""],
    ["互动/CTA", content.interactionGuide || "", "", "", "", "", "", ""],
    ["风险提示", content.riskReminder || "", "", "", "", "", "", ""],
    ["话题", content.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" "), "", "", "", "", "", ""],
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = content.selectedTitle.replace(/[\\/:*?"<>|]/g, "_").slice(0, 48) || "视频脚本";
  link.href = url;
  link.download = `${filename}-分镜脚本.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function MetaBlock({ label, children }: { label: string; children?: string | null }) {
  if (!children) return null;
  return (
    <div className="border-t border-border/60 bg-muted/10 px-4 py-3 text-xs leading-5 text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      <div className="mt-1 whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export function VideoScriptTable({ content, showExport = true }: VideoScriptTableProps) {
  const shots = getVideoScriptShots(content);
  const totalDuration = shots.reduce((total, shot) => total + (shot.durationSec || 0), 0);
  const cover = content.coverDesign;
  const hook = content.openingHook;

  if (!shots.length) {
    return <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{content.content}</pre>;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-background/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <Film className="h-4 w-4 text-primary" />
            分镜执行表
          </span>
          <Badge variant="outline">{shots.length} 镜</Badge>
          {totalDuration > 0 ? (
            <Badge variant="outline" className="gap-1 font-normal">
              <Timer className="h-3 w-3" />
              约 {totalDuration} 秒
            </Badge>
          ) : null}
          {hook?.type || content.scriptMeta?.hookType ? (
            <Badge variant="outline" className="font-normal">
              开场：{hook?.type || content.scriptMeta?.hookType}
            </Badge>
          ) : null}
        </div>
        {showExport ? (
          <Button type="button" variant="outline" size="sm" onClick={() => downloadStoryboard(content, shots)}>
            <Download className="h-4 w-4" />
            导出 CSV
          </Button>
        ) : null}
      </div>

      {(hook?.spokenLine || hook?.visualNote || cover?.headline || cover?.visual) && (
        <div className="grid gap-3 border-b border-border/60 bg-muted/5 px-4 py-3 text-xs leading-5 sm:grid-cols-2">
          {hook?.spokenLine || hook?.visualNote ? (
            <div>
              <div className="font-medium text-foreground">开场</div>
              {hook?.spokenLine ? <p className="mt-1 text-muted-foreground">口播：{hook.spokenLine}</p> : null}
              {hook?.visualNote ? <p className="mt-1 text-muted-foreground">画面：{hook.visualNote}</p> : null}
            </div>
          ) : null}
          {cover?.headline || cover?.visual ? (
            <div>
              <div className="font-medium text-foreground">封面设计</div>
              {cover?.headline ? <p className="mt-1 text-muted-foreground">大字：{cover.headline}</p> : null}
              {cover?.subline ? <p className="mt-1 text-muted-foreground">小字：{cover.subline}</p> : null}
              {cover?.visual ? <p className="mt-1 text-muted-foreground">画面：{cover.visual}</p> : null}
              {cover?.mood ? <p className="mt-1 text-muted-foreground">气质：{cover.mood}</p> : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-muted/35 text-xs text-muted-foreground">
            <tr>
              <th className="w-16 px-3 py-3 font-medium">镜头</th>
              <th className="w-16 px-3 py-3 font-medium">时长</th>
              <th className="w-16 px-3 py-3 font-medium">运镜</th>
              <th className="w-20 px-3 py-3 font-medium">转场</th>
              <th className="w-[26%] px-3 py-3 font-medium">画面 / 景别</th>
              <th className="px-3 py-3 font-medium">口播</th>
              <th className="w-[14%] px-3 py-3 font-medium">音效</th>
              <th className="w-[12%] px-3 py-3 font-medium">字幕</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {shots.map((shot) => (
              <tr key={`${shot.shotIndex}-${shot.voiceover}`} className="align-top transition-colors hover:bg-accent/15">
                <td className="px-3 py-4">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                    {shot.shotIndex}
                  </span>
                </td>
                <td className="px-3 py-4 text-xs text-muted-foreground">
                  {shot.durationSec ? `${shot.durationSec}s` : "—"}
                </td>
                <td className="px-3 py-4 text-xs text-muted-foreground">{shot.cameraMove || "—"}</td>
                <td className="px-3 py-4 text-xs text-muted-foreground">{shot.transition || "—"}</td>
                <td className="px-3 py-4 leading-6 text-muted-foreground">{shot.visual || "—"}</td>
                <td className="px-3 py-4 font-medium leading-7 text-foreground">{shot.voiceover || "—"}</td>
                <td className="px-3 py-4 text-xs leading-5 text-muted-foreground">{shot.sfx || "—"}</td>
                <td className="px-3 py-4 text-xs leading-5 text-muted-foreground">{shot.onScreenText || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MetaBlock label="BGM：">{content.bgmSuggestion}</MetaBlock>
      <MetaBlock label="节奏：">{content.scriptMeta?.rhythmNote}</MetaBlock>
      <MetaBlock label="互动 / CTA：">{content.interactionGuide}</MetaBlock>
    </section>
  );
}
