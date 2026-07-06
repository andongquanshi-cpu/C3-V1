import type { BriefInput, BusinessLine } from "@/lib/types";

type PersonaRecommendation = "both" | "scene" | "audience" | null;

/** 微证券：每个创作场景的主推荐人设 */
export const WEISEC_PRIMARY_PERSONA_BY_SCENE: Record<string, string> = {
  "newcomer-guide": "concept_teacher",
  "tool-review": "sober_guard",
  "life-story-seed": "peer_diary",
  "market-hotspot": "hotspot_observer",
};

/** 微证券前端不展示的人设（仍可在 KB 保留） */
export const WEISEC_HIDDEN_PERSONA_IDS = new Set(["family_planner"]);

const WEISEC_LEGACY_AUDIENCE_IDS: Record<string, string> = {
  ws_audience_001: "student",
  ws_audience_002: "white-collar",
  ws_audience_003: "white-collar",
};

function normalizeWeisecAudience(tag: string | undefined): string | undefined {
  if (!tag) return tag;
  return WEISEC_LEGACY_AUDIENCE_IDS[tag] || tag;
}

export interface PersonaUiEntry {
  uiKey: string;
  personaId: string;
  label: string;
  description: string;
  requiresHotspotMaterials?: boolean;
  audienceTags: string[];
  suitableScenes: string[];
}

export interface PersonaSource {
  id: string;
  label: string;
  description: string;
  variant?: string;
  audienceTags: string[];
  suitableScenes: string[];
  requiresHotspotMaterials?: boolean;
}

const WEISEC_PERSONA_COPY: Record<string, { label: string; description: string }> = {
  peer_diary: {
    label: "同龄人日记",
    description: "第一人称真实记录：轻量体验与开户前观察，口吻由上方目标读者（学生/白领）约束。",
  },
  concept_teacher: {
    label: "看盘入门博主",
    description: "术语降维、界面怎么读、开户前先搞懂公开信息与流程。",
  },
  sober_guard: {
    label: "清醒测评博主",
    description: "客观测评炒股工具：适合谁/不适合谁、券商通道与信息边界。",
  },
  hotspot_observer: {
    label: "市场观察员",
    description: "基于热点素材做时间线梳理与公开信息降维（需选素材）。",
  },
};

export function resolvePeerDiaryVariantForAudience(
  audienceTag: string | undefined,
  businessLine: BusinessLine,
): string {
  if (businessLine !== "weisec") return "salary";
  const normalized = normalizeWeisecAudience(audienceTag) || audienceTag;
  return normalized === "student" ? "campus" : "salary";
}

function buildPersonaEntry(persona: PersonaSource): PersonaUiEntry {
  const copy = WEISEC_PERSONA_COPY[persona.id];
  return {
    uiKey: persona.id,
    personaId: persona.id,
    label: copy?.label || persona.label,
    description: copy?.description || persona.description,
    requiresHotspotMaterials: persona.requiresHotspotMaterials,
    audienceTags: persona.audienceTags,
    suitableScenes: persona.suitableScenes,
  };
}

function scoreWeisecPersonaEntry(entry: PersonaUiEntry, scene: string, audience: string): number {
  const sceneScore = entry.suitableScenes.length === 0 ? 0 : entry.suitableScenes.includes(scene) ? 3 : -1;
  const audienceScore = entry.audienceTags.includes(audience) ? 2 : 0;
  const primaryBonus = WEISEC_PRIMARY_PERSONA_BY_SCENE[scene] === entry.personaId ? 2 : 0;
  return sceneScore + audienceScore + primaryBonus;
}

export function expandPersonasForBriefUI(
  personas: PersonaSource[],
  scene: string | undefined,
  audienceTag: string | undefined,
  businessLine: BusinessLine,
): { primary: PersonaUiEntry[]; optional: PersonaUiEntry[] } {
  if (businessLine !== "weisec") {
    const entries = personas.map((persona) => buildPersonaEntry(persona));
    return { primary: entries, optional: [] };
  }

  const primaryEntries = personas
    .filter((persona) => !WEISEC_HIDDEN_PERSONA_IDS.has(persona.id))
    .map((persona) => buildPersonaEntry(persona));

  if (!scene || !audienceTag) {
    return { primary: primaryEntries, optional: [] };
  }

  const normalizedAudience = normalizeWeisecAudience(audienceTag) || audienceTag;

  primaryEntries.sort(
    (a, b) => scoreWeisecPersonaEntry(b, scene, normalizedAudience) - scoreWeisecPersonaEntry(a, scene, normalizedAudience),
  );

  return { primary: primaryEntries, optional: [] };
}

export function getPersonaUiRecommendation(
  entry: PersonaUiEntry,
  scene: string | undefined,
  audienceTag: string | undefined,
  businessLine: BusinessLine,
): PersonaRecommendation {
  if (businessLine !== "weisec" || !scene || !audienceTag) return null;

  const normalizedAudience = normalizeWeisecAudience(audienceTag) || audienceTag;
  const primaryId = WEISEC_PRIMARY_PERSONA_BY_SCENE[scene];
  const sceneMatch = entry.suitableScenes.length === 0 || entry.suitableScenes.includes(scene);
  const audienceMatch = entry.audienceTags.includes(normalizedAudience);

  if (entry.personaId === primaryId && sceneMatch) {
    return audienceMatch ? "both" : "scene";
  }

  if (sceneMatch && audienceMatch) return "both";
  if (sceneMatch) return "scene";
  if (audienceMatch) return "audience";
  return null;
}

export function isPersonaUiSelected(brief: BriefInput, entry: PersonaUiEntry): boolean {
  return brief.personaId === entry.personaId;
}

export function resolveWeisecPrimaryPersonaId(scene: string): string | undefined {
  return WEISEC_PRIMARY_PERSONA_BY_SCENE[scene];
}

export function getWeisecPersonaDisplayLabel(
  brief: BriefInput,
  personas: PersonaSource[],
  scene: string | undefined,
  audienceTag: string | undefined,
): string | undefined {
  if (!scene || !audienceTag) {
    return personas.find((item) => item.id === brief.personaId)?.label;
  }
  const groups = expandPersonasForBriefUI(personas, scene, audienceTag, "weisec");
  const hit = groups.primary.find((entry) => isPersonaUiSelected(brief, entry));
  return hit?.label;
}
