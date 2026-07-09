import type { BriefInput } from "@/lib/types";

/** 根据 Brief 选择正文生成用的 prompt-engine action */
export function resolveContentPromptAction(brief: Pick<BriefInput, "generationMode" | "personaId">) {
  const isVideo = (brief.generationMode || "image-text") === "video-script";
  if (isVideo) {
    return brief.personaId ? "personaContent" : "videoScriptGeneration";
  }
  return brief.personaId ? "personaContent" : "contentGeneration";
}
