import type {
  BriefInput,
  BusinessLine,
  ContentType,
  LicaitongAudienceTag,
  LicaitongCreationScene,
  LicaitongOfferId,
} from "@/lib/types";
import {
  FALLBACK_LICAITONG_WORKFLOW as _FALLBACK_LICAITONG,
  FALLBACK_WEISEC_WORKFLOW,
  FALLBACK_WORKFLOWS,
  TEXT_LENGTH_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  applyAudienceChange as applyBusinessAudienceChange,
  applyGenerationModeChange,
  applyOfferChange as applyBusinessOfferChange,
  applyPersonaChange as applyBusinessPersonaChange,
  applySceneChange as applyBusinessSceneChange,
  audienceTagToTargetUser as businessAudienceTagToTargetUser,
  buildDraftArchiveFields,
  buildWorkflowDefaults,
  creationSceneToContentType as businessCreationSceneToContentType,
  filterOfferFeatures,
  formatContentLengthForPrompt,
  getAnglesStatusMessage,
  getBriefStorageKey,
  getContentLengthFieldLabel,
  getContentLengthOptions,
  getDefaultFeatureIdsForScene,
  getDefaultPersonaForScene,
  getOffer,
  getPersonaRecommendation,
  getPersonaRecommendationLabel,
  getPersonasForScene,
  getPersonasForUI,
  getScene,
  getWorkflowFallback,
  inferAudienceFromPersona,
  isTextContentLength,
  isVideoScriptDuration,
  normalizeContentLength,
  toggleFeature,
  type BusinessLineWorkflowConfig,
  type PersonaRecommendation,
} from "@/lib/business-line-workflow";

export type {
  BusinessLineWorkflowConfig,
  OfferOption as LicaitongOfferOption,
  CreationSceneOption as LicaitongCreationSceneOption,
  PersonaOption as LicaitongPersonaOption,
  AudienceOption as LicaitongAudienceOption,
  PersonaRecommendation,
  DraftArchiveField,
} from "@/lib/business-line-workflow";

export type LicaitongWorkflowConfig = BusinessLineWorkflowConfig;

export const FALLBACK_LICAITONG_WORKFLOW = _FALLBACK_LICAITONG;
export { FALLBACK_WEISEC_WORKFLOW, FALLBACK_WORKFLOWS, getWorkflowFallback, getBriefStorageKey, getAnglesStatusMessage, filterOfferFeatures };

export const LICAITONG_OFFERS = FALLBACK_LICAITONG_WORKFLOW.offers;
export const LICAITONG_CREATION_SCENES = FALLBACK_LICAITONG_WORKFLOW.creationScenes;
export const LICAITONG_PERSONAS = FALLBACK_LICAITONG_WORKFLOW.personas;
export const LICAITONG_AUDIENCES = FALLBACK_LICAITONG_WORKFLOW.audiences;
export const FPLUS_DEFAULT_FEATURES = FALLBACK_LICAITONG_WORKFLOW.defaultFeaturesByScene;
export const FPLUS_FEATURE_UI_SUMMARIES = FALLBACK_LICAITONG_WORKFLOW.featureUiSummaries;
export const LICAITONG_TEXT_LENGTH_OPTIONS = TEXT_LENGTH_OPTIONS;
export const LICAITONG_VIDEO_DURATION_OPTIONS = VIDEO_DURATION_OPTIONS;

export function getPersonasForLicaitongUI(
  scene?: LicaitongCreationScene,
  audience?: LicaitongAudienceTag,
  config?: LicaitongWorkflowConfig,
) {
  return getPersonasForUI(scene, audience, config, "licaitong");
}

export function getLicaitongOffer(id?: LicaitongOfferId, config?: LicaitongWorkflowConfig) {
  return getOffer(id, config, "licaitong");
}

export function getLicaitongScene(id?: LicaitongCreationScene, config?: LicaitongWorkflowConfig) {
  return getScene(id, config, "licaitong");
}

export function creationSceneToContentType(scene?: LicaitongCreationScene, config?: LicaitongWorkflowConfig): ContentType {
  return businessCreationSceneToContentType(scene, config, "licaitong");
}

export function audienceTagToTargetUser(tag: LicaitongAudienceTag, config?: LicaitongWorkflowConfig): string {
  return businessAudienceTagToTargetUser(tag, config, "licaitong");
}

export function audienceLabelFromConfig(tag: LicaitongAudienceTag, config: LicaitongWorkflowConfig): string {
  return audienceTagToTargetUser(tag, config);
}

export function buildLicaitongDefaults(config?: LicaitongWorkflowConfig) {
  return buildWorkflowDefaults("licaitong", config);
}

export function applyLicaitongSceneChange(
  brief: BriefInput,
  scene: LicaitongCreationScene,
  featureNameById: Record<string, string>,
  config?: LicaitongWorkflowConfig,
) {
  return applyBusinessSceneChange(brief, scene, featureNameById, config);
}

export function applyLicaitongOfferChange(
  brief: BriefInput,
  offerId: LicaitongOfferId,
  featureNameById: Record<string, string>,
  config?: LicaitongWorkflowConfig,
) {
  return applyBusinessOfferChange(brief, offerId, featureNameById, config);
}

export function applyLicaitongAudienceChange(
  brief: BriefInput,
  audienceTag: LicaitongAudienceTag,
  config?: LicaitongWorkflowConfig,
) {
  return applyBusinessAudienceChange(brief, audienceTag, config);
}

export function applyLicaitongPersonaChange(
  brief: BriefInput,
  personaId: string,
  config?: LicaitongWorkflowConfig,
  personaVariant?: string,
) {
  return applyBusinessPersonaChange(brief, personaId, config, personaVariant);
}

export function toggleLicaitongFeature(
  brief: BriefInput,
  featureId: string,
  featureName: string,
  checked: boolean,
  config?: LicaitongWorkflowConfig,
) {
  return toggleFeature(brief, featureId, featureName, checked, config);
}

export function buildWeisecDefaults(config?: BusinessLineWorkflowConfig) {
  return buildWorkflowDefaults("weisec", config);
}

export {
  resolveWorkflowForLine,
} from "@/lib/business-line-workflow";

export {
  applyGenerationModeChange,
  buildDraftArchiveFields,
  formatContentLengthForPrompt,
  getContentLengthFieldLabel,
  getContentLengthOptions,
  getDefaultFeatureIdsForScene,
  getDefaultPersonaForScene,
  getPersonasForScene,
  getPersonaRecommendation,
  getPersonaRecommendationLabel,
  inferAudienceFromPersona,
  isTextContentLength,
  isVideoScriptDuration,
  normalizeContentLength,
};

export function getPersonasForSceneAndAudience(
  scene: LicaitongCreationScene,
  audience?: LicaitongAudienceTag,
  config?: LicaitongWorkflowConfig,
) {
  return getPersonasForLicaitongUI(scene, audience, config);
}

export {
  DEFAULT_TEXT_CONTENT_LENGTH,
  DEFAULT_VIDEO_SCRIPT_DURATION,
} from "@/lib/business-line-workflow";
