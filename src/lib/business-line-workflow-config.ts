import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { loadKnowledgeBase } from "@/lib/knowledge-retriever";
import type { BusinessLine, ContentType } from "@/lib/types";
import type {
  BusinessLineWorkflowConfig,
  CreationSceneOption,
  OfferOption,
  PersonaOption,
} from "@/lib/business-line-workflow";
import { FALLBACK_WORKFLOWS, getWorkflowFallback } from "@/lib/business-line-workflow";

type AnyRecord = Record<string, unknown>;

const WORKFLOW_INDEX_KEYS: Record<BusinessLine, string> = {
  licaitong: "licaitongWorkflowConfig",
  weisec: "weisecWorkflowConfig",
};

function readJsonFile(basePath: string, relativePath: string): AnyRecord {
  const filePath = path.join(basePath, relativePath);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as AnyRecord;
}

function resolveWorkflowConfigPath(index: AnyRecord, businessLine: BusinessLine): string | null {
  const files = (index.files || {}) as Record<string, unknown>;
  const mapped = files[WORKFLOW_INDEX_KEYS[businessLine]];
  return typeof mapped === "string" && mapped ? mapped.replace(/\\/g, "/") : null;
}

function truncateUiSummary(summary: string) {
  const first = summary.split(/[。；]/)[0]?.trim() || summary;
  if (first.length <= 36) return first;
  return `${first.slice(0, 35)}…`;
}

function mapPersonaOption(item: AnyRecord, businessLine: BusinessLine): PersonaOption {
  const audienceTags = Array.isArray(item.audienceTags)
    ? item.audienceTags.map(String)
    : Array.isArray(item.compatibleAudienceIds)
      ? item.compatibleAudienceIds.map(String)
      : [];
  const suitableScenes = Array.isArray(item.suitableSceneIds)
    ? item.suitableSceneIds.map(String)
    : Array.isArray(item.suitableScenes)
      ? item.suitableScenes.map((scene) => String((scene as AnyRecord).id || scene))
      : [];
  const personaId = String(item.personaId || item.id || "");
  const variant =
    personaId === "peer_diary" && businessLine === "weisec"
      ? undefined
      : item.personaVariantId
        ? String(item.personaVariantId)
        : undefined;

  return {
    id: personaId,
    label: String(item.label || ""),
    description: String(item.description || ""),
    variant,
    audienceTags,
    audienceLabel: String(item.audienceLabel || ""),
    suitableScenes,
    requiresHotspotMaterials: Boolean(item.requiresHotspotMaterials),
    uiBadge:
      item.uiCard && typeof item.uiCard === "object" ? String((item.uiCard as AnyRecord).badge || "") : undefined,
  };
}

function mapTargetReader(item: AnyRecord) {
  const tag = String(item.audienceTag || item.audienceId || item.id || "");
  return {
    id: tag,
    label: String(item.label || item.targetUserLabel || ""),
    hint: String(item.hint || ""),
    targetUserLabel: String(item.targetUserLabel || item.label || ""),
  };
}

function resolvePrimaryOfferId(workflowDoc: AnyRecord, fallback: BusinessLineWorkflowConfig): string {
  const defaultBrief =
    workflowDoc.defaultBrief && typeof workflowDoc.defaultBrief === "object"
      ? (workflowDoc.defaultBrief as AnyRecord)
      : {};
  const enabledOffer = (Array.isArray(workflowDoc.offers) ? workflowDoc.offers : []).find(
    (offer) => (offer as AnyRecord).enabled !== false,
  ) as AnyRecord | undefined;
  return String(defaultBrief.offerId || enabledOffer?.id || fallback.primaryOfferId);
}

function resolveFeatureSource(workflowDoc: AnyRecord, fallback: BusinessLineWorkflowConfig) {
  const raw = String(workflowDoc.featureSource || fallback.featureSource);
  return raw === "product-features" ? "product-features" : "offer-pack";
}

function buildFeatureUiSummaries(
  businessLine: BusinessLine,
  kb: ReturnType<typeof loadKnowledgeBase>,
  workflowDoc: AnyRecord,
  primaryOfferId: string,
  fallback: BusinessLineWorkflowConfig,
): Record<string, string> {
  const offerDefaults =
    workflowDoc.offerDefaults && typeof workflowDoc.offerDefaults === "object"
      ? ((workflowDoc.offerDefaults as Record<string, AnyRecord>)[primaryOfferId] || {})
      : {};

  const configSummaries =
    offerDefaults.featureUiSummaries && typeof offerDefaults.featureUiSummaries === "object"
      ? (offerDefaults.featureUiSummaries as Record<string, string>)
      : {};

  if (resolveFeatureSource(workflowDoc, fallback) === "offer-pack" && businessLine === "licaitong") {
    return Object.fromEntries(
      kb.offerPackFixedIncomePlus.map((feature: AnyRecord) => [
        feature.id,
        configSummaries[String(feature.id)] || truncateUiSummary(String(feature.summary || "")),
      ]),
    );
  }

  const bundle = kb.lineBundles?.[businessLine === "licaitong" ? "licaitong" : "weisec"];
  const productFeatures = bundle?.productFeatures || [];
  return Object.fromEntries(
    productFeatures.map((feature: AnyRecord) => [
      feature.id,
      configSummaries[String(feature.id)] || truncateUiSummary(String(feature.summary || "")),
    ]),
  );
}

