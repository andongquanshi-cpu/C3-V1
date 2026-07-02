"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FALLBACK_LICAITONG_WORKFLOW,
  getContentLengthOptions,
  getLicaitongOffer,
  getLicaitongScene,
  type LicaitongWorkflowConfig,
} from "@/lib/licaitong-workflow";
import { getPrimaryMaterial, getSelectedMaterials } from "@/lib/hotspot-workflow";
import type { BriefInput, Material } from "@/lib/types";

interface BriefSummaryCardProps {
  brief: BriefInput;
  materials: Material[];
  anglesSelected: number;
  anglesTotal: number;
  kbVersion?: string;
  workflowConfig?: LicaitongWorkflowConfig;
}

export function BriefSummaryCard({
  brief,
  materials,
  anglesSelected,
  anglesTotal,
  kbVersion,
  workflowConfig = FALLBACK_LICAITONG_WORKFLOW,
}: BriefSummaryCardProps) {
  const offer = getLicaitongOffer(brief.offerId, workflowConfig);
  const scene = getLicaitongScene(brief.creationScene, workflowConfig);
  const persona = workflowConfig.personas.find((item) => item.id === brief.personaId);
  const lengthLabel =
    getContentLengthOptions(brief.generationMode).find((item) => item.value === brief.contentLength)?.label || "-";
  const selectedMaterials = getSelectedMaterials(materials);
  const primaryMaterial = getPrimaryMaterial(materials);

  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">当前 Brief</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">理财通</Badge>
          <Badge>{offer.label}</Badge>
          {kbVersion ? <Badge variant="outline">KB {kbVersion}</Badge> : null}
        </div>

        <dl className="space-y-2.5">
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">主推 Offer</dt>
            <dd className="text-right font-medium">{offer.label}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">创作场景</dt>
            <dd className="text-right font-medium">{scene.label}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">目标读者</dt>
            <dd className="font-medium">{brief.targetUser}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">博主人设</dt>
            <dd className="text-right font-medium">{persona?.label || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">主推功能</dt>
            <dd className="text-right font-medium">
              {brief.selectedFeatureNames.join("、") || `${brief.selectedFeatureIds.length} 项`}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">内容形式</dt>
            <dd className="font-medium">{brief.generationMode === "video-script" ? "视频脚本" : "图文内容"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">
              {brief.generationMode === "video-script" ? "视频时长" : "文字篇幅"}
            </dt>
            <dd className="font-medium">{lengthLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">已选素材</dt>
            <dd className="text-right font-medium">{selectedMaterials.length} 条</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">创意角度</dt>
            <dd className="font-medium">
              {anglesTotal > 0 ? `${anglesSelected}/${anglesTotal}` : "待生成"}
            </dd>
          </div>
        </dl>

        {primaryMaterial ? (
          <div className="rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
            <p className="mb-1 font-medium text-foreground/80">主热点</p>
            {primaryMaterial.title}
          </div>
        ) : null}

        <div className="rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
          <p className="mb-1 font-medium text-foreground/80">主题</p>
          {brief.topic || "尚未填写主题"}
        </div>
      </CardContent>
    </Card>
  );
}
