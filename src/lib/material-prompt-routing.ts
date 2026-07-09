import { requiresHotspotMaterials, getSelectedMaterials } from "@/lib/hotspot-workflow";
import type { BusinessLineWorkflowConfig } from "@/lib/business-line-workflow";
import type { BriefInput, Material } from "@/lib/types";

/** 当前 Brief 是否处于「热点解读」模式（场景或人设要求绑定市场热点） */
export function isHotspotLinkedBrief(
  brief: Pick<BriefInput, "personaId" | "creationScene">,
  config?: BusinessLineWorkflowConfig,
) {
  return requiresHotspotMaterials({
    personaId: brief.personaId,
    creationScene: brief.creationScene,
    config,
  });
}

export function isHotspotSearchMaterial(material: Pick<Material, "source">) {
  return material.source !== "手动输入";
}

/** 角度/正文生成时实际送入 Prompt 的素材 */
export function filterMaterialsForPrompt(materials: Material[], hotspotLinked: boolean): Material[] {
  const selected = getSelectedMaterials(materials);
  if (hotspotLinked) return selected;
  return selected.filter((item) => !isHotspotSearchMaterial(item));
}

/** 切换至非热点场景/人设时，移除搜索来的热点素材，保留手动背景补充 */
export function stripHotspotSearchMaterials(materials: Material[]): Material[] {
  return materials.filter((item) => !isHotspotSearchMaterial(item));
}
