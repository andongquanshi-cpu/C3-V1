import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BusinessLineWorkbench } from "@/components/workspace/BusinessLineWorkbench";
import { BUSINESS_LINE_PRESETS } from "@/lib/business-line";
import type { BusinessLine } from "@/lib/types";

interface CreationWorkbenchProps {
  businessLine: BusinessLine;
}

export function CreationWorkbench({ businessLine }: CreationWorkbenchProps) {
  const preset = BUSINESS_LINE_PRESETS[businessLine];

  return (
    <section className="workbench-shell creation-page-shell mx-auto w-full text-foreground" aria-label={`${preset.shortLabel}内容创作工作台`}>
      <header className="creation-page-intro">
        <Link href="/" className="creation-page-back"><ArrowLeft className="h-4 w-4" /> 返回首页</Link>
        <div className="creation-page-title">
          <span><Sparkles className="h-3.5 w-3.5" /> C3 Creative Workspace</span>
          <h1>{preset.shortLabel}内容创作</h1>
          <p>从策略要素开始，按流程完成创意角度、内容生成与合规发布。</p>
        </div>
        <Badge variant="outline" className="creation-page-business-badge">当前业务线 · {preset.shortLabel}</Badge>
      </header>

      <BusinessLineWorkbench businessLine={businessLine} />
    </section>
  );
}
