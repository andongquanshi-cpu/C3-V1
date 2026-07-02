import fs from "node:fs";
import path from "node:path";

const PERSONAS_DIR = path.join(process.cwd(), "personas");

export interface PersonaRegistryEntry {
  id: string;
  label: string;
  status: "active" | "draft" | "archived";
  file: string;
  defaultAudienceId: string;
  compatibleAudienceIds?: string[];
  contentTypes: string[];
  variants?: Array<{ id: string; label: string }>;
}

export interface PersonaRegistry {
  version: string;
  personas: PersonaRegistryEntry[];
}

export interface AudienceProfile {
  id: string;
  name: string;
  kbMatchName: string;
  businessLine?: string;
  kbId?: string;
  ageStage?: string;
  occupation?: string;
  needs?: string[];
  tone?: string;
  painPoints?: string[];
  infoHabits?: string[];
  safeExpressions?: string[];
  forbiddenExpressions?: string[];
  promptSummary?: string;
  suitablePersonas?: string[];
  applicableContentTypes?: string[];
}

export interface PersonaVariant {
  id: string;
  label: string;
  audienceId?: string;
  spAddon?: string;
  system?: string;
  contentArchetype?: string;
  antiHomogeneity?: PersonaAntiHomogeneity;
  prompts?: {
    system?: string;
    content?: { user?: string };
  };
  output?: { mode: string; schemaHint: string };
}

export interface PersonaIdentity {
  emoji: string;
  description: string;
  tags: string[];
  targetAudience: string;
  compatibleScenes: string[];
  outputFormats: string[];
  backstory: string;
  personalityTraits: string[];
}

export interface PersonaStyle {
  tone: string;
  emojiDensity: string;
  titleStyle: string;
  sentenceLength: string;
  perspective: string;
  vocabulary: { mustUse: string[]; prefer: string[]; avoid: string[] };
  xiaohongshuSlang: string[];
}

export interface PersonaDifferentiation {
  coreAngle: string;
  openingHookPatterns: string[];
  titleFormulas: string[];
  titleExamples: string[];
  contentStructure: { pattern: string; sectionEmojis: string[]; uniqueRule: string };
  productImplantStyle: string;
  ctaVariations: string[];
  forbiddenVoice: string[];
  contrastWithPersonas: Record<string, string>;
}

export interface PersonaRules {
  personality: string[];
  compliance: string[];
  expression: string[];
  lengthGuide: { short: string; medium: string; long: string };
}

export interface PersonaAntiHomogeneity {
  neverUse: string[];
  neverSoundLike: string[];
  mandatoryMarkers: string[];
}

export interface PersonaStandard {
  id: string;
  label: string;
  status: string;
  version: string;
  summary: string;
  contentArchetype?: string;
  contentArchetypeLabel?: string;
  antiHomogeneity?: PersonaAntiHomogeneity;
  defaultAudienceId: string;
  defaultVariantId?: string;
  contentTypes: string[];
  variants?: PersonaVariant[];
  identity: PersonaIdentity;
  style: PersonaStyle;
  differentiation: PersonaDifferentiation;
  sceneAdaptation: Record<string, { angle: string; featureFocus: string; toneShift: string }>;
  rules: PersonaRules;
  config: { model: string; temperature: number; maxTokens: number };
  prompts: {
    system: string;
    content: { user: string };
    title?: { user: string };
    video?: { user: string };
    tags?: { user: string };
  };
  knowledgeBase: { required: string[]; conditional: Array<{ kbId: string; when: string; note?: string }> };
  output: { mode: string; schemaHint: string };
  acceptance: string[];
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function getPersonasDir() {
  return PERSONAS_DIR;
}

export function isPersonasLibraryAvailable() {
  return fs.existsSync(path.join(PERSONAS_DIR, "registry.json"));
}

export function loadPersonaRegistry(): PersonaRegistry {
  const registryPath = path.join(PERSONAS_DIR, "registry.json");
  if (!fs.existsSync(registryPath)) {
    throw new Error(`人设库未找到：${registryPath}。请执行 git restore personas/ 或检查仓库完整性。`);
  }
  return readJson<PersonaRegistry>(registryPath);
}

export function loadAudiences(): AudienceProfile[] {
  const data = readJson<{ audiences: AudienceProfile[] }>(path.join(PERSONAS_DIR, "audiences.json"));
  return data.audiences;
}

export function listActivePersonas() {
  return loadPersonaRegistry().personas.filter((item) => item.status === "active");
}

export function loadPersonaStandard(personaId: string): PersonaStandard {
  const entry = loadPersonaRegistry().personas.find((item) => item.id === personaId);
  if (!entry) throw new Error(`未找到人设：${personaId}`);
  return readJson<PersonaStandard>(path.join(PERSONAS_DIR, entry.file));
}

export function resolveAudienceName(audienceId?: string) {
  const audiences = loadAudiences();
  const hit = audiences.find((item) => item.id === audienceId);
  return hit?.name || hit?.kbMatchName || "投资小白";
}

export function resolveAudienceKbMatchName(audienceId?: string) {
  const audiences = loadAudiences();
  const hit = audiences.find((item) => item.id === audienceId);
  return hit?.kbMatchName || hit?.name || "投资小白";
}

function replaceTemplate(template: string, variables: Record<string, unknown>) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in variables)) return match;
    const value = variables[key];
    if (value === undefined || value === null || value === "") return "未提供";
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  });
}

