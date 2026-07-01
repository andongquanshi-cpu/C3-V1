"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  applyGenerationModeChange,
  getContentLengthFieldLabel,
  getContentLengthOptions,
} from "@/lib/licaitong-workflow";
import { cn } from "@/lib/utils";
import type { BriefInput, CreativeAngle } from "@/lib/types";

interface LicaitongAnglesPanelProps {
  brief: BriefInput;
  angles: CreativeAngle[];
  selectedAngleIds: string[];
  isBusy: boolean;
  apiReady: boolean;
  onBriefChange: (patch: Partial<BriefInput>) => void;
  onBriefReplace: (updater: (current: BriefInput) => BriefInput) => void;
  onSelectedAngleIdsChange: (ids: string[]) => void;
  onGenerateAngles: () => void;
  onGenerateContent: () => void;
  onBackToConfig: () => void;
}

function SectionTitle({ step, title, action }: { step: number; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          {step}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full rounded-lg border border-border/70 bg-muted/25 p-1",
        className,
      )}
    >
      {options.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
            value === item.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
              : "text-muted-foreground hover:bg-background/40 hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function LicaitongAnglesPanel({
  brief,
  angles,
  selectedAngleIds,
  isBusy,
  apiReady,
  onBriefChange,
  onBriefReplace,
  onSelectedAngleIdsChange,
  onGenerateAngles,
  onGenerateContent,
  onBackToConfig,
}: LicaitongAnglesPanelProps) {
  function toggleAngle(angleId: string, checked: boolean) {
    onSelectedAngleIdsChange(
      checked ? [...selectedAngleIds, angleId] : selectedAngleIds.filter((id) => id !== angleId),
    );
  }

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border/80 bg-card/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <button
            type="button"
            onClick={onBackToConfig}
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回创作配置
          </button>
          <h2 className="text-lg font-semibold">创意角度</h2>
        </div>
        {angles.length > 0 ? (
          <Badge variant="outline" className="shrink-0">
            {angles.length} 个角度
          </Badge>
        ) : null}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <section className="rounded-xl border border-border/70 bg-muted/15 p-4">
          <SectionTitle step={1} title="生成参数" />
          <div className="grid gap-4 sm:grid-cols-[120px_140px_minmax(0,1fr)] sm:items-end">
            <div className="space-y-2">
              <Label className="text-xs">角度数量</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={brief.generateCount}
                onChange={(e) => onBriefChange({ generateCount: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">植入强度</Label>
              <Select
                value={brief.embedLevel}
                onChange={(e) => onBriefChange({ embedLevel: e.target.value as BriefInput["embedLevel"] })}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">额外要求（选填）</Label>
              <Input
                value={brief.customRequirement || ""}
                onChange={(e) => onBriefChange({ customRequirement: e.target.value })}
                placeholder="例如：更像小红书日记，少教程感"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            {isBusy ? (
              <Button size="lg" disabled className="min-w-[200px]">
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中…
              </Button>
            ) : angles.length > 0 ? (
              <Button size="lg" variant="secondary" onClick={onGenerateAngles} disabled={!apiReady} className="min-w-[200px]">
                <RefreshCw className="h-4 w-4" />
                重新生成
              </Button>
            ) : (
              <Button size="lg" onClick={onGenerateAngles} disabled={!apiReady} className="min-w-[200px]">
                <Sparkles className="h-4 w-4" />
                生成创意角度
              </Button>
            )}
          </div>
        </section>

        <section>
          <SectionTitle
            step={2}
            title="选择角度"
            action={
              angles.length > 0 ? (
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onSelectedAngleIdsChange(angles.map((a) => a.angleId))}>
                    全选
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onSelectedAngleIdsChange([])}>
                    清空
                  </Button>
                </div>
              ) : null
            }
          />

          {isBusy && angles.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 py-14 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中…
            </div>
          ) : angles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 py-14" />
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
                        onChange={(e) => toggleAngle(angle.angleId, e.target.checked)}
                      />
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm leading-snug">{angle.angleName}</strong>
                          <Badge variant={angle.riskLevel === "low" ? "success" : "warning"} className="text-[10px]">
                            {angle.riskLevel}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{angle.coreIdea}</p>
                        {angle.titleDirections.length > 0 ? (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {angle.titleDirections.slice(0, 2).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] font-normal">
                                {t}
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
        </section>

        <section className="rounded-xl border border-border/70 bg-muted/15 p-5">
          <SectionTitle step={3} title="成稿设置" />
          <div className="grid gap-6 sm:grid-cols-2 sm:max-w-2xl">
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">内容形式</Label>
              <SegmentedControl
                value={brief.generationMode}
                options={[
                  { value: "image-text", label: "图文内容" },
                  { value: "video-script", label: "视频脚本" },
                ]}
                onChange={(mode) => onBriefReplace((current) => applyGenerationModeChange(current, mode))}
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">
                {getContentLengthFieldLabel(brief.generationMode)}
              </Label>
              <Select
                value={brief.contentLength}
                onChange={(e) => onBriefChange({ contentLength: e.target.value as BriefInput["contentLength"] })}
                className="h-11"
              >
                {getContentLengthOptions(brief.generationMode).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="text-sm text-muted-foreground">
            已选 {selectedAngleIds.length}
            {angles.length > 0 ? ` / ${angles.length}` : ""}
          </p>
          <Button
            size="lg"
            onClick={onGenerateContent}
            disabled={isBusy || !apiReady || angles.length === 0 || selectedAngleIds.length === 0}
          >
            生成正文{selectedAngleIds.length > 0 ? `（${selectedAngleIds.length}）` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
