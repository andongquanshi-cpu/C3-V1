"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LicaitongWorkbench } from "@/components/workspace/LicaitongWorkbench";
import { BUSINESS_LINE_PRESETS } from "@/lib/business-line";
import { cn } from "@/lib/utils";
import type { BusinessLine } from "@/lib/types";

export function CopilotWorkbench() {
  const [businessLine, setBusinessLine] = useState<BusinessLine>("licaitong");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/80 bg-card/30">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">C3 Copilot</h1>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">小红书爆款内容生成器</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="hidden text-xs sm:inline-flex">KB v4.0</Badge>
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
              {Object.values(BUSINESS_LINE_PRESETS).map((line) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => setBusinessLine(line.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:px-3.5 sm:text-sm",
                    businessLine === line.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {line.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {businessLine === "licaitong" ? (
          <LicaitongWorkbench />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-20 text-center">
            <h2 className="text-lg font-semibold">微证券工作台正在改版</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              本期优先交付理财通固收+ 流程。微证券将沿用相同的产品架构（Offer → 场景 → 人设 → 生成），敬请期待。
            </p>
            <Button className="mt-6" onClick={() => setBusinessLine("licaitong")}>
              前往理财通创作
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
