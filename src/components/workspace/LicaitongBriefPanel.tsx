"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FPLUS_FEATURE_LIMIT,
  LICAITONG_AUDIENCES,
  LICAITONG_CREATION_SCENES,
  LICAITONG_OFFERS,
  applyLicaitongAudienceChange,
  applyLicaitongOfferChange,
  applyLicaitongPersonaChange,
  applyLicaitongSceneChange,
  getPersonasForLicaitongUI,
  getPersonaRecommendation,
  getPersonaRecommendationLabel,
  toggleLicaitongFeature,
  FPLUS_FEATURE_UI_SUMMARIES,
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
import { ChevronRight } from "lucide-react";

interface LicaitongBriefPanelProps {
  brief: BriefInput;
  materials: Material[];
  materialDraft: string;
  offerFeatures: ProductFeatureView[];
  isBusy: boolean;
  onBriefChange: (patch: Partial<BriefInput> | ((current: BriefInput) => BriefInput)) => void;
  onMaterialDraftChange: (value: string) => void;
  onAddMaterial: () => void;
  onSearchHotspot: () => void;
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

export function LicaitongBriefPanel({
  brief,
  materials,
  materialDraft,
  offerFeatures,
  isBusy,
  onBriefChange,
  onMaterialDraftChange,
  onAddMaterial,
  onSearchHotspot,
  onContinue,
}: LicaitongBriefPanelProps) {
  const scene = brief.creationScene || "pain-story";
  const audienceTag = brief.audienceTag || "white-collar";
  const personas = getPersonasForLicaitongUI(scene, audienceTag);
  const featureNameById = Object.fromEntries(offerFeatures.map((item) => [item.id, item.name]));
  const atFeatureLimit = brief.selectedFeatureIds.length >= FPLUS_FEATURE_LIMIT;

  function selectOffer(offerId: LicaitongOfferId) {
    const offer = LICAITONG_OFFERS.find((item) => item.id === offerId);
    if (!offer?.enabled || brief.offerId === offerId) return;
    onBriefChange((current) => applyLicaitongOfferChange(current, offerId, featureNameById));
  }

  function selectScene(nextScene: LicaitongCreationScene) {
    onBriefChange((current) => applyLicaitongSceneChange(current, nextScene, featureNameById));
  }

  function selectAudience(tag: LicaitongAudienceTag) {
    onBriefChange((current) => applyLicaitongAudienceChange(current, tag));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        {/* 左：Offer + 主推功能 */}
        <Column index={1} title="选定 Offer" hint="主推产品 + 功能卖点">
          <div className="grid grid-cols-3 gap-1.5">
            {LICAITONG_OFFERS.map((offer) => (
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
                  {brief.selectedFeatureIds.length}/{FPLUS_FEATURE_LIMIT}
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
                          toggleLicaitongFeature(current, feature.id, feature.name, event.target.checked),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <strong className="block text-xs font-medium leading-tight">{feature.name}</strong>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">
                        {FPLUS_FEATURE_UI_SUMMARIES[feature.id] || feature.summary}
                      </span>
                    </span>
                  </label>
                );
              })}
            </>
          ) : null}
        </Column>

        {/* 中：创作场景 */}
        <Column index={2} title="创作场景" hint="这篇笔记怎么写">
          {LICAITONG_CREATION_SCENES.map((item) => (
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

        {/* 右：目标读者 + 博主人设 */}
        <Column index={3} title="创作人设" hint="写给谁 + 谁在说，可自由组合">
          <p className="px-0.5 text-xs font-medium text-muted-foreground">目标读者</p>
          <div className="grid grid-cols-3 gap-1.5">
            {LICAITONG_AUDIENCES.map((item) => (
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
            const recommendation = getPersonaRecommendation(persona.id, scene, audienceTag);
            const recommendationLabel = getPersonaRecommendationLabel(recommendation);
            return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onBriefChange((current) => applyLicaitongPersonaChange(current, persona.id))}
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
                  <Badge variant="outline" className="px-1 py-0 text-[9px]">{recommendationLabel}</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{persona.description}</p>
            </button>
            );
          })}
        </Column>
      </div>

      {/* 主题 + 素材：三列下方通栏 */}
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
            <Label className="text-xs">素材 / 热点（选填）</Label>
            <Textarea
              value={materialDraft}
              onChange={(event) => onMaterialDraftChange(event.target.value)}
              placeholder="粘贴新闻、用户洞察…"
              className="min-h-[72px] resize-none text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onAddMaterial}>
                加入素材
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={onSearchHotspot} disabled={isBusy}>
                搜索热点
              </Button>
            </div>
            {materials.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {materials.map((item) => (
                  <Badge key={item.id} variant="outline" className="text-[10px]">
                    {item.title}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={onContinue} className="min-w-[180px]">
          下一步
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
