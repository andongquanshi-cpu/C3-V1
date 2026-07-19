"use client";

import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CreativeAngle } from "@/lib/types";

interface AnglesPanelProps {
  angles: CreativeAngle[];
  selectedAngleIds: string[];
  isGenerating: boolean;
  onSelectedAngleIdsChange: (ids: string[]) => void;
  onGenerate: () => void;
}

export function AnglesPanel({
  angles,
  selectedAngleIds,
  isGenerating,
  onSelectedAngleIdsChange,
  onGenerate,
}: AnglesPanelProps) {
  function toggleAngle(angleId: string, checked: boolean) {
    onSelectedAngleIdsChange(
      checked
        ? [...new Set([...selectedAngleIds, angleId])]
        : selectedAngleIds.filter((id) => id !== angleId),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">固定生成 6 个</Badge>
          {angles.length > 0 ? (
            <span className="text-sm text-muted-foreground">已选 {selectedAngleIds.length} / {angles.length}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {angles.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onSelectedAngleIdsChange(
                  selectedAngleIds.length === angles.length ? [] : angles.map((item) => item.angleId),
                )
              }
            >
              {selectedAngleIds.length === angles.length ? "取消全选" : "全选"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={angles.length > 0 ? "outline" : "default"}
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : angles.length > 0 ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? "生成中…" : angles.length > 0 ? "刷新 6 个角度" : "生成 6 个角度"}
          </Button>
        </div>
      </div>

      {isGenerating && angles.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在组合不同创意维度…
        </div>
      ) : angles.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-5 text-center">
          <Sparkles className="mb-3 h-6 w-6 text-primary/60" />
          <p className="text-sm font-medium">尚未生成创意角度</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">系统会在点击生成时检查当前选择，并一次生成 6 个角度。</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {angles.map((angle) => {
            const selected = selectedAngleIds.includes(angle.angleId);
            return (
              <label
                key={angle.angleId}
                className={cn(
                  "cursor-pointer rounded-xl border p-4 transition-all",
                  selected
                    ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
                )}
              >
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    checked={selected}
                    onChange={(event) => toggleAngle(angle.angleId, event.target.checked)}
                  />
                  <div className="min-w-0 space-y-2">
                    <strong className="text-sm leading-snug">{angle.angleName}</strong>
                    <p className="text-sm leading-relaxed text-muted-foreground">{angle.coreIdea}</p>
                    {angle.displayTags?.length ? (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {angle.displayTags.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
