"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  applyAudienceChange,
  applyOfferChange,
  applyPersonaChange,
  applySceneChange,
  getPersonaRecommendation,
  getPersonaRecommendationLabel,
  getPersonasForUI,
  getWorkflowFallback,
  isFeatureSelectionActive,
  toggleFeature,
  type BusinessLineWorkflowConfig,
} from "@/lib/business-line-workflow";
import { EMBED_LEVEL_OPTIONS } from "@/lib/embed-level";
import { requiresHotspotMaterials } from "@/lib/hotspot-workflow";
import {
  expandPersonasForBriefUI,
  getPersonaUiRecommendation,
  isPersonaUiSelected,
  type PersonaUiEntry,
} from "@/lib/weisec-persona-ui";
import { cn } from "@/lib/utils";
import type { BriefInput, BusinessLine, Material, ProductFeatureView } from "@/lib/types";

interface BriefPanelProps {
  brief: BriefInput;
  offerFeatures: ProductFeatureView[];
  workflowConfig?: BusinessLineWorkflowConfig;
  onBriefChange: (patch: Partial<BriefInput> | ((current: BriefInput) => BriefInput)) => void;
}

function getContextualExamples(
  brief: BriefInput,
  cfg: BusinessLineWorkflowConfig,
  featureNameById: Record<string, string>,
) {
  const selectedFeature = brief.selectedFeatureIds.map((id) => featureNameById[id]).find(Boolean);
  const offerLabel = cfg.offers.find((item) => item.id === brief.offerId)?.label;

  if (brief.businessLine === "weisec") {
    const feature = selectedFeature || "微信消息提醒";
    return {
      topic: `例如：上班没法一直盯盘，我怎么用${feature}减少反复刷新`,
      hotspot: "例如：A股 财报季 市场热点",
      material: `粘贴与“${feature}”相关的官方功能说明、公告或新闻事实…`,
      custom: `例如：围绕“${feature}”写成白领通勤场景，不写成荐股或买卖信号`,
    };
  }

  const offer = offerLabel || "固收+";
  const feature = selectedFeature || "严选专区";
  return {
    topic: `例如：选${offer}产品太纠结，我先看懂${feature}里的风险等级和期限`,
    hotspot: `例如：降息 ${offer} 资产配置`,
    material: `粘贴${offer}或${feature}的官方页面说明、产品规则或相关新闻事实…`,
    custom: `例如：围绕“${offer} / ${feature}”写成职场人复盘，先讲风险和资金用途，不承诺收益`,
  };
}

function Column({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="brief-column flex min-h-0 flex-col rounded-xl border border-border/80 bg-card/40">
      <div className="border-b border-border/60 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            {index}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">{children}</div>
    </section>
  );
}

