"use client";

import { useEffect, useMemo, useState } from "react";
import { getBriefStorageKey, normalizeContentLength } from "@/lib/business-line-workflow";
import { getWorkspaceStorageKeys, readStoredJson, writeStoredJson } from "@/lib/storage";
import { fetchApiStatus, fetchKnowledgeBase, type ApiStatus } from "@/services/creation-api";
import type {
  BriefInput,
  BusinessLine,
  CreativeAngle,
  Draft,
  GeneratedContent,
  GenerationHistoryEntry,
  KnowledgeListView,
} from "@/lib/types";

const EMPTY_API_STATUS: ApiStatus = {
  ready: false,
  text: false,
  image: false,
  hotspot: false,
};

interface MatrixWorkspaceSessionOptions {
  businessLine: BusinessLine;
  defaultBrief: BriefInput;
}

export function useMatrixWorkspaceSession({ businessLine, defaultBrief }: MatrixWorkspaceSessionOptions) {
  const storageKeys = useMemo(
    () => getWorkspaceStorageKeys(businessLine),
    [businessLine],
  );

  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState<BriefInput>(defaultBrief);
  const [confirmedBrief, setConfirmedBrief] = useState<BriefInput | null>(null);
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [selectedAngleIds, setSelectedAngleIds] = useState<string[]>([]);
  const [confirmedAngles, setConfirmedAngles] = useState<CreativeAngle[]>([]);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [activeResultId, setActiveResultId] = useState("");
  const [confirmedContentId, setConfirmedContentId] = useState("");
  const [confirmedImageContentId, setConfirmedImageContentId] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [history, setHistory] = useState<GenerationHistoryEntry[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeListView | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>(EMPTY_API_STATUS);
  const [apiStatusResolved, setApiStatusResolved] = useState(false);
  const [status, setStatus] = useState("");
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [anglesGeneratedForKey, setAnglesGeneratedForKey] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredJson<Partial<BriefInput>>(
        storageKeys.brief,
        {},
        [getBriefStorageKey(businessLine)],
      );
      // 进入创作页时要素选择保持空白；仅恢复篇幅/形态等非选择偏好。
      setBrief({
        ...defaultBrief,
        businessLine,
        topic: "",
        materials: [],
        generationMode: stored.generationMode || "image-text",
        contentLength: normalizeContentLength(stored.contentLength, stored.generationMode || "image-text"),
        bloggerLevel: stored.bloggerLevel || defaultBrief.bloggerLevel,
        embedLevel: undefined,
        generateCount: 6,
        customRequirement: "",
        offerId: undefined,
        creationScene: undefined,
        audienceTag: undefined,
        targetUser: "",
        personaId: undefined,
        personaVariant: undefined,
        selectedFeatureIds: [],
        selectedFeatureNames: [],
      });
      setDrafts(readStoredJson<Draft[]>(storageKeys.drafts, [], ["lunch-drafts"]));
      setHistory(readStoredJson<GenerationHistoryEntry[]>(storageKeys.history, []).slice(0, 3));
      setStorageReady(true);
    });

    fetchKnowledgeBase<KnowledgeListView>()
      .then((data) => {
        if (!cancelled) setKnowledge(data);
      })
      .catch(() => {
        if (!cancelled) setStatus("知识库加载失败");
      });

    fetchApiStatus()
      .then((data) => {
        if (!cancelled) {
          setApiStatus(data);
          setApiStatusResolved(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiStatus(EMPTY_API_STATUS);
          setApiStatusResolved(true);
        }
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [businessLine, defaultBrief, storageKeys.brief, storageKeys.drafts, storageKeys.history]);

  useEffect(() => {
    if (storageReady) writeStoredJson(storageKeys.brief, brief);
  }, [brief, storageKeys.brief, storageReady]);

  useEffect(() => {
    if (storageReady) writeStoredJson(storageKeys.drafts, drafts);
  }, [drafts, storageKeys.drafts, storageReady]);

  useEffect(() => {
    if (storageReady) writeStoredJson(storageKeys.history, history.slice(0, 3));
  }, [history, storageKeys.history, storageReady]);

  return {
    storageKeys,
    step,
    setStep,
    brief,
    setBrief,
    confirmedBrief,
    setConfirmedBrief,
    angles,
    setAngles,
    selectedAngleIds,
    setSelectedAngleIds,
    confirmedAngles,
    setConfirmedAngles,
    results,
    setResults,
    activeResultId,
    setActiveResultId,
    confirmedContentId,
    setConfirmedContentId,
    confirmedImageContentId,
    setConfirmedImageContentId,
    reviewConfirmed,
    setReviewConfirmed,
    history,
    setHistory,
    drafts,
    setDrafts,
    knowledge,
    apiStatus,
    apiStatusResolved,
    setApiStatus,
    status,
    setStatus,
    isGeneratingAngles,
    setIsGeneratingAngles,
    isGeneratingContent,
    setIsGeneratingContent,
    anglesGeneratedForKey,
    setAnglesGeneratedForKey,
  };
}