function resolveVariant(persona: PersonaStandard, variantId?: string) {
  const id = variantId || persona.defaultVariantId;
  if (!id) return undefined;
  return persona.variants?.find((item) => item.id === id);
}

export function buildPersonaSystemPrompt(personaId: string, variantId?: string) {
  const persona = loadPersonaStandard(personaId);
  const variant = resolveVariant(persona, variantId);
  const variantSystem = variant?.prompts?.system || variant?.system;
  let base = variantSystem;
  if (!base) {
    if (variant?.spAddon) base = `${persona.prompts.system}\n\n【变体：${variant.label}】\n${variant.spAddon}`;
    else base = persona.prompts.system;
  }
  return base;
}

export function buildPersonaContentUserPrompt(
  personaId: string,
  variables: Record<string, unknown>,
  variantId?: string,
) {
  const persona = loadPersonaStandard(personaId);
  const variant = resolveVariant(persona, variantId);
  const template = variant?.prompts?.content?.user || persona.prompts.content.user;
  const userBody = replaceTemplate(template, {
    personaVariant: variant?.id || variantId || persona.defaultVariantId || "default",
    ...variables,
  });
  const parts = [userBody];
  const schemaHint = variant?.output?.schemaHint || persona.output?.schemaHint;
  if (schemaHint) {
    parts.push(`\n\n【输出 JSON Schema】\n${schemaHint}`);
  }
  const anti = variant?.antiHomogeneity || persona.antiHomogeneity;
  const archetype = variant?.contentArchetype || persona.contentArchetype;
  if (anti) {
    parts.push(
      `\n\n【防同质化】archetype=${archetype || ""}\n禁止：${anti.neverUse.join("；")}\n勿模仿：${anti.neverSoundLike.join("；")}\n必须有：${anti.mandatoryMarkers.join("；")}`,
    );
  }
  return parts.join("");
}

export function buildPersonaContentPrompt(
  personaId: string,
  variables: Record<string, unknown>,
  variantId?: string,
) {
  const persona = loadPersonaStandard(personaId);
  const variant = resolveVariant(persona, variantId);
  return {
    personaId: persona.id,
    personaLabel: persona.label,
    personaVariant: variant?.id || variantId || persona.defaultVariantId,
    system: buildPersonaSystemPrompt(personaId, variantId),
    user: buildPersonaContentUserPrompt(personaId, variables, variantId),
    config: persona.config,
    defaultAudienceId: variant?.audienceId || persona.defaultAudienceId,
    contentTypes: persona.contentTypes,
    outputMode: persona.output.mode,
    outputSchema: persona.output.schemaHint,
    acceptance: persona.acceptance,
  };
}
