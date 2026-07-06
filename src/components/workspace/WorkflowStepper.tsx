"use client";

import { cn } from "@/lib/utils";

export interface WorkflowStep {
  id: number;
  label: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  current: number;
  onStepClick?: (step: number) => void;
  canClickStep?: (step: number) => boolean;
  isStepComplete?: (step: number) => boolean;
}

export function WorkflowStepper({ steps, current, onStepClick, canClickStep, isStepComplete }: WorkflowStepperProps) {
  return (
    <nav aria-label="创作流程" className="w-full">
      <ol className="flex items-start justify-center gap-0">
        {steps.map((step, index) => {
          const done = current > step.id || Boolean(isStepComplete?.(step.id));
          const active = current === step.id;
          const clickable = onStepClick && (done || active || canClickStep?.(step.id));
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center last:flex-none">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    aria-hidden
                    className={cn("h-px flex-1", done || active ? "bg-primary/50" : "bg-border")}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStepClick?.(step.id)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative shrink-0 rounded-full transition-all",
                    clickable && "cursor-pointer hover:scale-110",
                    !clickable && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "block rounded-full border-2 transition-all",
                      active && "h-3 w-3 border-primary bg-primary shadow-[0_0_8px] shadow-primary/40",
                      done && !active && "h-2.5 w-2.5 border-primary bg-primary/30",
                      !active && !done && "h-2.5 w-2.5 border-muted-foreground/40 bg-transparent",
                    )}
                  />
                </button>
                {!isLast ? (
                  <div
                    aria-hidden
                    className={cn("h-px flex-1", done ? "bg-primary/50" : "bg-border")}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 max-w-[4.5rem] text-center text-[11px] leading-tight sm:max-w-none sm:text-xs",
                  active && "font-medium text-primary",
                  done && !active && "text-muted-foreground",
                  !active && !done && "text-muted-foreground/60",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
