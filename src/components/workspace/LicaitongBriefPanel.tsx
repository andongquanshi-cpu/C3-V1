"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  findStoredHotspotMaterial,
  getHotspotTabs,
  getSelectedMaterials,
  listSelectedHotspotMaterials,
  requiresHotspotMaterials,
  sceneRequiresHotspotMaterials,
  type HotspotTabId,
} from "@/lib/hotspot-workflow";
import { formatHotspotSourceLine, formatMaterialSource } from "@/lib/hotspot-display";
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
import {
  expandPersonasForBriefUI,
  getPersonaUiRecommendation,
  isPersonaUiSelected,
  type PersonaUiEntry,
} from "@/lib/weisec-persona-ui";
import { cn } from "@/lib/utils";
import type { BriefInput, BusinessLine, Material, ProductFeatureView } from "@/lib/types";
import { ChevronRight, Loader2, Search, Star, X } from "lucide-react";

interface BriefPanelProps {
  brief: BriefInput;
  materials: Material[];
  materialDraft: string;
  offerFeatures: ProductFeatureView[];
  workflowConfig?: BusinessLineWorkflowConfig;
  hotspotPanelOpen: boolean;
  activeHotspotTab: HotspotTabId;
  customHotspotQuery: string;
  hotspotCandidates: Material[];
  isSearchingHotspot: boolean;
  hotspotSearchError?: string | null;
  canContinue: boolean;
  topicExample?: string;
  onBriefChange: (patch: Partial<BriefInput> | ((current: BriefInput) => BriefInput)) => void;
  onMaterialDraftChange: (value: string) => void;
  onMaterialDraftCommit: () => void;
  onCustomHotspotQueryChange: (value: string) => void;
  onCustomHotspotSearch: () => void;
  onSearchHotspot: () => void;
  onHotspotTabChange: (tab: HotspotTabId) => void;
  onToggleCandidate: (candidate: Material, selected: boolean) => void;
  onSetPrimaryMaterial: (id: string) => void;
  onRemoveMaterial: (id: string) => void;
  onDeselectHotspot?: (material: Material) => void;
  onClearHotspotSelection?: () => void;
  onEditHotspotMaterials?: () => void;
  onCloseHotspotPanel?: () => void;
  onContinue: () => void;
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
    <div className="flex min-h-0 flex-col rounded-xl border border-border/80 bg-card/40">
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
    </div>
  );
}

function SelectedHotspotStrip({
  items,
  showPrimary,
  onRemove,
  onSetPrimary,
  onClearAll,
  compact,
}: {
  items: Material[];
  showPrimary?: boolean;
  onRemove: (item: Material) => void;
  onSetPrimary?: (id: string) => void;
  onClearAll?: () => void;
  compact?: boolean;
}) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-primary/25 bg-primary/5",
        compact ? "px-2 py-1.5" : "px-2.5 py-2",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-primary">已选 {items.length} 条</span>
        {onClearAll && items.length > 1 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            清空已选
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const pasted = item.source === "手动输入";
          return (
            <span
              key={item.id}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-tight",
                item.isPrimary
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-primary/20 bg-background/80",
              )}
            >
              {showPrimary && onSetPrimary ? (
                <button
                  type="button"
                  onClick={() => onSetPrimary(item.id)}
                  className="shrink-0 text-muted-foreground hover:text-amber-600"
                  aria-label={item.isPrimary ? "主素材" : "设为主素材"}
                  title={item.isPrimary ? "主素材" : "设为主素材"}
                >
                  <Star
                    className={cn(
                      "h-3 w-3",
                      item.isPrimary && "fill-amber-500 text-amber-500",
                    )}
                  />
                </button>
              ) : null}
              <span className="max-w-[200px] truncate" title={item.title}>
                {pasted ? "粘贴 · " : ""}
                {item.title}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="shrink-0 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="取消选用"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HotspotFeedItem({
  rank,
  material,
  selected,
  onToggle,
  showPrimary,
  isPrimary,
  onSetPrimary,
  onRemove,
  pasted,
}: {
  rank?: number;
  material: Material;
  selected: boolean;
  onToggle?: (selected: boolean) => void;
  showPrimary?: boolean;
  isPrimary?: boolean;
  onSetPrimary?: () => void;
  onRemove?: () => void;
  pasted?: boolean;
}) {
  const sourceLabel = pasted ? formatMaterialSource(material.source) : formatHotspotSourceLine(material);

  if (pasted) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-2 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug line-clamp-2">{material.title}</p>
            {onRemove ? (
              <button type="button" onClick={onRemove} className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="移除素材">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {material.body ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{material.body}</p>
          ) : null}
          <p className="mt-1.5 text-[10px] text-muted-foreground/75">来源 · 手动粘贴</p>
        </div>
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer gap-2.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/25",
        selected && "bg-primary/8 ring-1 ring-primary/25",
      )}
    >
      {typeof rank === "number" ? (
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
            rank <= 3 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {rank}
        </span>
      ) : null}
      <input
        type="checkbox"
        className="sr-only"
        checked={selected}
        onChange={(event) => onToggle?.(event.target.checked)}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{material.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {sourceLabel ? <span className="text-[10px] text-muted-foreground/75">来源 · {sourceLabel}</span> : null}
          {showPrimary && selected ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onSetPrimary?.();
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] transition-colors",
                isPrimary
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-border/70 text-muted-foreground hover:border-amber-500/30 hover:text-foreground",
              )}
            >
              <Star className={cn("h-3 w-3", isPrimary && "fill-current")} />
              {isPrimary ? "主素材" : "设为主素材"}
            </button>
          ) : null}
        </div>
      </div>
    </label>
  );
}

