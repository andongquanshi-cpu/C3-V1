type LooseRecord = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function countCjk(text: string) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

/** 检测「只有镜头+时长、没有口播/画面」的占位稿 */
export function isSkeletonVideoScript(content: string): boolean {
  const body = String(content || "").trim();
  if (!body) return true;

  const totalCjk = countCjk(body);
  const lines = body.split("\n").filter(Boolean);
  if (!lines.length) return true;

  const placeholderOnly = lines.every((line) => {
    const hasShot = /【镜头\d+】|镜头\s*\d+/i.test(line);
    if (!hasShot) return false;
    const hasVoice = /口播[：:]/i.test(line) && countCjk(line.replace(/口播[：:]/i, "")) >= 6;
    const hasVisual = /画面[：:]/i.test(line) && countCjk(line.replace(/画面[：:]/i, "")) >= 4;
    const onlyDuration = /时长[：:]?\s*\d+/.test(line);
    return hasShot && onlyDuration && !hasVoice && !hasVisual;
  });

  if (placeholderOnly) return true;

  const labeledVoice = countCjk(
    (body.match(/口播[：:]([^|【\n]+)/gi) || []).map((m) => m.replace(/口播[：:]/i, "")).join(""),
  );
  if (labeledVoice >= 30) return false;

  // 模型常把口播写在 content 正文里、不带「口播：」标签——有够字数就算有效
  if (totalCjk >= 40) return false;

  return true;
}

export function extractVoiceoverFromPayload(data: LooseRecord): string {
  const parts: string[] = [];
  const opening = asString((data.openingHook as LooseRecord | undefined)?.spokenLine);
  if (opening) parts.push(opening);

  const storyboard = Array.isArray(data.storyboard) ? data.storyboard : [];
  for (const item of storyboard) {
    const row = item as LooseRecord;
    const voice = asString(row.voiceover);
    if (voice) parts.push(voice);
  }

  const explicit = asString(data.content);
  if (explicit) parts.push(explicit);

  return parts.join("\n");
}

export function validateVideoScriptPayload(
  content: string,
  rawPayload?: unknown,
): { ok: boolean; reason?: string } {
  const body = String(content || "").trim();
  if (!body) return { ok: false, reason: "视频脚本正文为空" };

  if (isSkeletonVideoScript(body)) {
    return {
      ok: false,
      reason: "视频脚本只有镜头时长占位，缺少口播原文和画面描述（模型可能只填了骨架）",
    };
  }

  const data = (rawPayload && typeof rawPayload === "object" ? rawPayload : {}) as LooseRecord;
  const storyboard = Array.isArray(data.storyboard) ? data.storyboard : [];
  if (storyboard.length > 0) {
    const voicedShots = storyboard.filter((item) => {
      const row = item as LooseRecord;
      return countCjk(asString(row.voiceover)) >= 6;
    });
    if (voicedShots.length === 0) {
      return { ok: false, reason: "storyboard 每一镜都缺少有效口播（voiceover 过短或为空）" };
    }
  }

  const totalVoice = countCjk(extractVoiceoverFromPayload(data));
  const bodyCjk = countCjk(body);
  const effectiveVoice = Math.max(totalVoice, bodyCjk);
  if (effectiveVoice < 35) {
    return { ok: false, reason: `口播总字数过少（约${effectiveVoice}字），需要完整可拍摄的口播句` };
  }

  return { ok: true };
}
