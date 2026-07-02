import type { Material, BusinessLine } from "@/lib/types";
import type { BusinessLineWorkflowConfig } from "@/lib/business-line-workflow";
import { buildHotspotSearchQuery as buildHotspotSearchQueryFromDisplay } from "@/lib/hotspot-display";

export type HotspotTabId = "finance" | "policy" | "fund" | "equity" | "custom";

export const LICAITONG_HOTSPOT_TABS: Array<{ id: HotspotTabId; label: string }> = [
  { id: "finance", label: "今日财经" },
  { id: "policy", label: "政策监管" },
  { id: "fund", label: "基金固收" },
  { id: "custom", label: "自定义" },
];

export const WEISEC_HOTSPOT_TABS: Array<{ id: HotspotTabId; label: string }> = [
  { id: "finance", label: "今日财经" },
  { id: "policy", label: "政策监管" },
  { id: "equity", label: "股市热点" },
  { id: "custom", label: "自定义" },
];

/** @deprecated 请用 getHotspotTabs(businessLine) */
export const HOTSPOT_TABS = LICAITONG_HOTSPOT_TABS;

export function getHotspotTabs(businessLine: BusinessLine) {
  return businessLine === "weisec" ? WEISEC_HOTSPOT_TABS : LICAITONG_HOTSPOT_TABS;
}

export function normalizeHotspotTabForLine(tab: HotspotTabId, businessLine: BusinessLine): HotspotTabId {
  if (businessLine === "weisec" && tab === "fund") return "equity";
  if (businessLine === "licaitong" && tab === "equity") return "fund";
  return tab;
}

export function isHotspotTabValidForLine(tab: HotspotTabId, businessLine: BusinessLine) {
  return getHotspotTabs(businessLine).some((item) => item.id === tab);
}

export const HOTSPOT_REQUIRED_SCENE_IDS = new Set(["market-hotspot"]);

export function buildHotspotSearchQuery(tab: HotspotTabId, topic: string, customQuery?: string, businessLine?: BusinessLine) {
  return buildHotspotSearchQueryFromDisplay(tab, topic, customQuery, businessLine);
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
  personaId: string | undefined,
  materials: Material[],
  creationScene?: string,
  config?: BusinessLineWorkflowConfig,
) {
  if (requiresHotspotMaterials({ personaId, creationScene, config })) {
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
