"use client";

import type { ReactNode } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkflowStageShellProps {
  title: string;
  description: string;
  confirmed?: boolean;
  canConfirm?: boolean;
  onConfirm?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  confirmLabel?: string;
  showConfirm?: boolean;
  nextRequiresConfirmation?: boolean;
  children: ReactNode;
  className?: string;
}

export function WorkflowStageShell({
  title,
  description,
  confirmed = false,
  canConfirm = false,
  onConfirm,
  onPrevious,
  onNext,
  nextLabel = "下一页",
  confirmLabel = "确认选择",
  showConfirm = true,
  nextRequiresConfirmation = true,
  children,
  className,
}: WorkflowStageShellProps) {
  return (
    <section className={cn("workflow-stage-shell overflow-hidden rounded-xl border border-border/80 bg-card/50", className)}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {showConfirm && onConfirm ? (
          <Button
            type="button"
            variant={confirmed ? "secondary" : "outline"}
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn(confirmed && "border-primary/25 text-primary")}
          >
            <CheckCircle2 className="h-4 w-4" />
            {confirmed ? "信息已确认" : confirmLabel}
          </Button>
        ) : null}
      </header>

      <div className="p-5 sm:p-6">{children}</div>

      <footer className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/10 px-5 py-4 sm:px-6">
        <div>
          {onPrevious ? (
            <Button type="button" variant="ghost" onClick={onPrevious}>
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
          ) : null}
        </div>
        {onNext ? (
          <Button type="button" onClick={onNext} disabled={nextRequiresConfirmation && !confirmed}>
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : null}
      </footer>
    </section>
  );
}
