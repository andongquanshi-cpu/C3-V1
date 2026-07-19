import type { BriefInput, Material, BusinessLine } from "@/lib/types";
import { buildEastMoneySearchQueries } from "@/lib/eastmoney-hotspot";
import { buildHotspotMaterialId, isSameHotspotMaterial } from "@/lib/hotspot-display";
import {
  getWorkflowFallback,
  isFeatureSelectionActive,
  type BusinessLineWorkflowConfig,
} from "@/lib/business-line-workflow";

export type HotspotTabId = "trending" | "tech" | "policy" | "sector" | "fund" | "custom";

export const LICAITONG_HOTSPOT_TABS: Array<{ id: HotspotTabId; label: string }> = [
  { id: "trending", label: "财经热搜" },
  { id: "tech", label: "科技热榜" },
  { id: "fund", label: "基金热榜" },
  { id: "custom", label: "自定义" },
];

export const WEISEC_HOTSPOT_TABS: Array<{ id: HotspotTabId; label: string }> = [
  { id: "trending", label: "财经热搜" },
  { id: "tech", label: "科技热榜" },
  { id: "sector", label: "板块热榜" },
  { id: "custom", label: "自定义" },
];

/** @deprecated 请用 getHotspotTabs(businessLine) */
export const HOTSPOT_TABS = LICAITONG_HOTSPOT_TABS;

export function getHotspotTabs(businessLine: BusinessLine) {
  return businessLine === "weisec" ? WEISEC_HOTSPOT_TABS : LICAITONG_HOTSPOT_TABS;
}

const LEGACY_TAB_MAP: Record<string, HotspotTabId> = {
  finance: "trending",
  equity: "sector",
  policy: "trending",
};

export function normalizeHotspotTabForLine(tab: string, businessLine: BusinessLine): HotspotTabId {
  const mapped = LEGACY_TAB_MAP[tab] || tab;
  const tabs = getHotspotTabs(businessLine);
  if (tabs.some((item) => item.id === mapped)) return mapped as HotspotTabId;
  if (businessLine === "weisec" && mapped === "fund") return "sector";
  if (businessLine === "licaitong" && mapped === "sector") return "fund";
  return "trending";
}

export function isHotspotTabValidForLine(tab: HotspotTabId, businessLine: BusinessLine) {
  return getHotspotTabs(businessLine).some((item) => item.id === tab);
}

export const HOTSPOT_REQUIRED_SCENE_IDS = new Set(["market-hotspot"]);

export function buildHotspotSearchQueries(
  tab: HotspotTabId,
  topic: string,
  customQuery?: string,
  businessLine?: BusinessLine,
) {
  return buildEastMoneySearchQueries(tab, topic, customQuery, businessLine);
}

/** 单条 query 兼容旧调用 */
export function buildHotspotSearchQuery(tab: HotspotTabId, topic: string, customQuery?: string, businessLine?: BusinessLine) {
  return buildHotspotSearchQueries(tab, topic, customQuery, businessLine)[0] || "今日财经热点";
}

export function sceneRequiresHotspotMaterials(
  creationScene: string | undefined,
  config?: BusinessLineWorkflowConfig,
): boolean {
  if (!creationScene) return false;
  const hit = config?.creationScenes.find((item) => item.id === creationScene);
  if (hit?.requiresHotspotMaterials) return true;
  return HOTSPOT_REQUIRED_SCENE_IDS.has(creationScene);
}

export function requiresHotspotMaterials(options?: {
  personaId?: string;
  creationScene?: string;
  config?: BusinessLineWorkflowConfig;
}): boolean {
  if (options?.personaId === "hotspot_observer") return true;
  return sceneRequiresHotspotMaterials(options?.creationScene, options?.config);
}

