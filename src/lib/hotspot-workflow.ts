import type { Material } from "@/lib/types";
import { buildHotspotSearchQuery as buildHotspotSearchQueryFromDisplay } from "@/lib/hotspot-display";

export type HotspotTabId = "finance" | "policy" | "fund" | "custom";

export const HOTSPOT_TABS: Array<{ id: HotspotTabId; label: string }> = [
  { id: "finance", label: "今日财经" },
  { id: "policy", label: "政策监管" },
  { id: "fund", label: "基金固收" },
  { id: "custom", label: "自定义" },
];

export function buildHotspotSearchQuery(tab: HotspotTabId, topic: string, customQuery?: string) {
  return buildHotspotSearchQueryFromDisplay(tab, topic, customQuery);
}

export function requiresHotspotMaterials(personaId?: string) {
  return personaId === "hotspot_observer";
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

export function canProceedFromBrief(personaId: string | undefined, materials: Material[]) {
  if (requiresHotspotMaterials(personaId)) {
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
