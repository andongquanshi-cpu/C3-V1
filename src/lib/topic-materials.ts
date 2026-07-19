type MaterialInput = {
  title?: string;
  body?: string;
  source?: string;
  isPrimary?: boolean;
  selected?: boolean;
};

export function resolvePromptMaterials(input: {
  materials?: MaterialInput[];
  topicMaterials?: MaterialInput[];
}): MaterialInput[] {
  const raw = input.materials?.length ? input.materials : input.topicMaterials || [];
  return raw.filter((item) => item.selected !== false && Boolean(item.title?.trim() || item.body?.trim()));
}

export function formatTopicMaterialsForPrompt(materials: MaterialInput[] | undefined) {
  const selected = resolvePromptMaterials({ materials });
  if (!selected.length) return "未提供";

  return selected
    .map((item, index) => {
      const label = item.isPrimary ? "主热点" : `素材 ${index + 1}`;
      const source =
        item.source && item.source !== "手动输入" && !item.source.startsWith("http")
          ? item.source
          : item.source?.startsWith("http")
            ? item.source
            : "手动粘贴";
      const factBody = item.body?.trim();
      const factLine = factBody
        ? `事实要点：${item.isPrimary ? factBody : factBody.slice(0, 240)}`
        : "事实要点：（东财未返回可用摘要，成稿时仅基于标题与公开背景分析，勿编造具体数据、引语或政策原文）";
      return [`【${label}】${item.title}`, factLine, `来源：${source}`].join("\n");
    })
    .join("\n\n");
}