export function hotspotMaterialsRequirementHint(options?: {
  personaId?: string;
  creationScene?: string;
  config?: BusinessLineWorkflowConfig;
}): string | null {
  if (!requiresHotspotMaterials(options)) return null;
  if (sceneRequiresHotspotMaterials(options?.creationScene, options?.config)) {
    return "市场热点解读需选热点";
  }
  if (options?.personaId === "hotspot_observer") {
    return "市场观察员需选热点";
  }
  return "需至少 1 条热点素材";
}

/** 热点搜索区话题指引（只引导搜索词，不预选素材） */
export function getHotspotTopicGuides(
  businessLine: BusinessLine,
  options?: { personaId?: string; creationScene?: string; offerLabel?: string },
): string[] {
  if (businessLine === "weisec") {
    return ["A股异动", "板块轮动", "财报季", "监管动态", "半导体", "开户入门"];
  }
  const offer = options?.offerLabel?.trim();
  return [
    "降息",
    "宏观政策",
    offer || "固收+",
    "资产配置",
    "基金热度",
    "银行理财",
  ];
}

/** 短词指引转成更适合东财语义搜索的 query；输入框仍显示短词 */
export function buildHotspotGuideSearchQuery(guide: string): string {
  const topic = guide.trim();
  if (!topic) return "";
  if (/最新|新闻|动态|解读|事件/.test(topic)) return topic;
  return `${topic} 最新相关新闻`;
}

/** 默认视为已选（兼容旧数据）；仅显式 selected: false 才排除 */
export function isMaterialSelected(material: Material) {
  return material.selected !== false;
}

export function getSelectedMaterials(materials: Material[]) {
  return materials.filter(isMaterialSelected);
}

export function getPrimaryMaterial(materials: Material[]) {
  return getSelectedMaterials(materials).find((item) => item.isPrimary);
}

export function canProceedFromBrief(
  brief: Pick<
    BriefInput,
    "businessLine" | "offerId" | "creationScene" | "audienceTag" | "personaId" | "selectedFeatureIds"
  >,
  materials: Material[],
  config?: BusinessLineWorkflowConfig,
) {
  const businessLine = brief.businessLine;
  const cfg = config || getWorkflowFallback(businessLine);

  if (!cfg.hideOfferSelection && !brief.offerId) return false;
  if (!brief.creationScene) return false;
  if (!brief.audienceTag) return false;
  if (!brief.personaId) return false;
  if (isFeatureSelectionActive(brief, cfg, businessLine) && brief.selectedFeatureIds.length < 1) {
    return false;
  }
  if (requiresHotspotMaterials({ personaId: brief.personaId, creationScene: brief.creationScene, config: cfg })) {
    return getSelectedMaterials(materials).length >= 1;
  }
  return true;
}

export function normalizeMaterialSelection(material: Material): Material {
  return {
    ...material,
    selected: material.selected !== false,
  };
}

export function findStoredHotspotMaterial(materials: Material[], candidate: Pick<Material, "id" | "source" | "title">) {
  return materials.find((item) => isSameHotspotMaterial(item, candidate));
}

/** 搜索候选与已选库合并：保留 id、勾选态、主素材标记 */
export function mergeHotspotSearchCandidates(
  rawResults: Array<Pick<Material, "title" | "body" | "source" | "tags">>,
  materials: Material[],
): Material[] {
  return rawResults
    .map((item) => {
      const id = buildHotspotMaterialId(item.source, item.title);
      const candidate: Material = {
        id,
        title: item.title,
        body: item.body,
        source: item.source,
        tags: item.tags?.length ? item.tags : ["热点"],
        selected: false,
        createdAt: new Date().toISOString(),
      };
      const stored = findStoredHotspotMaterial(materials, candidate);
      if (!stored) return candidate;
      return {
        ...candidate,
        id: stored.id,
        body: candidate.body?.trim() || stored.body || "",
        selected: stored.selected !== false,
        isPrimary: stored.isPrimary,
        createdAt: stored.createdAt,
      };
    })
    .filter((item) => item.title);
}

export function listSelectedHotspotMaterials(materials: Material[]) {
  return getSelectedMaterials(materials).filter((item) => item.source !== "手动输入");
}
