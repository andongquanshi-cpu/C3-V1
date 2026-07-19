"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getOffer,
  getScene,
  getWorkflowFallback,
  type BusinessLineWorkflowConfig,
} from "@/lib/business-line-workflow";
import { getBusinessLinePreset } from "@/lib/business-line";
import { getEmbedLevelLabel } from "@/lib/embed-level";
import { getWeisecPersonaDisplayLabel } from "@/lib/weisec-persona-ui";
import type { BriefInput } from "@/lib/types";

interface BriefSummaryCardProps {
  brief: BriefInput;
  anglesSelected: number;
  anglesTotal: number;
  kbVersion?: string;
  workflowConfig?: BusinessLineWorkflowConfig;
}

export function BriefSummaryCard({
  brief,
  anglesSelected,
  anglesTotal,
  kbVersion,
  workflowConfig,
}: BriefSummaryCardProps) {
  const businessLine = brief.businessLine;
  const cfg = workflowConfig || getWorkflowFallback(businessLine);
  const preset = getBusinessLinePreset(businessLine);
  const offer = getOffer(brief.offerId, cfg, businessLine);
  const scene = getScene(brief.creationScene, cfg, businessLine);
  const persona = cfg.personas.find((item) => item.id === brief.personaId);
  const personaLabel =
    businessLine === "weisec"
      ? getWeisecPersonaDisplayLabel(
          brief,
          cfg.personas,
          brief.creationScene || cfg.defaultBrief.creationScene,
          brief.audienceTag || cfg.defaultBrief.audienceTag,
        ) || persona?.label
      : persona?.label;

  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">当前创作要素</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{preset.shortLabel}</Badge>
          {!cfg.hideOfferSelection && offer ? <Badge>{offer.label}</Badge> : null}
          {kbVersion ? <Badge variant="outline">KB {kbVersion}</Badge> : null}
        </div>

        <dl className="space-y-2.5">
          {!cfg.hideOfferSelection && offer ? <SummaryRow label="主推 Offer" value={offer.label} /> : null}
          <SummaryRow label="创作场景" value={brief.creationScene ? scene.label : "-"} />
          <SummaryRow label="目标读者" value={brief.targetUser || "-"} />
          <SummaryRow label="博主人设" value={personaLabel || "-"} />
          <SummaryRow
            label="主推功能"
            value={brief.selectedFeatureNames.join("、") || `${brief.selectedFeatureIds.length} 项`}
          />
          <SummaryRow label="产品出现" value={getEmbedLevelLabel(brief.embedLevel)} />
          <SummaryRow
            label="创意角度"
            value={anglesTotal > 0 ? `${anglesSelected}/${anglesTotal}` : "待生成"}
          />
        </dl>

        <div className="rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
          <p className="mb-1 font-medium text-foreground/80">系统创作任务</p>
          {brief.topic || "将在点击生成时根据当前选择自动整理"}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
