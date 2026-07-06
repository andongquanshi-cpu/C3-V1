import fs from "node:fs";
import path from "node:path";
import { resolveKnowledgeBasePath } from "@/lib/knowledge-retriever";
import type { BusinessLine } from "@/lib/types";

const LEGACY_PERSONAS_DIR = path.join(process.cwd(), "personas");
const L4_AUDIENCE = "layers/L4-audience";

const LINE_FOLDERS: Record<BusinessLine, string> = {
  licaitong: "licaitong",
  weisec: "weizhengquan",
};

export interface PersonaRegistryEntry {
  id: string;
  label: string;
  status: "active" | "draft" | "archived";
  file: string;
  businessLine: BusinessLine;
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

type TargetReaderItem = Record<string, unknown>;
type PersonaOptionItem = Record<string, unknown>;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function personaOptionsFile(kbPath: string, businessLine: BusinessLine) {
  return path.join(kbPath, L4_AUDIENCE, LINE_FOLDERS[businessLine], "persona-options.json");
}

function personaStandardFile(kbPath: string, businessLine: BusinessLine, personaId: string) {
  return path.join(kbPath, L4_AUDIENCE, LINE_FOLDERS[businessLine], "persona-standards", `${personaId}.json`);
}

function normalizeBusinessLine(raw?: string): BusinessLine {
  return raw === "licaitong" ? "licaitong" : "weisec";
}

function mapOptionToRegistryEntry(item: PersonaOptionItem, businessLine: BusinessLine): PersonaRegistryEntry | null {
  const id = String(item.personaId || item.id || "");
  if (!id) return null;
  const audienceTags = Array.isArray(item.compatibleAudienceIds)
    ? item.compatibleAudienceIds.map(String)
    : Array.isArray(item.audienceTags)
      ? item.audienceTags.map(String)
      : [];
  const variants = Array.isArray(item.variants)
    ? item.variants.map((variant) => {
        const record = variant as Record<string, unknown>;
        return { id: String(record.id), label: String(record.label || record.id) };
      })
    : undefined;

  return {
    id,
    label: String(item.label || id),
    status: (String(item.status || "active") as PersonaRegistryEntry["status"]) || "active",
    file: `persona-standards/${id}.json`,
    businessLine,
    defaultAudienceId: String(item.defaultAudienceId || audienceTags[0] || ""),
    compatibleAudienceIds: audienceTags,
    contentTypes: Array.isArray(item.defaultContentTypes) ? item.defaultContentTypes.map(String) : [],
    variants,
  };
}

function loadRegistryEntriesForLine(kbPath: string, businessLine: BusinessLine): PersonaRegistryEntry[] {
  const filePath = personaOptionsFile(kbPath, businessLine);
  if (!fs.existsSync(filePath)) return [];
  const doc = readJson<{ items?: PersonaOptionItem[] }>(filePath);
  return (doc.items || [])
    .map((item) => mapOptionToRegistryEntry(item, businessLine))
    .filter((item): item is PersonaRegistryEntry => Boolean(item));
}

function mapTargetReaderToAudienceProfile(item: TargetReaderItem, businessLine: string): AudienceProfile {
  return {
    id: String(item.audienceTag || item.id),
    name: String(item.label || item.targetUserLabel || item.id),
    kbMatchName: String(item.kbMatchName || item.label || item.id),
    businessLine,
    kbId: item.kbProfileId as string | undefined,
    ageStage: item.ageStage as string | undefined,
    occupation: item.occupation as string | undefined,
    needs: item.needs as string[] | undefined,
    tone: item.tone as string | undefined,
    painPoints: item.painPoints as string[] | undefined,
    infoHabits: item.infoHabits as string[] | undefined,
    safeExpressions: item.safeExpressions as string[] | undefined,
    forbiddenExpressions: item.forbiddenExpressions as string[] | undefined,
    promptSummary: item.promptSummary as string | undefined,
    suitablePersonas: (item.suitablePersonaIds || item.suitablePersonas) as string[] | undefined,
    applicableContentTypes: item.applicableContentTypes as string[] | undefined,
  };
}

export function getPersonasDir(businessLine: BusinessLine = "licaitong") {
  const kbPath = resolveKnowledgeBasePath();
  return path.join(kbPath, L4_AUDIENCE, LINE_FOLDERS[businessLine], "persona-standards");
}

export function isPersonasLibraryAvailable(businessLine?: BusinessLine) {
  try {
    const kbPath = resolveKnowledgeBasePath();
    const lines = businessLine ? [businessLine] : (["licaitong", "weisec"] as BusinessLine[]);
    return lines.some((line) => {
      const dir = path.join(kbPath, L4_AUDIENCE, LINE_FOLDERS[line], "persona-standards");
      return fs.existsSync(dir) && fs.readdirSync(dir).some((name) => name.endsWith(".json"));
    });
  } catch {
    return fs.existsSync(path.join(LEGACY_PERSONAS_DIR, "registry.json"));
  }
}

export function loadPersonaRegistry(businessLine?: BusinessLine): PersonaRegistry {
  const kbPath = resolveKnowledgeBasePath();
  const lines = businessLine ? [businessLine] : (["licaitong", "weisec"] as BusinessLine[]);
  const personas: PersonaRegistryEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    for (const entry of loadRegistryEntriesForLine(kbPath, line)) {
      const key = `${line}:${entry.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      personas.push(entry);
    }
  }

  if (personas.length) {
    return { version: "5.0", personas };
  }

  const legacyRegistry = path.join(LEGACY_PERSONAS_DIR, "registry.json");
  if (fs.existsSync(legacyRegistry)) {
    const legacy = readJson<PersonaRegistry>(legacyRegistry);
    return {
      version: legacy.version,
      personas: legacy.personas.map((item) => ({ ...item, businessLine: "weisec" as BusinessLine })),
    };
  }

  throw new Error("人设库未找到。请确认 layers/L4-audience/{业务线}/persona-standards 存在。");
}

export function loadAudiences(): AudienceProfile[] {
  const items: AudienceProfile[] = [];
  try {
    const kbPath = resolveKnowledgeBasePath();
    const readerPaths = [
      { businessLine: "licaitong", file: path.join(kbPath, L4_AUDIENCE, "licaitong/target-readers.json") },
      { businessLine: "weisec", file: path.join(kbPath, L4_AUDIENCE, "weizhengquan/target-readers.json") },
    ];
    for (const { businessLine, file } of readerPaths) {
      if (!fs.existsSync(file)) continue;
      const doc = readJson<{ items?: TargetReaderItem[] }>(file);
      for (const item of doc.items || []) {
        items.push(mapTargetReaderToAudienceProfile(item, businessLine));
      }
    }
    if (items.length) return items;
  } catch {
    /* fall through */
  }

  const legacyPath = path.join(LEGACY_PERSONAS_DIR, "audiences.json");
  if (fs.existsSync(legacyPath)) {
    const data = readJson<{ audiences: AudienceProfile[] }>(legacyPath);
    return data.audiences;
  }
  return [];
}

export function listActivePersonas(businessLine?: BusinessLine) {
  return loadPersonaRegistry(businessLine).personas.filter((item) => item.status === "active");
}

export function loadPersonaStandard(personaId: string, businessLine: BusinessLine = "weisec"): PersonaStandard {
  const kbPath = resolveKnowledgeBasePath();
  const line = normalizeBusinessLine(businessLine);
  const standardPath = personaStandardFile(kbPath, line, personaId);
  if (fs.existsSync(standardPath)) {
    return readJson<PersonaStandard>(standardPath);
  }

  const legacyRoot = path.join(LEGACY_PERSONAS_DIR, "standards", `${personaId}.json`);
  if (fs.existsSync(legacyRoot)) {
    return readJson<PersonaStandard>(legacyRoot);
  }

  throw new Error(`未找到人设标准：${personaId}（${line}）`);
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

export function buildPersonaSystemPrompt(
  personaId: string,
  variantId?: string,
  businessLine: BusinessLine = "weisec",
) {
  const persona = loadPersonaStandard(personaId, businessLine);
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
  businessLine: BusinessLine = "weisec",
) {
  const persona = loadPersonaStandard(personaId, businessLine);
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
  parts.push(
    `\n\n【输出要求 · 通用】\n- tags 字段必填：5-8 个小红书话题词（不带 #），与主题、标题、人设相关；不得省略或留空数组\n- emoji 按人设 emojiDensity 适量使用（多数人设全文 3-7 个）：点缀在句中、段尾或偶发段首，有小红书氛围；禁止每篇按固定 emoji 顺序当分段小标题\n- 产品植入写在 naturalInsertion/insertStrategy，并在正文 opening/body/content 叙事中段自然带出；禁止文末单独 👉 硬推导流句\n- 禁止「首先/其次/第一/第二」等可见结构标记\n- interactionGuide 最多一句轻互动，不得替代正文`,
  );
  return parts.join("");
}

export function buildPersonaContentPrompt(
  personaId: string,
  variables: Record<string, unknown>,
  variantId?: string,
  businessLine: BusinessLine = "weisec",
) {
  const persona = loadPersonaStandard(personaId, businessLine);
  const variant = resolveVariant(persona, variantId);
  return {
    personaId: persona.id,
    personaLabel: persona.label,
    personaVariant: variant?.id || variantId || persona.defaultVariantId,
    system: buildPersonaSystemPrompt(personaId, variantId, businessLine),
    user: buildPersonaContentUserPrompt(personaId, variables, variantId, businessLine),
    config: persona.config,
    defaultAudienceId: variant?.audienceId || persona.defaultAudienceId,
    contentTypes: persona.contentTypes,
    outputMode: persona.output.mode,
    outputSchema: persona.output.schemaHint,
    acceptance: persona.acceptance,
  };
}
