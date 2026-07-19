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
      const voiceover = line.match(/口播：(.*?)(?=\s*\|\s*时长：|\s*\|\s*字幕：|$)/)?.[1]?.trim() || "";
      const duration = Number(line.match(/时长：([\d.]+)秒/)?.[1] || 0);
      const onScreenText = line.match(/字幕：(.*)$/)?.[1]?.trim() || undefined;
      if (!visual && !voiceover) return null;
      return {
        shotIndex: Number(shot[1]) || index + 1,
        durationSec: Number.isFinite(duration) ? duration : 0,
        visual,
        voiceover,
        onScreenText,
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
  const rows = [
    ["标题", content.selectedTitle, "", "", ""],
    ["镜头", "时长（秒）", "画面/景别", "口播", "屏幕字幕"],
    ...shots.map((shot) => [
      shot.shotIndex,
      shot.durationSec || "",
      shot.visual,
      shot.voiceover,
      shot.onScreenText || "",
    ]),
    ["BGM", content.bgmSuggestion || "", "", "", ""],
    ["风险提示", content.riskReminder || "", "", "", ""],
    ["话题", content.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" "), "", "", ""],
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

export function VideoScriptTable({ content, showExport = true }: VideoScriptTableProps) {
  const shots = getVideoScriptShots(content);
  const totalDuration = shots.reduce((total, shot) => total + (shot.durationSec || 0), 0);

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
        </div>
        {showExport ? (
          <Button type="button" variant="outline" size="sm" onClick={() => downloadStoryboard(content, shots)}>
            <Download className="h-4 w-4" />
            导出 CSV
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-muted/35 text-xs text-muted-foreground">
            <tr>
              <th className="w-20 px-4 py-3 font-medium">镜头</th>
              <th className="w-24 px-4 py-3 font-medium">时长</th>
              <th className="w-[28%] px-4 py-3 font-medium">画面 / 景别</th>
              <th className="px-4 py-3 font-medium">口播</th>
              <th className="w-[18%] px-4 py-3 font-medium">屏幕字幕</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {shots.map((shot) => (
              <tr key={`${shot.shotIndex}-${shot.voiceover}`} className="align-top transition-colors hover:bg-accent/15">
                <td className="px-4 py-4">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                    {shot.shotIndex}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  {shot.durationSec ? `${shot.durationSec}s` : "—"}
                </td>
                <td className="px-4 py-4 leading-6 text-muted-foreground">{shot.visual || "—"}</td>
                <td className="px-4 py-4 font-medium leading-7 text-foreground">{shot.voiceover || "—"}</td>
                <td className="px-4 py-4 text-xs leading-5 text-muted-foreground">{shot.onScreenText || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {content.bgmSuggestion ? (
        <div className="border-t border-border/60 bg-muted/10 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">BGM：</span>
          {content.bgmSuggestion}
        </div>
      ) : null}
    </section>
  );
}
