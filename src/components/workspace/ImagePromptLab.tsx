"use client";

import { useState } from "react";
import { ExternalLink, ImageIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GeneratedContent } from "@/lib/types";

type PromptItem = GeneratedContent["imagePromptSuggestions"][number];

interface ImagePromptLabProps {
  contentId: string;
  prompts: PromptItem[];
  imageApiReady: boolean;
  imageModel?: string;
}

type SlotState = {
  loading: boolean;
  url?: string;
  error?: string;
};

function slotKey(contentId: string, index: number) {
  return `${contentId}:${index}`;
}

function formatImageModelLabel(model?: string) {
  if (!model) return "豆包生图";
  if (/seedream.*5|5\.0|5-0/i.test(model)) return "豆包 5.0 生图";
  if (/seedream|doubao/i.test(model)) return "豆包生图";
  return `${model} 生图`;
}

export function ImagePromptLab({ contentId, prompts, imageApiReady, imageModel }: ImagePromptLabProps) {
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const generateLabel = formatImageModelLabel(imageModel);

  async function generate(index: number, prompt: string) {
    const key = slotKey(contentId, index);
    if (!prompt.trim()) return;
    setSlots((current) => ({ ...current, [key]: { loading: true } }));
    try {
      const response = await fetch("/api/image-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "图片生成失败");
      const url = data.data?.[0]?.url || data.url || "";
      if (!url) throw new Error("API 未返回图片 URL");
      setSlots((current) => ({ ...current, [key]: { loading: false, url } }));
    } catch (error) {
      setSlots((current) => ({
        ...current,
        [key]: { loading: false, error: error instanceof Error ? error.message : "生成失败" },
      }));
    }
  }

  if (!prompts.length) {
    return (
      <section className="rounded-xl border border-border p-4">
        <div className="mb-2 flex items-center gap-2 font-medium text-sm">
          <ImageIcon className="h-4 w-4" />
          封面 Prompt
        </div>
        <p className="text-xs text-muted-foreground">暂无可用 Prompt，请重新生成正文</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-sm">
          <ImageIcon className="h-4 w-4" />
          封面 Prompt
        </div>
        {imageModel ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {imageModel}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-3">
        {prompts.map((item, index) => {
          const key = slotKey(contentId, index);
          const slot = slots[key];
          const hasPrompt = Boolean(item.prompt?.trim());

          return (
            <div
              key={key}
              className="rounded-lg border border-border/70 bg-muted/15 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {item.style ? (
                  <Badge variant={item.style === "fallback-cover" ? "outline" : "secondary"} className="text-[10px]">
                    {item.style === "fallback-cover" ? "自动拼装" : item.style}
                  </Badge>
                ) : null}
                {item.coverText ? (
                  <span className="text-[11px] text-muted-foreground">封面字：{item.coverText}</span>
                ) : null}
              </div>

              <p className="text-xs leading-5 text-muted-foreground">{item.prompt || "（空 Prompt）"}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {imageApiReady ? (
                  <button
                    type="button"
                    disabled={!hasPrompt || slot?.loading}
                    onClick={() => generate(index, item.prompt)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    {slot?.loading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        生成中…
                      </>
                    ) : (
                      generateLabel
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">未配置 IMAGE_API_KEY</span>
                )}
              </div>

              {slot?.error ? (
                <p className="mt-2 text-[11px] text-destructive">{slot.error}</p>
              ) : null}

              {slot?.url ? (
                <div className="mt-3 space-y-2">
                  <a
                    href={slot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    新标签打开原图
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slot.url}
                    alt={`封面方案 ${index + 1}`}
                    className="max-h-48 w-full rounded-md border border-border/60 object-contain bg-background"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
