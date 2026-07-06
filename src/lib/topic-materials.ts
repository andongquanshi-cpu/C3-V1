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
      return [`【${label}】${item.title}`, item.body ? `摘要：${item.body}` : null, `来源：${source}`]
        .filter(Boolean)
        .join("\n");
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

/** 角度生成时 KB 检索只用主热点，避免多素材把检索与选题全部拉向同一新闻 */
export function collectAngleGenerationRetrievalTerms(materials: MaterialInput[] | undefined): string[] {
  const primary = getPrimaryMaterial(materials);
  if (!primary) return [];
  const terms = [primary.title, primary.body?.slice(0, 120)].filter(Boolean) as string[];
  return [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
}

/**
 * 为 N 个创意角度分配差异化热点权重，避免「选了素材 → 4 个角度全是同一新闻解读」。
 */
export function buildHotspotCoveragePlan(materials: MaterialInput[] | undefined, generateCount: number): string {
  const selected = resolvePromptMaterials({ materials });
  const count = Math.min(5, Math.max(1, Math.round(generateCount) || 3));
  if (!selected.length) {
    return "无热点素材：各角度围绕「用户主题 + 人设 + 场景」展开，不必引用新闻。";
  }

  const primary = getPrimaryMaterial(selected);
  const secondary = selected.filter((item) => item !== primary);
  const primaryTitle = primary?.title || "主热点";

  const lines: string[] = [
    `本次需生成 ${count} 个角度。热点是事实参考，不是每条角度的唯一标题——禁止 ${count} 个角度都复述「${primaryTitle}」。`,
    "",
    "按槽位分配热点权重（必须遵守）：",
  ];

  const assignments: Array<{ slot: number; weight: string; instruction: string }> = [
    {
      slot: 1,
      weight: "高",
      instruction: `深度使用主热点「${primaryTitle}」：differentiationAxis 建议「热点切入」；引用 1-2 个事实点即可，不要写成新闻转载。`,
    },
  ];

  if (count >= 2) {
    if (secondary[0]) {
      assignments.push({
        slot: 2,
        weight: "中",
        instruction: `围绕次要素材「${secondary[0].title}」或主热点的不同侧面（情绪/影响/普通人观感），differentiationAxis 建议「信息增量」或「情绪钩子」。`,
      });
    } else {
      assignments.push({
        slot: 2,
        weight: "中低",
        instruction: `从主热点引申不同问题导向（如「普通人听完会怎么想」「这和我的生活有什么关系」），不得重复角度 1 的 coreIdea 与标题套路。`,
      });
    }
  }

  for (let slot = assignments.length + 1; slot <= count; slot++) {
    assignments.push({
      slot,
      weight: "低/无",
      instruction: `以「用户主题」和人设本色为主：热点可背景一句带过，或完全不引用新闻标题。differentiationAxis 从「生活场景 / 叙事人称 / 产品距离 / 风险意识」中选，coreIdea 禁止再以「${primaryTitle}」为主标题。`,
    });
  }

  for (const item of assignments) {
    lines.push(`${item.slot}. 【权重${item.weight}】${item.instruction}`);
  }

  if (secondary.length > 1) {
    lines.push(
      "",
      `另有素材（每条最多 1 个角度轻量使用）：${secondary
        .slice(1)
        .map((m) => `「${m.title}」`)
        .join("、")}`,
    );
  }

  const minNonHotspotLed = Math.max(1, Math.ceil(count / 2));
  lines.push(
    "",
    "硬性约束：",
    "- 至多 1 个角度做「主热点深度解读」；至多 1 个角度使用次要素材。",
    `- 至少 ${minNonHotspotLed} 个角度的 coreIdea 不以新闻标题/政策名开头。`,
    "- 多个角度若都提到同一热点，必须从不同 differentiationAxis 切入（不能都是「解读 XX 政策」）。",
  );

  return lines.join("\n");
}