export function collectMaterialRetrievalTerms(materials: MaterialInput[] | undefined): string[] {
  const selected = resolvePromptMaterials({ materials });
  const terms: string[] = [];
  for (const item of selected) {
    if (item.title) terms.push(item.title);
    if (item.body) terms.push(item.body.slice(0, 200));
  }
  return [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
}

export function getPrimaryMaterialTitle(materials: MaterialInput[] | undefined) {
  const selected = resolvePromptMaterials({ materials });
  return selected.find((item) => item.isPrimary)?.title || selected[0]?.title || "";
}

export function getPrimaryMaterial(materials: MaterialInput[] | undefined) {
  const selected = resolvePromptMaterials({ materials });
  return selected.find((item) => item.isPrimary) || selected[0];
}

/** 角度生成时 KB 检索用主热点标题，帮模板/话术更贴当前新闻 */
export function collectAngleGenerationRetrievalTerms(materials: MaterialInput[] | undefined): string[] {
  const primary = getPrimaryMaterial(materials);
  if (!primary) return [];
  const terms = [primary.title, primary.body?.slice(0, 240)].filter(Boolean) as string[];
  return [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
}

/**
 * 热点解读模式：N 个角度都必须围绕已选热点，靠 differentiationAxis 切角，而非放弃热点。
 */
export function buildHotspotCoveragePlan(materials: MaterialInput[] | undefined, generateCount: number): string {
  const selected = resolvePromptMaterials({ materials });
  const count = Math.min(6, Math.max(1, Math.round(generateCount) || 6));
  if (!selected.length) {
    return "无热点素材：各角度围绕「用户主题 + 人设 + 场景」展开。";
  }

  const primary = getPrimaryMaterial(selected);
  const secondary = selected.filter((item) => item !== primary);
  const primaryTitle = primary?.title || "主热点";

  const slotTemplates = [
    {
      weight: "高",
      axis: "热点切入",
      instruction: `以主热点「${primaryTitle}」为核心：发生了什么、为什么上热搜；coreIdea 必须明确挂钩此热点，标题不得照抄新闻稿。`,
    },
    {
      weight: "中高",
      axis: "信息增量 / 因果分析",
      instruction: secondary[0]
        ? `解读次要素材「${secondary[0].title}」：说明事件背景、政策/数据含义、可能影响。`
        : `解读主热点「${primaryTitle}」：说明来龙去脉、关键数据或政策要点、市场/行业影响（须基于事实要点，勿编造）。`,
    },
    {
      weight: "中",
      axis: "普通人怎么办",
      instruction: `基于「${primaryTitle}」回答：普通投资者/理财用户该关注什么、不该做什么——须有分析，不是空泛「我的第一反应」。`,
    },
    {
      weight: "中",
      axis: "风险意识",
      instruction: `围绕主热点「${primaryTitle}」谈边界、误区或「别慌/别踩坑」——仍须引用热点事实，不得写成无关科普。`,
    },
    {
      weight: "中低",
      axis: "叙事人称 / 产品距离",
      instruction: secondary[1]
        ? `结合次要素材「${secondary[1].title}」与人设口吻完成个性化点评。`
        : `用人设第一人称完成对「${primaryTitle}」的短评/复盘，热点必须保持在场。`,
    },
  ];

  const lines = [
    `热点解读模式：本次 ${count} 个角度都必须围绕已选热点素材展开——用户选了这些新闻，就是要聊它们，不得写成与热点无关的泛科普。`,
    `主热点：「${primaryTitle}」——至少 ${Math.ceil(count / 2)} 个角度须以主热点为叙事起点。`,
  ];

  if (secondary.length) {
    lines.push(`次要素材：${secondary.map((m) => `「${m.title}」`).join("、")}——至少 1 个角度须用到次要素材。`);
  }

  lines.push("", "按槽位切角（同一批热点、不同切入点，禁止写成一模一样的新闻摘要）：");

  for (let i = 0; i < count; i += 1) {
    const slot = slotTemplates[i % slotTemplates.length];
    lines.push(`${i + 1}. 【${slot.weight} · ${slot.axis}】${slot.instruction}`);
  }

  lines.push(
    "",
    "硬性约束：",
    `- ${count} 个角度的 coreIdea 均须与已选热点相关，禁止为了差异化而写成纯主题科普、完全脱离热点。`,
    "- 禁止照抄新闻标题当 angleName；用小红书口语重写切入点。",
    "- 差异化靠 differentiationAxis、情绪、结构——不是放弃热点。",
    "- 用户主题是「怎么聊这条热点」的叙事视角（如普通人/职场/宝妈），不是替代热点的另一条选题。",
  );

  return lines.join("\n");
}

export function formatMaterialsForPrompt(materials: MaterialInput[] | undefined, hotspotLinked: boolean) {
  return hotspotLinked
    ? formatTopicMaterialsForPrompt(materials)
    : formatBackgroundMaterialsForPrompt(materials);
}

/** 场景创作模式：背景补充格式化（非新闻主线） */
export function formatBackgroundMaterialsForPrompt(materials: MaterialInput[] | undefined) {
  const selected = resolvePromptMaterials({ materials });
  if (!selected.length) return "未提供";

  return selected
    .map((item, index) => {
      const lines = [`【背景补充 ${index + 1}】${item.title}`];
      if (item.body) lines.push(`摘要：${item.body}`);
      lines.push("用途：仅供业务背景参考，不得作为角度主线或新闻解读标题");
      return lines.join("\n");
    })
    .join("\n\n");
}

/** 场景创作模式：角度生成时不做热点槽位分配，强制围绕场景+主题 */
export function buildSceneModeCoveragePlan(generateCount: number, hasBackground: boolean): string {
  const count = Math.min(6, Math.max(1, Math.round(generateCount) || 6));
  const lines = [
    `当前为场景创作模式（非热点解读）：本次需生成 ${count} 个角度。`,
    "",
    "硬性约束（必须遵守）：",
    "- 所有角度的 coreIdea 必须围绕「用户主题 + 创作场景 + 人设」展开，不得做成新闻解读或市场行情评论。",
    "- 禁止使用 differentiationAxis「热点切入」。",
    "- 优先从「生活场景 / 情绪钩子 / 叙事人称 / 信息增量 / 产品距离 / 风险意识」中选择差异化轴。",
    `- ${count} 个角度均不得将新闻标题、政策名、行情走势作为角度主线或标题方向。`,
  ];
  if (hasBackground) {
    lines.push(
      "- 若提供了背景补充，最多在 1 个角度中用一句话带过，不得复述标题，不得让背景补充成为角度主线。",
    );
  } else {
    lines.push("- 无背景补充：完全围绕用户主题与创作场景展开，不必引用外部新闻。");
  }
  return lines.join("\n");
}
