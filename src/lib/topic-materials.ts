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
