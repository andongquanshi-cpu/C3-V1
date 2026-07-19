import fs from "node:fs";
import path from "node:path";
import { formatEmojiStyleGuide } from "@/lib/emoji-style";
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
  identity?: Partial<PersonaIdentity> & { emoji?: string };
  style?: Partial<PersonaStyle> & { emojiDensity?: string };
  prompts?: {
    system?: string;
    content?: { user?: string };
    video?: { user?: string };
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

function isVideoScriptMode(variables: Record<string, unknown>) {
  return String(variables.generationMode || "").trim() === "video-script";
}

function resolvePersonaUserTemplate(persona: PersonaStandard, variant: PersonaVariant | undefined, variables: Record<string, unknown>) {
  if (!isVideoScriptMode(variables)) {
    return variant?.prompts?.content?.user || persona.prompts.content.user;
  }
  const videoTemplate = variant?.prompts?.video?.user || persona.prompts.video?.user;
  if (videoTemplate?.trim()) return videoTemplate;
  return variant?.prompts?.content?.user || persona.prompts.content.user;
}

function appendVideoOutputRequirements(parts: string[]) {
  parts.push(
    `\n\n【输出要求 · 视频脚本 — 覆盖人设模板中的图文/Markdown 输出格式】\n- 必须输出**合法 JSON**，不要 Markdown 分镜稿\n- openingHook 须有强钩子（反常识/痛点/好奇/数字），禁止流水账开场\n- storyboard 每镜 visual+voiceover 必填；visual 须含景别、主体动作、屏幕具体内容、环境、人物状态；多信息点用时间轴\n- 每镜填写 cameraMove / sfx / transition；整片填写 bgmSuggestion、coverDesign、interactionGuide（软CTA）\n- content 须写完整分镜稿，**禁止**只写「【镜头N】| 时长：Xs」占位\n- 禁止 imagePromptSuggestions / 图文封面字段（用 coverDesign）\n- tags 必填 8-10 个强相关话题词（不带 #）\n- 口播像真人说话，禁止机构通稿腔`,
  );
}

function appendVideoJsonSchemaOverride(parts: string[]) {
  parts.push(
    `\n\n【视频 JSON 硬性要求】\nopeningHook.spokenLine、storyboard[].voiceover 必须写完整口播原文。示例：\n{"openingHook":{"type":"痛点情绪","spokenLine":"谁懂啊，每次想复盘都不知道从哪下手…","visualNote":"【近景】工位侧脸皱眉，手机屏幕满是K线"},"coverDesign":{"visual":"…","headline":"周末复盘还能这么玩？","subline":"15分钟搞定一周","mood":"暖色放松"},"storyboard":[{"shotIndex":1,"durationSec":5,"cameraMove":"推","transition":"切","visual":"【近景】…(0-2s)…→(2-5s)…","voiceover":"…","sfx":"消息叮×1"}],"bgmSuggestion":"轻快lo-fi，音量低于口播","interactionGuide":"你们周末都怎么复盘？评论区聊聊～"}`,
  );
}

function appendImageTextOutputRequirements(parts: string[]) {
  parts.push(
    `\n\n【输出要求 · 通用】\n- opening 与 body 必须是**非空字符串**（不要用数组/对象拆段）；也可额外提供合并后的 content 字符串\n- tags 字段必填：8-10 个小红书强相关话题词（不带 #），按赛道/主题/读者/Offer或功能/品牌分层；不得省略或留空数组\n- emoji 数量与气质**服从下方【Emoji · 按人设/场景区分】**，不要自行压到过少；以句中/句尾为主，最多 1-2 段段首起势；禁止每段都以 emoji 开头，禁止 💼📝✅💡🎓📱 当分段小标题\n- 产品植入写在 naturalInsertion/insertStrategy，并在正文 opening/body/content 叙事中段自然带出；禁止文末单独 👉 硬推导流句\n- 禁止「首先/其次/第一第二第三」「三步/四点/分成X份/先看这四个」等可见清单框架\n- 禁止文末单独「市场有风险，投资需谨慎」/⚠️ 风险贴片；riskReminder 可留空\n- interactionGuide **必填**一句结尾互动钩子（提问/投票/接龙/悬念预告/收藏引导择一），不得空、不得替代正文\n- 标题与正文可自然融入平台口语（谁懂啊、听劝、救命、求教程等），禁止堆砌烂梗、禁止官方通稿腔\n- imageTextSuggestions 必填 1-3 条；每条必须有可执行的 prompt（竖版 3:4 信息流封面画面描述，含主体/场景/光线/色调；若有 coverText 写「画面内大字仅一句：xxx」，禁止写 coverText: 字段格式与「小红书」字样/Logo 引导），scene/visualNotes 仅作补充`,
  );
}

export function buildPersonaContentUserPrompt(
  personaId: string,
  variables: Record<string, unknown>,
  variantId?: string,
  businessLine: BusinessLine = "weisec",
) {
  const persona = loadPersonaStandard(personaId, businessLine);
  const variant = resolveVariant(persona, variantId);
  const template = resolvePersonaUserTemplate(persona, variant, variables);
  const userBody = replaceTemplate(template, {
    personaVariant: variant?.id || variantId || persona.defaultVariantId || "default",
    ...variables,
  });
  const parts = [userBody];
  const videoMode = isVideoScriptMode(variables);
  const schemaHint = variant?.output?.schemaHint || persona.output?.schemaHint;
  if (videoMode) {
    appendVideoOutputRequirements(parts);
    appendVideoJsonSchemaOverride(parts);
  } else if (schemaHint) {
    parts.push(`\n\n【输出 JSON Schema】\n${schemaHint}`);
  }
  const anti = variant?.antiHomogeneity || persona.antiHomogeneity;
  const archetype = variant?.contentArchetype || persona.contentArchetype;
  if (anti) {
    parts.push(
      `\n\n【防同质化】archetype=${archetype || ""}\n禁止：${anti.neverUse.join("；")}\n勿模仿：${anti.neverSoundLike.join("；")}\n必须有：${anti.mandatoryMarkers.join("；")}`,
    );
  }
  if (!videoMode) {
    appendImageTextOutputRequirements(parts);
    parts.push(
      `\n\n${formatEmojiStyleGuide({
        personaId,
        personaVariant: variant?.id || variantId,
        businessLine,
        creationScene: String(variables.creationScene || variables.contentType || ""),
        generationMode: String(variables.generationMode || ""),
        densityHint: variant?.style?.emojiDensity || persona.style?.emojiDensity,
        signatureEmoji: variant?.identity?.emoji || persona.identity?.emoji,
      })}`,
    );
  }
  const visualGuidelines = variables.visualGuidelines;
  if (
    !videoMode &&
    typeof visualGuidelines === "string" &&
    visualGuidelines.trim() &&
    visualGuidelines !== "未提供" &&
    visualGuidelines !== "不适用"
  ) {
    parts.push(`\n\n【品牌视觉规范 · 封面参考】\n${visualGuidelines}`);
  }
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
