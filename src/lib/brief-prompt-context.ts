import type { BusinessLine, EmbedLevel } from "@/lib/types";
import {
  getOffer,
  getScene,
  getWorkflowFallback,
  type BusinessLineWorkflowConfig,
} from "@/lib/business-line-workflow";
import {
  normalizeEmbedLevel,
  requiresStrictProductHierarchy,
  resolveMinRequiredBriefFeatures,
} from "@/lib/embed-level";
import { resolveBrandName } from "@/lib/business-line-prompt";

export interface BriefPromptSlice {
  brandName: string;
  offerLabel: string;
  offerDescription: string;
  creationSceneLabel: string;
  creationSceneDescription: string;
  briefFeatureNames: string[];
  topic: string;
}

export interface BriefProductIntegrationResult {
  ok: boolean;
  reason?: string;
  hitFeatures: string[];
  missingFeatures: string[];
}

/** 理财通线：平台 → 主推产品 → 子功能 三层结构 */
function hasProductHierarchy(slice: BriefPromptSlice): boolean {
  return Boolean(
    slice.offerLabel &&
      slice.offerLabel !== slice.brandName &&
      slice.briefFeatureNames.length > 0,
  );
}

function formatProductHierarchyBlock(slice: BriefPromptSlice, embed: EmbedLevel): string {
  if (embed === "none") return "";
  if (!hasProductHierarchy(slice)) return "";

  const subFeatures = slice.briefFeatureNames
    .map((name) => `        ├── ${name}（${slice.offerLabel} 下的子功能/入口，不是独立产品）`)
    .join("\n");

  const isFixedIncomePlus =
    slice.offerLabel.includes("固收") ||
    slice.briefFeatureNames.some((name) => /严选|体验金|长期专区|灵活申赎|AI/.test(name));

  const base = [
    "【产品层级 · 硬性从属关系（写作禁止写反）】",
    `${slice.brandName}（平台）`,
    `  └── ${slice.offerLabel}（主推产品 / Offer）`,
    subFeatures,
    `- 正确语感：先落到「${slice.brandName}」里的「${slice.offerLabel}」，再提子功能（如严选专区）。`,
    `- 子功能从属于${slice.offerLabel}：禁止把子功能写成与${slice.offerLabel}平级，更禁止写成「子功能里归拢/包含${slice.offerLabel}」。`,
  ];

  if (isFixedIncomePlus) {
    base.push(
      "- 【理财通示例 · 禁止写反】正确：理财通 → 固收+ → 严选专区；错误：「理财通有严选专区，把固收+产品归到一起」。",
      "- 可写：「在理财通看固收+时，先点严选专区缩小比较范围」；勿写：「严选专区整理了固收+」。",
    );
  }

  if (embed === "high") {
    base.push(
      "",
      "【high 硬性要求】正文后段须按上述层级写全：平台 → 主推产品 → 各子功能分工（勿颠倒）。",
    );
  } else if (embed === "medium") {
    base.push(
      "",
      "【medium 写法】若提到子功能，须让读者感到它挂在主推产品下（可同句或邻句点到 Offer）；平台全文至少点一次；禁止层级写反。",
    );
  } else {
    base.push("", "【当前档位】产品信息轻点即可，但仍不得写反层级。");
  }

  return base.join("\n");
}

export function assessBriefProductIntegration(
  content: string,
  embedLevel: EmbedLevel | string | undefined,
  slice: BriefPromptSlice,
): BriefProductIntegrationResult {
  const embed = normalizeEmbedLevel(embedLevel);
  const body = String(content || "");
  const hitFeatures = slice.briefFeatureNames.filter((name) => featureMentionedInBody(body, name));
  const missingFeatures = slice.briefFeatureNames.filter((name) => !featureMentionedInBody(body, name));

  if (embed === "none") {
    return { ok: true, hitFeatures, missingFeatures: [] };
  }

  // medium：不强制写全功能，但若已提功能则须至少点一次平台（不必每个功能重复）
  if (!requiresStrictProductHierarchy(embed)) {
    if (hitFeatures.length > 0) {
      const brandToken = slice.brandName.includes("理财通")
        ? "理财通"
        : slice.brandName.includes("微证券")
          ? "微证券"
          : slice.brandName;
      if (!body.includes(brandToken) && !body.includes(slice.brandName)) {
        return {
          ok: false,
          reason: `提到了功能但未点平台「${slice.brandName}」（全文点一次即可，不必每个功能重复）`,
          hitFeatures,
          missingFeatures,
        };
      }
    }
    return { ok: true, hitFeatures, missingFeatures };
  }

  // 以下仅 high 档位
  const brandToken = slice.brandName.includes("理财通")
    ? "理财通"
    : slice.brandName.includes("微证券")
      ? "微证券"
      : slice.brandName;

  if (!body.includes(brandToken) && !body.includes(slice.brandName)) {
    return {
      ok: false,
      reason: `正文未提及平台「${slice.brandName}」`,
      hitFeatures,
      missingFeatures: slice.briefFeatureNames,
    };
  }

  if (hasProductHierarchy(slice) && !mainProductMentionedInBody(body, slice.offerLabel)) {
    return {
      ok: false,
      reason: `正文未体现主推产品「${slice.offerLabel}」；子功能是${slice.offerLabel}下的能力，不能只写子功能不写主推产品。`,
      hitFeatures,
      missingFeatures,
    };
  }

  if (slice.briefFeatureNames.length > 0) {
    const minRequired = resolveMinRequiredBriefFeatures(embed, slice.briefFeatureNames.length);
    if (hitFeatures.length < minRequired) {
      const missingLabel = missingFeatures.length ? missingFeatures.join("、") : slice.briefFeatureNames.join("、");
      return {
        ok: false,
        reason: `强硬植入不足：须写全${slice.offerLabel}的子功能，缺少「${missingLabel}」（已写：${hitFeatures.join("、") || "无"}）`,
        hitFeatures,
        missingFeatures,
      };
    }
  }

  return { ok: true, hitFeatures, missingFeatures: [] };
}

