"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BusinessLineWorkbench } from "@/components/workspace/BusinessLineWorkbench";
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
            <Badge variant="outline" className="hidden text-xs sm:inline-flex">
              KB v5.0
            </Badge>
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
        <BusinessLineWorkbench key={businessLine} businessLine={businessLine} />
      </div>
    </main>
  );
}