export function buildWorkflowConfig(
  kb: ReturnType<typeof loadKnowledgeBase>,
  businessLine: BusinessLine,
): BusinessLineWorkflowConfig {
  const fallback = getWorkflowFallback(businessLine);
  const lineKey = businessLine === "licaitong" ? "licaitong" : "weisec";
  const bundle = kb.lineBundles?.[lineKey];
  const workflowDoc = readJsonFile(kb.basePath, resolveWorkflowConfigPath(kb.index, businessLine) || "");
  const primaryOfferId = resolvePrimaryOfferId(workflowDoc, fallback);

  const offerDefaults =
    workflowDoc.offerDefaults && typeof workflowDoc.offerDefaults === "object"
      ? ((workflowDoc.offerDefaults as Record<string, AnyRecord>)[primaryOfferId] || {})
      : {};

  const defaultFeaturesByScene =
    offerDefaults.defaultFeaturesByScene && typeof offerDefaults.defaultFeaturesByScene === "object"
      ? (offerDefaults.defaultFeaturesByScene as Record<string, string[]>)
      : ({} as Record<string, string[]>);

  const defaultBrief =
    workflowDoc.defaultBrief && typeof workflowDoc.defaultBrief === "object"
      ? (workflowDoc.defaultBrief as AnyRecord)
      : {};

  const audiencesFromKb = (bundle?.targetReaders || []).map(mapTargetReader).filter((item) => item.id && item.label);
  const personasFromKb = (bundle?.personaOptions || [])
    .filter((item) => {
      const status = String((item as AnyRecord).status || "active");
      if (status === "archived" || status === "hidden") return false;
      if ((item as AnyRecord).hiddenFromUi === true) return false;
      return true;
    })
    .map((item) => mapPersonaOption(item as AnyRecord, businessLine))
    .filter((item) => item.id && item.label);

  return {
    businessLine,
    offers: (Array.isArray(workflowDoc.offers) ? workflowDoc.offers : []) as OfferOption[],
    creationScenes: (Array.isArray(workflowDoc.creationScenes)
      ? workflowDoc.creationScenes
      : []) as CreationSceneOption[],
    audiences: audiencesFromKb.length ? audiencesFromKb : fallback.audiences,
    personas: personasFromKb.length ? personasFromKb : fallback.personas,
    defaultFeaturesByScene: Object.keys(defaultFeaturesByScene).length
      ? defaultFeaturesByScene
      : fallback.defaultFeaturesByScene,
    featureLimit: Number(offerDefaults.featureLimit || fallback.featureLimit),
    featureUiSummaries: buildFeatureUiSummaries(businessLine, kb, workflowDoc, primaryOfferId, fallback),
    primaryOfferId,
    featureSource: resolveFeatureSource(workflowDoc, fallback),
    hideOfferSelection: Boolean(workflowDoc.hideOfferSelection ?? fallback.hideOfferSelection),
    defaultBrief: {
      offerId: String(defaultBrief.offerId || primaryOfferId),
      creationScene: String(defaultBrief.creationScene || fallback.defaultBrief.creationScene),
      audienceTag: String(defaultBrief.audienceTag || fallback.defaultBrief.audienceTag),
      topic: String(defaultBrief.topic || fallback.defaultBrief.topic),
      campaignGoal: String(defaultBrief.campaignGoal || fallback.defaultBrief.campaignGoal),
    },
  };
}

export function mergeWorkflowConfig(
  kbConfig: Partial<BusinessLineWorkflowConfig>,
  fallback: BusinessLineWorkflowConfig,
): BusinessLineWorkflowConfig {
  return {
    businessLine: fallback.businessLine,
    offers: kbConfig.offers?.length ? kbConfig.offers : fallback.offers,
    creationScenes: kbConfig.creationScenes?.length ? kbConfig.creationScenes : fallback.creationScenes,
    audiences: kbConfig.audiences?.length ? kbConfig.audiences : fallback.audiences,
    personas: kbConfig.personas?.length ? kbConfig.personas : fallback.personas,
    defaultFeaturesByScene: Object.keys(kbConfig.defaultFeaturesByScene || {}).length
      ? (kbConfig.defaultFeaturesByScene as BusinessLineWorkflowConfig["defaultFeaturesByScene"])
      : fallback.defaultFeaturesByScene,
    featureLimit: kbConfig.featureLimit || fallback.featureLimit,
    featureUiSummaries: Object.keys(kbConfig.featureUiSummaries || {}).length
      ? kbConfig.featureUiSummaries!
      : fallback.featureUiSummaries,
    primaryOfferId: kbConfig.primaryOfferId || fallback.primaryOfferId,
    featureSource: kbConfig.featureSource || fallback.featureSource,
    hideOfferSelection: kbConfig.hideOfferSelection ?? fallback.hideOfferSelection,
    defaultBrief: { ...fallback.defaultBrief, ...kbConfig.defaultBrief },
  };
}

export function creationSceneToContentTypeFromConfig(
  scene: string | undefined,
  config: BusinessLineWorkflowConfig,
): ContentType {
  const hit = config.creationScenes.find((item) => item.id === scene) || config.creationScenes[0];
  return hit?.contentType || "finance-tips";
}