export function validateBriefProductIntegration(
  content: string,
  embedLevel: EmbedLevel | string | undefined,
  slice: BriefPromptSlice,
): { ok: boolean; reason?: string } {
  const result = assessBriefProductIntegration(content, embedLevel, slice);
  return { ok: result.ok, reason: result.reason };
}

export function resolveBriefPromptSlice(
  input: Record<string, unknown>,
  workflowConfig?: BusinessLineWorkflowConfig,
): BriefPromptSlice {
  const businessLine = (input.businessLine || "licaitong") as BusinessLine;
  const cfg = workflowConfig || getWorkflowFallback(businessLine);
  const offer = getOffer(String(input.offerId || ""), cfg, businessLine);
  const scene = getScene(String(input.creationScene || ""), cfg, businessLine);
  const embed = normalizeEmbedLevel(input.embedLevel);
  const names =
    embed === "none"
      ? []
      : Array.isArray(input.selectedFeatureNames)
        ? input.selectedFeatureNames.map(String).filter(Boolean)
        : [];

  return {
    brandName: resolveBrandName(businessLine),
    offerLabel: offer?.label || resolveBrandName(businessLine),
    offerDescription: offer?.description || "",
    creationSceneLabel: scene?.label || "未指定",
    creationSceneDescription: scene?.description || "",
    briefFeatureNames: names,
    topic: String(input.topic || "").trim(),
  };
}

