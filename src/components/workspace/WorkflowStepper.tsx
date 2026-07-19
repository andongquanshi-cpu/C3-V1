"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkflowStep<StepId extends string | number = number> {
  id: StepId;
  label: string;
}

interface WorkflowStepperProps<StepId extends string | number> {
  steps: readonly WorkflowStep<StepId>[];
  current: StepId;
  onStepClick?: (step: StepId) => void;
  canClickStep?: (step: StepId) => boolean;
  isStepComplete?: (step: StepId) => boolean;
}

export function WorkflowStepper<StepId extends string | number>({
  steps,
  current,
  onStepClick,
  canClickStep,
  isStepComplete,
}: WorkflowStepperProps<StepId>) {
  return (
    <nav aria-label="创作流程" className="w-full">
      <ol className="flex items-start justify-center gap-0">
        {steps.map((step, index) => {
          const done = Boolean(isStepComplete?.(step.id));
          const active = current === step.id;
          const clickable = Boolean(onStepClick && (canClickStep ? canClickStep(step.id) : true));
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="workflow-step-track flex w-full items-center">
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
                    "workflow-step-button relative shrink-0 rounded-full transition-all",
                    clickable && "cursor-pointer hover:-translate-y-0.5",
                    !clickable && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold transition-all",
                      active && "border-primary bg-primary text-primary-foreground shadow-[0_8px_20px] shadow-primary/25",
                      done && !active && "border-primary/30 bg-primary/10 text-primary",
                      !active && !done && "border-border bg-background/45 text-muted-foreground/60",
                    )}
                  >
                    {done && !active ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
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
