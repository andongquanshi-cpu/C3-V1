import fs from "node:fs";
import path from "node:path";
import type { loadKnowledgeBase } from "@/lib/knowledge-retriever";
import type {
  LicaitongAudienceTag,
  LicaitongCreationScene,
  LicaitongOfferId,
  ContentType,
} from "@/lib/types";
import type {
  LicaitongCreationSceneOption,
  LicaitongOfferOption,
  LicaitongPersonaOption,
  LicaitongWorkflowConfig,
} from "@/lib/licaitong-workflow";

type AnyRecord = Record<string, unknown>;

function readJsonFile(basePath: string, relativePath: string): AnyRecord {
  const filePath = path.join(basePath, relativePath);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as AnyRecord;
}

function resolveWorkflowConfigPath(index: AnyRecord): string | null {
  const files = (index.files || {}) as Record<string, unknown>;
  const mapped = files.licaitongWorkflowConfig;
  return typeof mapped === "string" && mapped ? mapped.replace(/\\/g, "/") : null;
}

function truncateUiSummary(summary: string) {
  const first = summary.split(/[。；]/)[0]?.trim() || summary;
  if (first.length <= 36) return first;
  return `${first.slice(0, 35)}…`;
}

function mapPersonaOption(item: AnyRecord): LicaitongPersonaOption {
  return {
    id: String(item.personaId || item.id || ""),
    label: String(item.label || ""),
    description: String(item.description || ""),
    variant: item.personaVariantId ? String(item.personaVariantId) : undefined,
    audienceTags: (Array.isArray(item.audienceTags) ? item.audienceTags : []) as LicaitongAudienceTag[],
    audienceLabel: String(item.audienceLabel || ""),
    suitableScenes: (Array.isArray(item.suitableSceneIds) ? item.suitableSceneIds : []) as LicaitongCreationScene[],
    requiresHotspotMaterials: Boolean(item.requiresHotspotMaterials),
    uiBadge: item.uiCard && typeof item.uiCard === "object" ? String((item.uiCard as AnyRecord).badge || "") : undefined,
  };
}

function mapTargetReader(item: AnyRecord) {
  const tag = String(item.audienceTag || item.id || "") as LicaitongAudienceTag;
  return {
    id: tag,
    label: String(item.label || item.targetUserLabel || ""),
    hint: String(item.hint || ""),
    targetUserLabel: String(item.targetUserLabel || item.label || ""),
  };
}

export function buildLicaitongWorkflowConfig(kb: ReturnType<typeof loadKnowledgeBase>): LicaitongWorkflowConfig {
  const bundle = kb.lineBundles?.licaitong;
  const workflowDoc = readJsonFile(kb.basePath, resolveWorkflowConfigPath(kb.index) || "");
  const offerDefaults =
    workflowDoc.offerDefaults && typeof workflowDoc.offerDefaults === "object"
      ? (workflowDoc.offerDefaults as Record<string, AnyRecord>)["fixed-income-plus"] || {}
      : {};

  const configSummaries =
    offerDefaults.featureUiSummaries && typeof offerDefaults.featureUiSummaries === "object"
      ? (offerDefaults.featureUiSummaries as Record<string, string>)
      : {};

  const derivedSummaries = Object.fromEntries(
    kb.offerPackFixedIncomePlus.map((feature: AnyRecord) => [
      feature.id,
      configSummaries[String(feature.id)] || truncateUiSummary(String(feature.summary || "")),
    ]),
  );

  const defaultFeaturesByScene =
    offerDefaults.defaultFeaturesByScene && typeof offerDefaults.defaultFeaturesByScene === "object"
      ? (offerDefaults.defaultFeaturesByScene as Record<LicaitongCreationScene, string[]>)
      : ({} as Record<LicaitongCreationScene, string[]>);

  const defaultBrief =
    workflowDoc.defaultBrief && typeof workflowDoc.defaultBrief === "object"
      ? (workflowDoc.defaultBrief as AnyRecord)
      : {};

  const audiencesFromKb = (bundle?.targetReaders || []).map(mapTargetReader).filter((item) => item.id && item.label);
  const personasFromKb = (bundle?.personaOptions || []).map(mapPersonaOption).filter((item) => item.id && item.label);

  return {
    offers: (Array.isArray(workflowDoc.offers) ? workflowDoc.offers : []) as LicaitongOfferOption[],
    creationScenes: (Array.isArray(workflowDoc.creationScenes)
      ? workflowDoc.creationScenes
      : []) as LicaitongCreationSceneOption[],
    audiences: audiencesFromKb as LicaitongWorkflowConfig["audiences"],
    personas: personasFromKb,
    fplusDefaultFeatures: defaultFeaturesByScene,
    fplusFeatureLimit: Number(offerDefaults.featureLimit || 2),
    fplusFeatureUiSummaries: derivedSummaries,
    defaultBrief: {
      offerId: (defaultBrief.offerId as LicaitongOfferId) || "fixed-income-plus",
      creationScene: (defaultBrief.creationScene as LicaitongCreationScene) || "pain-story",
      audienceTag: (defaultBrief.audienceTag as LicaitongAudienceTag) || "white-collar",
      topic: String(defaultBrief.topic || ""),
      campaignGoal: String(defaultBrief.campaignGoal || ""),
    },
  };
}

export function mergeLicaitongWorkflowConfig(
  kbConfig: Partial<LicaitongWorkflowConfig>,
  fallback: LicaitongWorkflowConfig,
): LicaitongWorkflowConfig {
  return {
    offers: kbConfig.offers?.length ? kbConfig.offers : fallback.offers,
    creationScenes: kbConfig.creationScenes?.length ? kbConfig.creationScenes : fallback.creationScenes,
    audiences: kbConfig.audiences?.length ? kbConfig.audiences : fallback.audiences,
    personas: kbConfig.personas?.length ? kbConfig.personas : fallback.personas,
    fplusDefaultFeatures: Object.keys(kbConfig.fplusDefaultFeatures || {}).length
      ? (kbConfig.fplusDefaultFeatures as LicaitongWorkflowConfig["fplusDefaultFeatures"])
      : fallback.fplusDefaultFeatures,
    fplusFeatureLimit: kbConfig.fplusFeatureLimit || fallback.fplusFeatureLimit,
    fplusFeatureUiSummaries: Object.keys(kbConfig.fplusFeatureUiSummaries || {}).length
      ? kbConfig.fplusFeatureUiSummaries!
      : fallback.fplusFeatureUiSummaries,
    defaultBrief: { ...fallback.defaultBrief, ...kbConfig.defaultBrief },
  };
}

export function audienceLabelFromConfig(
  tag: LicaitongAudienceTag,
  config: LicaitongWorkflowConfig,
): string {
  return config.audiences.find((item) => item.id === tag)?.targetUserLabel || config.audiences.find((item) => item.id === tag)?.label || tag;
}

export function creationSceneToContentTypeFromConfig(
  scene: LicaitongCreationScene | undefined,
  config: LicaitongWorkflowConfig,
): ContentType {
  const hit = config.creationScenes.find((item) => item.id === scene) || config.creationScenes[0];
  return hit?.contentType || "finance-tips";
}
