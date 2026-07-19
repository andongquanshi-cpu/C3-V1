"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  FileCheck2,
  FilePenLine,
  Lightbulb,
  Network,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BUSINESS_LINE_PRESETS } from "@/lib/business-line";
import { cn } from "@/lib/utils";
import type { BusinessLine } from "@/lib/types";

const HERO_MESSAGES = [
  {
    lead: "把金融洞察，",
    accent: "变成值得发布的内容。",
    description: "从策略要素到创意成稿，C3 将专业金融表达、平台语感与合规审查收拢进一条清晰工作流。",
  },
  {
    lead: "让复杂财经，",
    accent: "有逻辑，也有传播力。",
    description: "把专业概念拆成清晰叙事，让每一篇内容既经得起推敲，也更容易被读者理解。",
  },
  {
    lead: "从市场脉搏里，",
    accent: "找到内容的好角度。",
    description: "连接热点、用户情绪与产品价值，把稍纵即逝的信息转化为可持续表达的创意方向。",
  },
  {
    lead: "把专业判断，",
    accent: "写成愿意读完的故事。",
    description: "让金融知识离开术语堆叠，进入真实场景、具体问题和更有温度的内容表达。",
  },
  {
    lead: "让每一次表达，",
    accent: "有观点，也守住边界。",
    description: "在内容吸引力与金融合规之间找到平衡，让创意大胆，让事实、风险与措辞始终稳健。",
  },
  {
    lead: "把产品价值，",
    accent: "融进真实可信的内容。",
    description: "不罗列功能，不生硬推销，让产品从用户痛点和使用场景中自然出现。",
  },
  {
    lead: "从热点到成稿，",
    accent: "让财经创作更有章法。",
    description: "围绕选题、角度、正文与审核建立连贯路径，让灵感不再停留在零散的想法里。",
  },
  {
    lead: "不追逐噪声，",
    accent: "把有用信息写进内容。",
    description: "筛选真正值得解释的财经信息，用清晰结构帮助读者看懂变化、逻辑与风险。",
  },
  {
    lead: "让金融知识，",
    accent: "长出平台需要的语感。",
    description: "保留专业准确度，也保留真实的人感、节奏和互动，让内容更贴近用户正在阅读的平台。",
  },
  {
    lead: "把合规做底线，",
    accent: "把创意做到前面。",
    description: "让风险提示成为可信表达的一部分，在安全边界内持续探索更鲜明的财经内容创意。",
  },
] as const;

const CREATION_FLOW = [
  { step: "01", title: "策略要素", description: "业务、Offer、场景与人群", icon: Radar },
  { step: "02", title: "创意角度", description: "选题切口与平台语感", icon: Lightbulb },
  { step: "03", title: "内容成稿", description: "图文正文或视频脚本", icon: FilePenLine },
  { step: "04", title: "合规发布", description: "风险审查与草稿导出", icon: FileCheck2 },
] as const;

const CAPABILITY_ENGINES = [
  { title: "知识库检索", icon: BookOpenCheck },
  { title: "热点素材", icon: TrendingUp },
  { title: "合规规则", icon: ShieldCheck },
] as const;

const HERO_MESSAGE_SESSION_KEY = "c3-last-hero-message";

const MarketMomentumBackdrop = memo(function MarketMomentumBackdrop() {
  return (
    <div className="market-momentum-backdrop" aria-hidden="true">
      <div className="market-chart-grid" />
      <div className="market-momentum-wave market-momentum-wave-one" />
      <div className="market-momentum-wave market-momentum-wave-two" />
      <div className="market-momentum-path">
        <span /><span /><span /><span /><span />
      </div>
      <div className="market-momentum-nodes">
        <i /><i /><i /><i /><i /><i />
      </div>
      <div className="market-flow-particles">
        <b /><b /><b />
      </div>
    </div>
  );
});

export function CopilotWorkbench() {
  const [businessLine, setBusinessLine] = useState<BusinessLine>("licaitong");
  const [heroMessageIndex, setHeroMessageIndex] = useState(0);
  const heroMessage = HERO_MESSAGES[heroMessageIndex];
  const activeBusinessLine = BUSINESS_LINE_PRESETS[businessLine];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const lastIndex = Number(window.sessionStorage.getItem(HERO_MESSAGE_SESSION_KEY));
      const candidates = HERO_MESSAGES.map((_, index) => index).filter(
        (index) => !Number.isInteger(lastIndex) || index !== lastIndex,
      );
      const nextIndex = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
      window.sessionStorage.setItem(HERO_MESSAGE_SESSION_KEY, String(nextIndex));
      setHeroMessageIndex(nextIndex);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="workbench-shell homepage-shell mx-auto w-full text-foreground" aria-label="C3 财经内容创作首页">
      <div className="workbench-header homepage-composite-card">
        <div className="financial-workbench-hero homepage-hero homepage-hero-top">
          <MarketMomentumBackdrop />

          <div className="financial-hero-copy">
            <div className="financial-hero-eyebrow">
              <span><TrendingUp className="h-3.5 w-3.5" /> AI Financial Creative Desk</span>
              <Badge variant="outline" className="financial-live-badge"><span className="financial-live-dot" /> 知识库在线</Badge>
            </div>
            <h1>{heroMessage.lead}<span>{heroMessage.accent}</span></h1>
            <p>{heroMessage.description}</p>
            <div className="financial-hero-signals" aria-label="工作台能力">
              <span><Sparkles className="h-3.5 w-3.5" /> 矩阵创作</span>
              <span><ShieldCheck className="h-3.5 w-3.5" /> 合规内置</span>
              <span><ArrowUpRight className="h-3.5 w-3.5" /> 稳健表达</span>
            </div>
          </div>

          <div className="business-line-control">
            <span className="business-line-label">选择业务线</span>
            <div className="business-line-switcher" aria-label="选择业务线">
              {Object.values(BUSINESS_LINE_PRESETS).map((line) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => setBusinessLine(line.id)}
                  aria-pressed={businessLine === line.id}
                  className={cn("business-line-button", businessLine === line.id && "is-active")}
                >
                  <span>{line.shortLabel}</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="homepage-cta-band homepage-cta-embedded">
          <span className="homepage-cta-kicker">策略清楚，创作就有方向</span>
          <Link href={`/create?businessLine=${businessLine}`} className="homepage-start-button">
            <span>开始创作</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="homepage-cta-context">将以{activeBusinessLine.shortLabel}进入第一环节</span>
        </div>

        <section className="homepage-capability-map homepage-capability-compact" aria-labelledby="creation-path-title">
          <div className="homepage-section-heading homepage-section-heading-compact">
            <span><Network className="h-4 w-4" /> C3 创作路径</span>
            <h2 id="creation-path-title">四步完成一条财经内容</h2>
          </div>

          <div className="creation-flow-map creation-flow-map-compact">
            <div className="creation-flow-track" aria-hidden="true" />
            {CREATION_FLOW.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.step} className="creation-flow-node creation-flow-node-compact">
                  <span className="creation-flow-icon"><Icon className="h-4 w-4" /></span>
                  <span className="creation-flow-step">{item.step}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="compact-capability-engine-strip" aria-label="全流程能力引擎">
            <span>全流程支持</span>
            {CAPABILITY_ENGINES.map((engine) => {
              const Icon = engine.icon;
              return <span key={engine.title}><Icon className="h-3.5 w-3.5" />{engine.title}</span>;
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