export function formatBriefBusinessContext(slice: BriefPromptSlice, embedLevel?: EmbedLevel | string): string {
  const embed = normalizeEmbedLevel(embedLevel || "medium");
  if (embed === "none") {
    return [
      "【纯内容 Brief · 不得写成推广帖】",
      `- 创作场景：${slice.creationSceneLabel} — ${slice.creationSceneDescription}`,
      `- 用户主题：${slice.topic || "未填写"}`,
      "- 价值来自经历/观点/情绪/信息整理；即使 Step1 勾选了功能，**正文也不要写产品名、功能名、品牌名或操作路径**。",
    ].join("\n");
  }

  const hierarchy = formatProductHierarchyBlock(slice, embed);
  const lines = [
    hierarchy,
    hierarchy ? "" : null,
    `- 平台：${slice.brandName}`,
    hasProductHierarchy(slice)
      ? `- 主推产品：${slice.offerLabel}${slice.offerDescription ? `（${slice.offerDescription}）` : ""}`
      : `- 推广对象：${slice.offerLabel}`,
    hasProductHierarchy(slice)
      ? `- 本篇可用的${slice.offerLabel}子功能：${slice.briefFeatureNames.join("、")}`
      : slice.briefFeatureNames.length
        ? `- 勾选能力：${slice.briefFeatureNames.join("、")}`
        : null,
    `- 创作场景：${slice.creationSceneLabel} — ${slice.creationSceneDescription}`,
    `- 用户主题：${slice.topic || "未填写（须围绕主推产品 + 场景推导）"}`,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

/** 角度生成：按 embed + 产品层级写绑定规则 */
export function buildEmbedAngleProductRules(
  embedLevel: EmbedLevel | string | undefined,
  slice: BriefPromptSlice,
): string {
  const embed = normalizeEmbedLevel(embedLevel);
  if (embed === "none") {
    return "当前为纯内容档位：角度可不绑产品，recommendedFeatureIds 可为空，productBridge 可留空。";
  }
  if (slice.briefFeatureNames.length === 0) {
    return `Brief 未勾选子功能：角度须围绕主推产品「${slice.offerLabel}」与创作场景展开。`;
  }

  const minFeatures = resolveMinRequiredBriefFeatures(embed, slice.briefFeatureNames.length);

  const lines = [
    formatProductHierarchyBlock(slice, embed),
    "",
    `【角度绑定 · ${embed} 档位】`,
    hasProductHierarchy(slice)
      ? `- 理解层级：${slice.brandName} → ${slice.offerLabel} → 子功能；子功能不可脱离${slice.offerLabel}单独成篇。`
      : "",
    embed === "high" && hasProductHierarchy(slice)
      ? `- high：角度须覆盖${slice.offerLabel} + 全部子功能（${slice.briefFeatureNames.join("、")}）的分工路径。`
      : "",
    embed === "medium"
      ? `- medium：角度像真人选题；若桥接产品，productBridge 须能落到平台「${slice.brandName}」（点一次即可），禁止只绑孤立功能名。`
      : "",
    embed === "high" && minFeatures > 0
      ? `- recommendedFeatureIds 须绑定全部 ${minFeatures} 个子功能。`
      : "- recommendedFeatureIds 选填（与角度相关的子功能即可）。",
    `- 贴合场景「${slice.creationSceneLabel}」；禁止无关纯概念课。`,
  ];

  return lines.filter(Boolean).join("\n");
}

/** 正文生成：覆盖人设「不提产品」默认规则 */
export function buildBriefProductRuntimeLock(
  slice: BriefPromptSlice,
  embedLevel: EmbedLevel | string | undefined,
): string {
  const embed = normalizeEmbedLevel(embedLevel);
  if (embed === "none") {
    return [
      "【纯内容成稿锁定 · 覆盖人设与场景里的默认推广】",
      "- 正文禁止出现平台名、产品名、功能名、子功能名、操作路径、开户/申购/搜索引导。",
      "- 标题与开头钩子围绕生活/情绪/困惑，禁止第一句就写产品或品牌。",
      "- 禁止 CTA、interactionGuide、「微信搜 XX」类导流；insertStrength 填 none。",
      `- 创作场景：${slice.creationSceneLabel}（${slice.creationSceneDescription}）`,
      slice.topic ? `- 用户主题：${slice.topic}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lines = [
    embed === "high"
      ? "【Brief 业务锁定 · high 强硬植入】"
      : "【Brief 背景 · 理解产品关系即可，写作须自然】",
    formatProductHierarchyBlock(slice, embed),
    "",
  ];

  if (embed === "high" && hasProductHierarchy(slice)) {
    lines.push(
      `- 平台、主推产品、全部子功能均须出现，后段展开路径说明。`,
      `- 前约 40% 铺垫，后约 60% 写${slice.offerLabel} + ${slice.briefFeatureNames.join("、")} 如何分工。`,
    );
  } else if (embed === "medium") {
    lines.push(
      "- medium：像小红书真人帖，故事/情绪先行；产品信息顺口带出即可，禁止为植入而植入。",
      `- 若提到功能或 Offer：全文至少点一次平台「${slice.brandName}」锚定；后续功能可顺着写，不必每个功能重复平台名。`,
      `- 提到子功能时，须挂在「${slice.offerLabel}」下（可同句/邻句点到${slice.offerLabel}），禁止写成子功能包含/归拢${slice.offerLabel}。`,
      "- 禁止：全文只提功能完全不提平台；禁止「功能+平台」句式复读；禁止产品层级写反。",
    );
  }

  lines.push(
    `- 创作场景：${slice.creationSceneLabel}（${slice.creationSceneDescription}）`,
    slice.topic ? `- 用户主题：${slice.topic}` : "- 主题未填：从场景推导。",
  );

  if (embed === "high") {
    lines.push(
      "- 禁止：只写子功能不写主推产品；禁止平台/产品/子功能写成三个平级推广点；禁止「子功能归拢主推产品」的反向表述。",
      "- 平台点清即可，不必每个子功能句都重复平台名。",
    );
  }

  lines.push("- 合规结尾：了解公开信息，不构成投资建议。");

  return lines.filter(Boolean).join("\n");
}

function mainProductMentionedInBody(body: string, productLabel: string): boolean {
  if (!productLabel || productLabel === "腾讯理财通" || productLabel === "腾讯微证券") return true;
  if (body.includes(productLabel)) return true;
  if (productLabel.includes("固收") && /固收\+?/.test(body)) return true;
  return false;
}

function featureMentionedInBody(body: string, featureName: string): boolean {
  if (body.includes(featureName)) return true;
  if (featureName.includes("体验") && /体验金|虚拟.*理财|理财金体验/.test(body)) return true;
  if (featureName.includes("严选") && /严选/.test(body)) return true;
  if (featureName.includes("长期") && /长期理财|长期专区/.test(body)) return true;
  if (featureName.includes("灵活") && /灵活申赎|申赎/.test(body)) return true;
  if (featureName.includes("AI") && /\bAI\b|智能辅助/.test(body)) return true;
  return false;
}