export function BriefPanel({ brief, offerFeatures, workflowConfig, onBriefChange }: BriefPanelProps) {
  const [hotspotQuery, setHotspotQuery] = useState("");
  const [hotspotResults, setHotspotResults] = useState<Material[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const businessLine: BusinessLine = brief.businessLine;
  const cfg = workflowConfig || getWorkflowFallback(businessLine);
  const scene = brief.creationScene;
  const audienceTag = brief.audienceTag;
  const featureNameById = Object.fromEntries(offerFeatures.map((item) => [item.id, item.name]));
  const contextualExamples = getContextualExamples(brief, cfg, featureNameById);
  const showFeatureSelection = isFeatureSelectionActive(brief, cfg, businessLine);
  const showHotspotSearch = requiresHotspotMaterials({
    personaId: brief.personaId,
    creationScene: brief.creationScene,
    config: cfg,
  });
  const licaitongPersonas = getPersonasForUI(scene, audienceTag, cfg, businessLine);
  const weisecPersonaGroups =
    businessLine === "weisec" ? expandPersonasForBriefUI(cfg.personas, scene, audienceTag, businessLine) : null;

  async function searchHotspots() {
    const query = hotspotQuery.trim() || brief.topic.trim();
    if (!query) {
      setSearchError("请先输入主题或搜索词");
      return;
    }
    setIsSearching(true);
    setSearchError("");
    try {
      const response = await fetch("/api/eastmoney-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "热点搜索失败");
      const items = (Array.isArray(data.items) ? data.items : []).slice(0, 8).map((item: Partial<Material>, index: number) => ({
        id: item.id || `hotspot_${Date.now()}_${index}`,
        title: String(item.title || `热点 ${index + 1}`),
        body: String(item.body || ""),
        source: item.source || "东方财富",
        tags: item.tags || ["热点"],
        createdAt: item.createdAt || new Date().toISOString(),
      }));
      setHotspotResults(items);
      if (!items.length) setSearchError("没有找到可用结果，可改用手动素材");
    } catch (error) {
      setHotspotResults([]);
      setSearchError(error instanceof Error ? error.message : "热点搜索失败");
    } finally {
      setIsSearching(false);
    }
  }

  function toggleHotspot(material: Material) {
    const selected = brief.materials || [];
    const exists = selected.some((item) => item.id === material.id);
    const next = exists
      ? selected.filter((item) => item.id !== material.id)
      : [...selected, { ...material, selected: true, isPrimary: selected.length === 0 }].slice(-8);
    onBriefChange({ materials: next });
  }

  function updateManualMaterial(body: string) {
    const others = (brief.materials || []).filter((item) => item.source !== "手动输入");
    if (!body.trim()) {
      onBriefChange({ materials: others });
      return;
    }
    const previous = (brief.materials || []).find((item) => item.source === "手动输入");
    const manual: Material = {
      id: previous?.id || "manual_material",
      title: body.trim().split("\n")[0].slice(0, 48) || "手动素材",
      body,
      source: "手动输入",
      tags: ["补充素材"],
      selected: true,
      isPrimary: others.length === 0,
      createdAt: previous?.createdAt || new Date().toISOString(),
    };
    onBriefChange({ materials: [...others, manual] });
  }

  function selectOffer(offerId: string) {
    const offer = cfg.offers.find((item) => item.id === offerId);
    if (!offer?.enabled || brief.offerId === offerId) return;
    onBriefChange((current) => applyOfferChange(current, offerId, featureNameById, cfg));
  }

  function selectScene(nextScene: string) {
    const preview = applySceneChange(brief, nextScene, featureNameById, cfg);
    const keepHotspots = requiresHotspotMaterials({
      personaId: preview.personaId,
      creationScene: preview.creationScene,
      config: cfg,
    });
    if (!keepHotspots) {
      setHotspotQuery("");
      setHotspotResults([]);
      setSearchError("");
    }
    onBriefChange((current) => {
      const next = applySceneChange(current, nextScene, featureNameById, cfg);
      return keepHotspots
        ? next
        : { ...next, materials: next.materials.filter((item) => item.source === "手动输入") };
    });
  }

  function selectPersona(personaId: string) {
    const preview = applyPersonaChange(brief, personaId, cfg);
    const keepHotspots = requiresHotspotMaterials({
      personaId: preview.personaId,
      creationScene: preview.creationScene,
      config: cfg,
    });
    if (!keepHotspots) {
      setHotspotQuery("");
      setHotspotResults([]);
      setSearchError("");
    }
    onBriefChange((current) => {
      const next = applyPersonaChange(current, personaId, cfg);
      return keepHotspots
        ? next
        : { ...next, materials: next.materials.filter((item) => item.source === "手动输入") };
    });
  }

  function selectAudience(tag: string) {
    onBriefChange((current) => applyAudienceChange(current, tag, cfg));
  }

  function renderWeisecPersonaEntry(entry: PersonaUiEntry) {
    const recommendation = getPersonaUiRecommendation(entry, scene, audienceTag, businessLine);
    const recommendationLabel = getPersonaRecommendationLabel(recommendation);
    const selected = isPersonaUiSelected(brief, entry);
    return (
      <button
        key={entry.uiKey}
        type="button"
        onClick={() => selectPersona(entry.personaId)}
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-left transition-all",
          selected ? "border-primary bg-primary/10" : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-sm">{entry.label}</strong>
          {recommendationLabel ? (
            <Badge variant="outline" className="px-1 py-0 text-[9px]">
              {recommendationLabel}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{entry.description}</p>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Column
          index={1}
          title={cfg.hideOfferSelection ? "主推功能" : "选定 Offer"}
          hint={cfg.hideOfferSelection ? "选择本篇允许使用的产品能力" : "先选产品，再选主推功能"}
        >
          {!cfg.hideOfferSelection ? (
            <div className={cn("grid gap-1.5", cfg.offers.length === 1 ? "grid-cols-1" : "grid-cols-3")}>
              {cfg.offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  disabled={!offer.enabled}
                  onClick={() => selectOffer(offer.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-all",
                    !offer.enabled && "cursor-not-allowed opacity-40",
                    brief.offerId === offer.id
                      ? "border-primary bg-primary/10"
                      : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
                  )}
                >
                  <strong className="text-xs leading-tight">{offer.label}</strong>
                  {offer.badge ? (
                    <Badge variant={offer.enabled ? "secondary" : "outline"} className="px-1 py-0 text-[9px] leading-3">
                      {offer.enabled ? "主推" : "待开"}
                    </Badge>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {showFeatureSelection ? (
            <>
              <div className="flex items-center justify-between px-0.5 pt-0.5 text-xs text-muted-foreground">
                <span>{cfg.hideOfferSelection ? "可选功能" : "主推功能"}</span>
                <span>已选 {brief.selectedFeatureIds.length} 项 · 不限数量</span>
              </div>
              {offerFeatures.map((feature) => {
                const checked = brief.selectedFeatureIds.includes(feature.id);
                return (
                  <label
                    key={feature.id}
                    className={cn(
                      "flex gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                      checked ? "border-primary/50 bg-primary/5" : "border-border/70",
                      "cursor-pointer hover:bg-accent/20",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      checked={checked}
                      onChange={(event) =>
                        onBriefChange((current) =>
                          toggleFeature(current, feature.id, feature.name, event.target.checked, cfg),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <strong className="block text-xs font-medium leading-tight">{feature.name}</strong>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">
                        {cfg.featureUiSummaries[feature.id] || feature.summary}
                      </span>
                    </span>
                  </label>
                );
              })}
            </>
          ) : (
            <p className="px-1 py-8 text-center text-xs text-muted-foreground">请先选择 Offer</p>
          )}
        </Column>

        <Column index={2} title="创作场景" hint="确定内容的基本任务与结构方向">
          {cfg.creationScenes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectScene(item.id)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left transition-all",
                brief.creationScene === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
              )}
            >
              <strong className="text-sm">{item.label}</strong>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </Column>

        <Column index={3} title="创作人设" hint="确认写给谁，以及由谁来表达">
          <p className="px-0.5 text-xs font-medium text-muted-foreground">目标读者</p>
          <div className={cn("grid gap-1.5", cfg.audiences.length <= 2 ? "grid-cols-2" : "grid-cols-3")}>
            {cfg.audiences.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectAudience(item.id)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-center transition-all",
                  brief.audienceTag === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
                )}
              >
                <strong className="block text-xs">{item.label}</strong>
              </button>
            ))}
          </div>

          <p className="px-0.5 pt-1 text-xs font-medium text-muted-foreground">博主人设</p>
          {weisecPersonaGroups ? (
            weisecPersonaGroups.primary.map((entry) => renderWeisecPersonaEntry(entry))
          ) : (
            licaitongPersonas.map((persona) => {
              const recommendation = getPersonaRecommendation(persona.id, scene, audienceTag, cfg, businessLine);
              const recommendationLabel = getPersonaRecommendationLabel(recommendation);
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => selectPersona(persona.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left transition-all",
                    brief.personaId === persona.id
                      ? "border-primary bg-primary/10"
                      : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <strong className="text-sm">{persona.label}</strong>
                    {recommendationLabel ? (
                      <Badge variant="outline" className="px-1 py-0 text-[9px]">
                        {recommendationLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{persona.description}</p>
                </button>
              );
            })
          )}
        </Column>
      </div>

      <section className="rounded-xl border border-border/80 bg-card/40 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">创作主题与参考素材</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {showHotspotSearch
              ? "当前场景或人设需要市场热点；选中的热点和手动素材都会进入创意角度与正文 Prompt。"
              : "主题可留空由系统自动整理；手动素材会进入创意角度与正文 Prompt。选择市场热点场景或人设后，将显示热点搜索。"}
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">创作主题（选填）</label>
              <Input value={brief.topic} onChange={(event) => onBriefChange({ topic: event.target.value })} placeholder={contextualExamples.topic} />
            </div>
            {showHotspotSearch ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">热点搜索</label>
                  <div className="flex gap-2">
                    <Input value={hotspotQuery} onChange={(event) => setHotspotQuery(event.target.value)} placeholder={contextualExamples.hotspot} />
                    <Button type="button" variant="outline" onClick={() => void searchHotspots()} disabled={isSearching}>
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      搜索
                    </Button>
                  </div>
                  {searchError ? <p className="text-xs text-destructive">{searchError}</p> : null}
                </div>
                {hotspotResults.length ? (
                  <div className="space-y-2 rounded-lg border border-border/70 p-2">
                    {hotspotResults.map((item) => {
                      const selected = brief.materials.some((material) => material.id === item.id);
                      return (
                        <button key={item.id} type="button" onClick={() => toggleHotspot(item)} className={cn("w-full rounded-md border px-3 py-2 text-left text-xs", selected ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent/30")}>
                          <strong className="line-clamp-1">{item.title}</strong>
                          <span className="mt-1 block text-[11px] text-muted-foreground">{selected ? "已选用" : "点击选用"} · {item.source}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">手动补充素材（选填）</label>
              <Textarea rows={6} value={brief.materials.find((item) => item.source === "手动输入")?.body || ""} onChange={(event) => updateManualMaterial(event.target.value)} placeholder={contextualExamples.material} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">额外创作要求（选填）</label>
              <Textarea rows={3} value={brief.customRequirement || ""} onChange={(event) => onBriefChange({ customRequirement: event.target.value })} placeholder={contextualExamples.custom} />
            </div>
            {brief.materials.length ? <p className="text-xs text-primary">已选择 {brief.materials.length} 条参考素材</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card/40 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">产品出现方式</h3>
          <p className="mt-1 text-xs text-muted-foreground">这一项会同时约束创意角度和后续正文。</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {EMBED_LEVEL_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onBriefChange({ embedLevel: item.value })}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition-all",
                brief.embedLevel === item.value
                  ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                  : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
              )}
            >
              <strong className="text-sm">{item.label}</strong>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.hint}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
