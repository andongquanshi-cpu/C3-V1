/** 视频口播风险提示：合规含义固定，表述须多样化 */
const VIDEO_RISK_ORAL_POOL = [
  "市场谁也说不准，我就当个信息整理，不构成投资建议啊。",
  "工具只能帮你看公开信息，买不买还得你自己拿主意。",
  "投资有波动，过往不代表以后，理性点总没错。",
  "我这只是个人体验分享，不是让你照着买。",
  "盈亏都得自己扛，别把几句话当成买卖信号。",
  "公开信息整理罢了，别当成荐股提示。",
  "自个儿判断最重要，我可不是让你闭眼跟。",
  "行情起起伏伏很正常，谨慎些总没错。",
  "信息仅供参考，决策还得你自己来。",
  "没有稳赚这回事，小心点总是好的。",
];

function toArray(value: unknown): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [String(value)];
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function isOralSuitable(text: string): boolean {
  const t = text.trim();
  if (t.length < 10 || t.length > 72) return false;
  if (t.startsWith("📌")) return false;
  if (/基金管理人|保险合同|信用卡透支|贷款有风/.test(t)) return false;
  return true;
}

function dedupe(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickRotated(lines: string[], seed: string, count: number): string[] {
  if (!lines.length) return [];
  const start = hashSeed(seed) % lines.length;
  const result: string[] = [];
  for (let i = 0; i < Math.min(count, lines.length); i++) {
    result.push(lines[(start + i) % lines.length]);
  }
  return result;
}

export function hasAdequateRiskReminder(...texts: Array<string | undefined>): boolean {
  const combined = texts.filter(Boolean).join("\n");
  if (!combined.trim()) return false;

  const hasRisk = /风险|波动|亏损|谨慎/.test(combined);
  const hasDisclaimer =
    /不构成.{0,8}投资建议|不构成投资建议|仅供参考|独立判断|自行判断|个人体验|公开信息|自己拿主意|自己琢磨/.test(
      combined,
    );

  return hasRisk && hasDisclaimer;
}

export function formatVideoRiskReminderGuide(
  riskDisclaimers: { globalRiskReminder?: string; requiredTexts?: string[] } | undefined,
  seed?: string,
): string {
  const kbLines = toArray(riskDisclaimers?.requiredTexts).filter(isOralSuitable);
  const pool = dedupe([...kbLines, ...VIDEO_RISK_ORAL_POOL]);
  const examples = pickRotated(pool, seed || "video-default", 5);
  const toneHint = pool[hashSeed(seed || "video-default") % pool.length] || VIDEO_RISK_ORAL_POOL[0];

  return [
    "【风险提示 · 口播化（禁止同质化贴片）】",
    "- 合规底线不变：非投资建议、市场有风险、须独立判断——但**禁止**每条视频都用同一句「市场有风险，投资需谨慎」当结尾贴片。",
    "- 把风险提示**写进最后一镜口播**，像真人顺口补一句，可带语气词（啊、嘛、吧）；riskReminder 字段写与口播一致的口语版。",
    "- 禁止：单独一段念标语、⚠️+标准口号、与正文人设割裂的播音腔。",
    "- 可参考以下调性（必须改写，勿照搬）：",
    ...examples.map((line) => `  · ${line}`),
    `- 本篇语气参考（须改写）：「${toneHint}」`,
  ].join("\n");
}
