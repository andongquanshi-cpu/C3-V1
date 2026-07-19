import type { BusinessLine } from "@/lib/types";

/** 运行时覆盖人设 KB 里的 emoji 清单 / 三步教程骨架 */
export function buildNarrativeAntiTemplateLock(
  businessLine: BusinessLine,
  options?: {
    creationScene?: string;
    personaId?: string;
    generationMode?: string;
  },
): string {
  if (businessLine !== "licaitong") {
    return buildWeisecNarrativeLock(options?.generationMode);
  }

  const scene = String(options?.creationScene || "").trim();
  const personaId = String(options?.personaId || "").trim();
  const lines = [
    "【叙事去模板化 · 覆盖人设里的清单/步骤骨架（理财通）】",
    "- 正文须像小红书真人帖：场景、情绪、经历、判断先行；可以有逻辑，但外表不能像课程大纲。",
    "- **禁止**标题/正文/角度名出现：「N步」「N个点」「搞懂这三步」「分成X份」「先看这四个」「避坑清单」「干货合集」当主线框架。",
    "- **禁止** emoji 或符号当分段序号：🎓要点1、✅方法2、📱步骤3、💡第一点、①②③ 编号列表。",
    "- emoji 数量与气质服从运行时【Emoji · 按人设/场景区分】；此处只禁清单体，不压密度。",
    "- **禁止**可见结构词：首先/其次/第一第二第三、下面三点、总结一下有X条。",
    "- **允许**：用故事、对话、踩坑、对比把信息点自然带出；比例/框架只在叙事里顺口提到，不当小标题。",
  ];

  if (personaId === "concept_teacher") {
    lines.push(
      "- 教学博主：内心可按「定义→类比→误解」展开，但**不要**写成「三步搞懂」「教程第X步」；标题像好奇心，不像课本目录。",
    );
  }
  if (personaId === "family_planner") {
    lines.push(
      "- 家庭CFO：可有账本/分配想法，用「我们家怎么聊、怎么定」讲故事；禁止「账户分三份」「四笔钱框架」当分段标题。",
    );
  }
  if (scene === "dry-goods-list") {
    lines.push(
      "- 干货组合推荐：高密度信息须藏在叙事里（对比/踩坑/选择困难），**不是**罗列 N 个功能或 N 条理由的清单体。",
    );
  }
  if (scene === "newcomer-guide") {
    lines.push(
      "- 新人指引：用「我第一次…」经历带出路径，禁止「第一步点这里、第二步点那里」教程体。",
    );
  }
  if (scene === "pain-story" || scene === "review-diary") {
    lines.push("- 故事/复盘场景：以时间线或情绪线推进，禁止中途切成「要点1/要点2」清单。");
  }

  if (options?.generationMode === "video-script") {
    lines.push("- 视频口播同样遵守：禁止在 voiceover 里念「第一第二第三」或「四个点」。");
  }

  return lines.join("\n");
}

function buildWeisecNarrativeLock(generationMode?: string): string {
  const lines = [
    "【叙事去模板化 · 覆盖人设 KB 里的 emoji 清单骨架】",
    "- 禁止正文/口播用「三步/四点/分成X份/先看这四个」当可见框架；信息嵌在故事或测评对比里。",
    "- emoji 数量与气质服从运行时【Emoji · 按人设/场景区分】；此处只禁清单体，不压密度。",
    "- **禁止**每段都以 💼📝✅💡🎓📱💭✨ 开头当小标题；禁止 ✅方法1、💡要点2、①②③ 清单体（即使人设模板写了结构清单也以本条为准）。",
    "- **禁止**文末单独贴「市场有风险，投资需谨慎」「⚠️ 投资有风险」或 👉 CTA 段；风险意识若需要，嵌进最后一段口语里即可。",
  ];
  if (generationMode === "video-script") {
    lines.push("- 视频口播禁止念步骤清单式结构；风险提示嵌最后一镜口播，不要单独念标语。");
  }
  return lines.join("\n");
}
