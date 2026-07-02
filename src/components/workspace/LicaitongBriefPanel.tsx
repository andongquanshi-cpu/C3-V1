"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HOTSPOT_TABS,
  getSelectedMaterials,
  requiresHotspotMaterials,
  type HotspotTabId,
} from "@/lib/hotspot-workflow";
import { formatMaterialSource } from "@/lib/hotspot-display";
import {
  applyLicaitongAudienceChange,
  applyLicaitongOfferChange,
  applyLicaitongPersonaChange,
  applyLicaitongSceneChange,
  FALLBACK_LICAITONG_WORKFLOW,
  getPersonaRecommendation,
  getPersonaRecommendationLabel,
  getPersonasForLicaitongUI,
  toggleLicaitongFeature,
  type LicaitongWorkflowConfig,
} from "@/lib/licaitong-workflow";
import { cn } from "@/lib/utils";
import type {
  BriefInput,
  LicaitongAudienceTag,
  LicaitongCreationScene,
  LicaitongOfferId,
  Material,
  ProductFeatureView,
} from "@/lib/types";
import { ChevronRight, Loader2, Search, Star, X } from "lucide-react";

interface LicaitongBriefPanelProps {
  brief: BriefInput;
  materials: Material[];
  materialDraft: string;
  offerFeatures: ProductFeatureView[];
  workflowConfig?: LicaitongWorkflowConfig;
  hotspotPanelOpen: boolean;
  activeHotspotTab: HotspotTabId;
  customHotspotQuery: string;
  hotspotCandidates: Material[];
  isSearchingHotspot: boolean;
  canContinue: boolean;
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
  const sourceLabel = formatMaterialSource(material.source);

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
        {material.body ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{material.body}</p>
        ) : null}
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

