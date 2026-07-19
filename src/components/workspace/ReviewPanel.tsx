"use client";

import { Copy, FileCheck2, ImageIcon, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildContentCopyText, copyTextToClipboard } from "@/lib/clipboard-utils";
import type { GeneratedContent } from "@/lib/types";
import { VideoScriptTable } from "@/components/workspace/VideoScriptTable";

interface ReviewPanelProps {
  content: GeneratedContent;
  onSaveDraft: () => void;
  /** 图文旁路：从审核页轻量进入制图 */
  onEnterVisualStudio?: () => void;
}

export function ReviewPanel({ content, onSaveDraft, onEnterVisualStudio }: ReviewPanelProps) {
  const images = content.generatedImages || [];
  const isVideoScript = content.generationMode === "video-script" || Boolean(content.storyboard?.length);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <article className="rounded-xl border border-border bg-card">
          <div className="border-b border-border/60 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold leading-snug">{content.selectedTitle}</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void copyTextToClipboard(
                    buildContentCopyText({
                      selectedTitle: content.selectedTitle,
                      content: content.content,
                      tags: content.tags,
                      interactionGuide: content.interactionGuide,
                    }),
                  )
                }
              >
                <Copy className="h-4 w-4" />
                复制全文
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {content.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag.replace(/^#/, "")}
                </Badge>
              ))}
            </div>
          </div>
          <div className="p-5 sm:p-6">
            {isVideoScript ? (
              <VideoScriptTable content={content} />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{content.content}</pre>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          {!isVideoScript ? (
            <section className="rounded-xl border border-border p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FileCheck2 className="h-4 w-4" />
                审核结果
              </div>
              <Badge variant={content.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}>
                {content.complianceReport?.publishReadiness === "ready" ? "可发布" : "需确认"}
              </Badge>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {content.complianceReport?.summary || "已完成基础合规检查。"}
              </p>
            </section>
          ) : null}

          {!isVideoScript ? (
            <section className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="h-4 w-4" />
                配图{images.length ? ` · ${images.length}` : "（可选）"}
              </div>
              {images.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((image, index) => {
                    const src = image.localPath || image.url;
                    return (
                      <div
                        key={`${image.imageIndex ?? image.promptIndex}-${src}`}
                        className="aspect-[3/4] overflow-hidden rounded-lg border bg-muted/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`生成图 ${index + 1}`} className="h-full w-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">尚未配图，可先审核正文；需要时再去制图。</p>
              )}
              {onEnterVisualStudio ? (
                <Button className="mt-3 w-full" variant="outline" size="sm" onClick={onEnterVisualStudio}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {images.length || content.visualPlan ? "继续制图" : "去制图"}
                </Button>
              ) : null}
            </section>
          ) : null}

          <Button className="w-full" variant="outline" onClick={onSaveDraft}>
            <Save className="h-4 w-4" />
            保存到草稿箱
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            仅用户主动保存的内容会进入“草稿”；每次正文生成已自动记入“历史记录”。
          </p>
        </aside>
      </div>
    </div>
  );
}