export function BriefPanel({
  brief,
  materials,
  materialDraft,
  offerFeatures,
  workflowConfig,
  hotspotPanelOpen,
  activeHotspotTab,
  customHotspotQuery,
  hotspotCandidates,
  isSearchingHotspot,
  hotspotSearchError,
  canContinue,
  topicExample,
  onBriefChange,
  onMaterialDraftChange,
  onMaterialDraftCommit,
  onCustomHotspotQueryChange,
  onCustomHotspotSearch,
  onSearchHotspot,
  onHotspotTabChange,
  onToggleCandidate,
  onSetPrimaryMaterial,
  onRemoveMaterial,
  onDeselectHotspot,
  onClearHotspotSelection,
  onEditHotspotMaterials,
  onCloseHotspotPanel,
  onContinue,
}: BriefPanelProps) {
  const businessLine: BusinessLine = brief.businessLine;
  const cfg = workflowConfig || getWorkflowFallback(businessLine);
  const scene = brief.creationScene;
  const audienceTag = brief.audienceTag;
  const licaitongPersonas = getPersonasForUI(scene, audienceTag, cfg, businessLine);
  const weisecPersonaGroups =
    businessLine === "weisec" ? expandPersonasForBriefUI(cfg.personas, scene, audienceTag, businessLine) : null;
  const featureNameById = Object.fromEntries(offerFeatures.map((item) => [item.id, item.name]));
  const showFeatureSelection = isFeatureSelectionActive(brief, cfg, businessLine);
  const hotspotTabs = getHotspotTabs(businessLine);
  const hotspotRequired = requiresHotspotMaterials({
    personaId: brief.personaId,
    creationScene: brief.creationScene,
    config: cfg,
  });
  const hotspotRequirementLabel = !hotspotRequired
    ? null
    : sceneRequiresHotspotMaterials(brief.creationScene, cfg)
      ? "市场热点解读需选热点"
      : brief.personaId === "hotspot_observer"
        ? "市场观察员需选热点"
        : "需至少 1 条热点素材";
  const selectedMaterials = getSelectedMaterials(materials);
  const selectedHotspotMaterials = listSelectedHotspotMaterials(materials);
  const pastedMaterials = selectedMaterials.filter((item) => item.source === "手动输入");
  const allSelectedForStrip = [...pastedMaterials, ...selectedHotspotMaterials];
  const candidateSelectedIds = new Set(
    hotspotCandidates
      .filter((item) => {
        const stored = findStoredHotspotMaterial(materials, item);
        return stored && stored.selected !== false;
      })
      .map((item) => item.id),
  );

  function selectOffer(offerId: string) {
    const offer = cfg.offers.find((item) => item.id === offerId);
    if (!offer?.enabled || brief.offerId === offerId) return;
    onBriefChange((current) => applyOfferChange(current, offerId, featureNameById, cfg));
  }

  function selectScene(nextScene: string) {
    onBriefChange((current) => applySceneChange(current, nextScene, featureNameById, cfg));
  }

  function selectPersona(personaId: string) {
    onBriefChange((current) => applyPersonaChange(current, personaId, cfg));
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

  function handlePasteKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      onMaterialDraftCommit();
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Column
          index={1}
          title={cfg.hideOfferSelection ? "主推功能" : "选定 Offer"}
          hint={cfg.hideOfferSelection ? "本篇重点介绍的能力，可多选" : "主推产品 + 功能卖点"}
        >
          {!cfg.hideOfferSelection ? (
            <div className="grid grid-cols-3 gap-1.5">
              {cfg.offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  disabled={!offer.enabled}
                  title={!offer.enabled ? offer.description : undefined}
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
              {!cfg.hideOfferSelection ? (
                <div className="flex items-center justify-between px-0.5 pt-0.5">
                  <span className="text-xs font-medium text-muted-foreground">主推功能</span>
                  <span className="text-[10px] text-muted-foreground">已选 {brief.selectedFeatureIds.length}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-0.5 pb-0.5">
                  <span className="text-[10px] text-muted-foreground">已选</span>
                  <span className="text-[10px] text-muted-foreground">{brief.selectedFeatureIds.length}</span>
                </div>
              )}
              {offerFeatures.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  {cfg.hideOfferSelection ? "加载功能列表中…" : "请先选择 Offer"}
                </p>
              ) : (
                offerFeatures.map((feature) => {
                const checked = brief.selectedFeatureIds.includes(feature.id);
                return (
                  <label
                    key={feature.id}
                    className={cn(
                      "flex gap-2 rounded-lg border px-2.5 py-2 transition-colors cursor-pointer hover:bg-accent/20",
                      checked ? "border-primary/50 bg-primary/5" : "border-border/70",
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
                })
              )}
            </>
          ) : !cfg.hideOfferSelection ? (
            <p className="px-1 py-8 text-center text-xs text-muted-foreground">请先选择 Offer，再勾选主推功能</p>
          ) : null}
        </Column>

        <Column index={2} title="创作场景" hint="这篇笔记怎么写">
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

        <Column index={3} title="创作人设" hint="写给谁 + 谁在说，可自由组合">
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

      <div className="rounded-xl border border-border/80 bg-card/30 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">主题</Label>
            <Textarea
              value={brief.topic}
              onChange={(event) => onBriefChange({ topic: event.target.value })}
              placeholder={`这篇笔记讲什么事？例如：${topicExample || "发工资后我会先看这三项"}`}
              className="min-h-[72px] resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Label className="shrink-0 text-xs">
                  {hotspotRequired ? "热点素材（必选）" : "背景补充（选填）"}
                </Label>
                {hotspotRequired && hotspotRequirementLabel ? (
                  <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[9px] text-amber-600 dark:text-amber-400">
                    {hotspotRequirementLabel}
                  </Badge>
                ) : null}
              </div>
              {hotspotRequired ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onSearchHotspot}
                  disabled={isSearchingHotspot}
                  className="h-7 shrink-0 px-2.5 text-xs"
                >
                  {isSearchingHotspot ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  搜索热榜
                </Button>
              ) : null}
            </div>

            <Textarea
              value={materialDraft}
              onChange={(event) => onMaterialDraftChange(event.target.value)}
              onBlur={onMaterialDraftCommit}
              onKeyDown={handlePasteKeyDown}
              placeholder={
                hotspotRequired
                  ? "粘贴新闻摘要或用户洞察"
                  : "可粘贴用户洞察、竞品信息等背景（非新闻主线，角度将围绕场景+主题展开）"
              }
              className="min-h-[72px] resize-none text-sm"
            />

            {hotspotRequired && hotspotPanelOpen ? (
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {hotspotTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onHotspotTabChange(tab.id)}
                        disabled={isSearchingHotspot}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          activeHotspotTab === tab.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {onEditHotspotMaterials && selectedMaterials.length > 0 && !hotspotPanelOpen ? (
                      <button
                        type="button"
                        onClick={onEditHotspotMaterials}
                        className="text-[10px] text-primary underline-offset-2 hover:underline"
                      >
                        修改
                      </button>
                    ) : null}
                    {onCloseHotspotPanel ? (
                      <button
                        type="button"
                        onClick={onCloseHotspotPanel}
                        className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        收起
                      </button>
                    ) : null}
                  </div>
                </div>

                {allSelectedForStrip.length > 0 ? (
                  <SelectedHotspotStrip
                    items={allSelectedForStrip}
                    showPrimary={hotspotRequired && allSelectedForStrip.length > 1}
                    onRemove={(item) => onDeselectHotspot?.(item) ?? onRemoveMaterial(item.id)}
                    onSetPrimary={onSetPrimaryMaterial}
                    onClearAll={onClearHotspotSelection}
                  />
                ) : null}

                {activeHotspotTab === "custom" ? (
                  <div className="flex gap-2">
                    <Input
                      value={customHotspotQuery}
                      onChange={(event) => onCustomHotspotQueryChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onCustomHotspotSearch();
                      }}
                      placeholder={brief.topic.trim() ? `优先结合主题「${brief.topic.trim().slice(0, 24)}」搜索` : "输入问句，如：央行降准对A股影响"}
                      className="h-8 flex-1 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={onCustomHotspotSearch}
                      disabled={isSearchingHotspot || !customHotspotQuery.trim()}
                      className="h-8 shrink-0 gap-1 px-3 text-xs"
                    >
                      {isSearchingHotspot ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Search className="h-3.5 w-3.5" />
                      )}
                      查询
                    </Button>
                  </div>
                ) : null}

                {isSearchingHotspot ? (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : hotspotCandidates.length === 0 ? (
                  <div className="space-y-2 py-4 text-center text-xs">
                    {hotspotSearchError ? (
                      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-left leading-5 text-destructive">
                        {hotspotSearchError}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground">
                      暂无结果。请确认已在妙想平台领取「资讯搜索」Skill 的 API Key，写入 .env 后重启 dev。
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-md bg-card/40">
                    <p className="border-b border-border/50 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                      {hotspotTabs.find((tab) => tab.id === activeHotspotTab)?.label || "热榜"} · 按热度排序
                    </p>
                    <div className="max-h-[280px] divide-y divide-border/50 overflow-y-auto">
                    {hotspotCandidates.map((candidate, index) => {
                      const stored = findStoredHotspotMaterial(materials, candidate);
                      const selected = candidateSelectedIds.has(candidate.id);
                      return (
                        <HotspotFeedItem
                          key={candidate.id}
                          rank={index + 1}
                          material={stored || candidate}
                          selected={selected}
                          onToggle={(next) => onToggleCandidate(candidate, next)}
                          showPrimary={hotspotRequired && selectedMaterials.length > 1}
                          isPrimary={stored?.isPrimary}
                          onSetPrimary={() => onSetPrimaryMaterial(stored?.id || candidate.id)}
                        />
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            ) : !hotspotRequired && pastedMaterials.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs font-medium text-foreground/90">已添加背景 · {pastedMaterials.length} 条</span>
                <SelectedHotspotStrip
                  items={pastedMaterials}
                  compact
                  onRemove={(item) => onDeselectHotspot?.(item) ?? onRemoveMaterial(item.id)}
                  onClearAll={onClearHotspotSelection}
                />
              </div>
            ) : hotspotRequired && allSelectedForStrip.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground/90">已选热点</span>
                  {onEditHotspotMaterials ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onEditHotspotMaterials}
                      className="h-7 px-2 text-xs text-primary hover:text-primary"
                    >
                      继续添加
                    </Button>
                  ) : null}
                </div>
                <SelectedHotspotStrip
                  items={allSelectedForStrip}
                  showPrimary={hotspotRequired && allSelectedForStrip.length > 1}
                  compact
                  onRemove={(item) => onDeselectHotspot?.(item) ?? onRemoveMaterial(item.id)}
                  onSetPrimary={onSetPrimaryMaterial}
                  onClearAll={onClearHotspotSelection}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={onContinue} disabled={!canContinue} className="min-w-[180px]">
          下一步
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function LicaitongBriefPanel(props: BriefPanelProps) {
  return <BriefPanel {...props} />;
}