export function LicaitongBriefPanel({
  brief,
  materials,
  materialDraft,
  offerFeatures,
  workflowConfig = FALLBACK_LICAITONG_WORKFLOW,
  hotspotPanelOpen,
  activeHotspotTab,
  customHotspotQuery,
  hotspotCandidates,
  isSearchingHotspot,
  canContinue,
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
  onContinue,
}: LicaitongBriefPanelProps) {
  const scene = brief.creationScene || workflowConfig.defaultBrief.creationScene;
  const audienceTag = brief.audienceTag || workflowConfig.defaultBrief.audienceTag;
  const personas = getPersonasForLicaitongUI(scene, audienceTag, workflowConfig);
  const featureNameById = Object.fromEntries(offerFeatures.map((item) => [item.id, item.name]));
  const atFeatureLimit = brief.selectedFeatureIds.length >= workflowConfig.fplusFeatureLimit;
  const hotspotRequired = requiresHotspotMaterials(brief.personaId);
  const selectedMaterials = getSelectedMaterials(materials);
  const pastedMaterials = selectedMaterials.filter((item) => item.source === "手动输入");
  const candidateSelectedIds = new Set(
    hotspotCandidates.filter((item) => materials.some((m) => m.id === item.id && m.selected !== false)).map((item) => item.id),
  );

  function selectOffer(offerId: LicaitongOfferId) {
    const offer = workflowConfig.offers.find((item) => item.id === offerId);
    if (!offer?.enabled || brief.offerId === offerId) return;
    onBriefChange((current) => applyLicaitongOfferChange(current, offerId, featureNameById, workflowConfig));
  }

  function selectScene(nextScene: LicaitongCreationScene) {
    onBriefChange((current) => applyLicaitongSceneChange(current, nextScene, featureNameById, workflowConfig));
  }

  function selectAudience(tag: LicaitongAudienceTag) {
    onBriefChange((current) => applyLicaitongAudienceChange(current, tag, workflowConfig));
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
        <Column index={1} title="选定 Offer" hint="主推产品 + 功能卖点">
          <div className="grid grid-cols-3 gap-1.5">
            {workflowConfig.offers.map((offer) => (
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

          {brief.offerId === "fixed-income-plus" ? (
            <>
              <div className="flex items-center justify-between px-0.5 pt-0.5">
                <span className="text-xs font-medium text-muted-foreground">主推功能</span>
                <span className="text-[10px] text-muted-foreground">
                  {brief.selectedFeatureIds.length}/{workflowConfig.fplusFeatureLimit}
                </span>
              </div>
              {offerFeatures.map((feature) => {
                const checked = brief.selectedFeatureIds.includes(feature.id);
                const disabled = !checked && atFeatureLimit;
                return (
                  <label
                    key={feature.id}
                    className={cn(
                      "flex gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                      checked ? "border-primary/50 bg-primary/5" : "border-border/70",
                      disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-accent/20",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) =>
                        onBriefChange((current) =>
                          toggleLicaitongFeature(current, feature.id, feature.name, event.target.checked, workflowConfig),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <strong className="block text-xs font-medium leading-tight">{feature.name}</strong>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">
                        {workflowConfig.fplusFeatureUiSummaries[feature.id] || feature.summary}
                      </span>
                    </span>
                  </label>
                );
              })}
            </>
          ) : null}
        </Column>

        <Column index={2} title="创作场景" hint="这篇笔记怎么写">
          {workflowConfig.creationScenes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectScene(item.id)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left transition-all",
                scene === item.id
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
          <div className="grid grid-cols-3 gap-1.5">
            {workflowConfig.audiences.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectAudience(item.id)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-center transition-all",
                  audienceTag === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border/80 hover:border-primary/30 hover:bg-accent/20",
                )}
              >
                <strong className="block text-xs">{item.label}</strong>
              </button>
            ))}
          </div>

          <p className="px-0.5 pt-1 text-xs font-medium text-muted-foreground">博主人设</p>
          {personas.map((persona) => {
            const recommendation = getPersonaRecommendation(persona.id, scene, audienceTag, workflowConfig);
            const recommendationLabel = getPersonaRecommendationLabel(recommendation);
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => onBriefChange((current) => applyLicaitongPersonaChange(current, persona.id, workflowConfig))}
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
          })}
        </Column>
      </div>

      <div className="rounded-xl border border-border/80 bg-card/30 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">主题</Label>
            <Textarea
              value={brief.topic}
              onChange={(event) => onBriefChange({ topic: event.target.value })}
              placeholder="这篇笔记讲什么事？例如：发工资后我会先看这三项"
              className="min-h-[72px] resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Label className="shrink-0 text-xs">
                  {hotspotRequired ? "热点素材（必选）" : "素材 / 热点（选填）"}
                </Label>
                {hotspotRequired ? (
                  <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[9px] text-amber-600 dark:text-amber-400">
                    市场观察员需选热点
                  </Badge>
                ) : null}
              </div>
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
                搜索热点
              </Button>
            </div>

            <Textarea
              value={materialDraft}
              onChange={(event) => onMaterialDraftChange(event.target.value)}
              onBlur={onMaterialDraftCommit}
              onKeyDown={handlePasteKeyDown}
              placeholder="粘贴新闻摘要或用户洞察"
              className="min-h-[72px] resize-none text-sm"
            />

            {hotspotPanelOpen ? (
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {HOTSPOT_TABS.map((tab) => (
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
                  {selectedMaterials.length > 0 ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">已选 {selectedMaterials.length}</span>
                  ) : null}
                </div>

                {pastedMaterials.length > 0 ? (
                  <div className="space-y-1">
                    {pastedMaterials.map((item) => (
                      <HotspotFeedItem
                        key={item.id}
                        material={item}
                        selected
                        pasted
                        onRemove={() => onRemoveMaterial(item.id)}
                      />
                    ))}
                  </div>
                ) : null}

                {activeHotspotTab === "custom" ? (
                  <div className="flex gap-2">
                    <Input
                      value={customHotspotQuery}
                      onChange={(event) => onCustomHotspotQueryChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onCustomHotspotSearch();
                      }}
                      placeholder="输入搜索词，如：央行降准、A股"
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
                  <p className="py-4 text-center text-xs text-muted-foreground">暂无结果</p>
                ) : (
                  <div className="max-h-[280px] divide-y divide-border/50 overflow-y-auto rounded-md bg-card/40">
                    {hotspotCandidates.map((candidate, index) => {
                      const selected = candidateSelectedIds.has(candidate.id);
                      const stored = materials.find((item) => item.id === candidate.id);
                      return (
                        <HotspotFeedItem
                          key={candidate.id}
                          rank={index + 1}
                          material={stored || candidate}
                          selected={selected}
                          onToggle={(next) => onToggleCandidate(candidate, next)}
                          showPrimary={hotspotRequired && selectedMaterials.length > 1}
                          isPrimary={stored?.isPrimary}
                          onSetPrimary={() => onSetPrimaryMaterial(candidate.id)}
                        />
                      );
                    })}
                  </div>
                )}
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
