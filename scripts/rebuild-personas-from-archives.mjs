/**
 * Rebuild personas/standards from personas/archives + persona-matrix.json.
 * Preprocesses each source by family (wzq_json vs md_design_spec) — NOT 1:1 file copy.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "personas");
const ARCHIVES = path.join(ROOT, "archives");
const ARCHIVES_WZQ = path.join(ARCHIVES, "wzq");
const STANDARDS = path.join(ROOT, "standards");
const MATRIX = JSON.parse(fs.readFileSync(path.join(ROOT, "persona-matrix.json"), "utf8"));

const WZQ_MAP = {
  campus_explorer: { file: "persona_campus_explorer.json", defaultAudienceId: "college_student", contentTypes: ["personal-exp", "brand-seed"] },
  salary_diary: { file: "persona_salary_diary.json", defaultAudienceId: "workplace_newcomer", contentTypes: ["personal-exp", "brand-seed"] },
  sober_guard: { file: "persona_sober_girl.json", defaultAudienceId: "young_professional", contentTypes: ["finance-tips", "hotspot-analysis"] },
  family_planner: { file: "persona_family_cfo.json", defaultAudienceId: "family_planner", contentTypes: ["finance-tips", "brand-seed"] },
};

const MD_MAP = {
  workplace_newcomer: { file: "persona-01-workplace-newcomer.md", defaultAudienceId: "workplace_newcomer", contentTypes: ["personal-exp", "brand-seed"] },
  concept_teacher: { file: "persona-02-teaching-blogger.md", defaultAudienceId: "investment_beginner", contentTypes: ["stock-tutorial", "finance-tips"] },
  hotspot_observer: { file: "persona-03-market-observer.md", defaultAudienceId: "hotspot_follower", contentTypes: ["hotspot-analysis"] },
};

const PERSONA_ID_FIX = { sober_girl: "sober_guard", family_cfo: "family_planner" };

function normalizeMd(text) {
  return text.replace(/\r\n/g, "\n");
}

function extractMdBlock(md, heading) {
  const re = new RegExp(`### ${heading}\\s+\\n+\`\`\`\\n([\\s\\S]*?)\\n\`\`\``, "m");
  const hit = normalizeMd(md).match(re);
  return hit ? hit[1].trim() : "";
}

function extractMdSection(md, startHeading, endHeading) {
  const normalized = normalizeMd(md);
  const start = normalized.indexOf(startHeading);
  const end = normalized.indexOf(endHeading, start + 1);
  if (start < 0) return "";
  return normalized.slice(start, end > start ? end : undefined).trim();
}

function extractBulletList(section, minLevel = 0) {
  return section
    .split("\n")
    .filter((l) => /^[-*]/.test(l.trim()) || /^\d+\./.test(l.trim()))
    .map((l) => l.replace(/^[-*\d.]+\s*/, "").replace(/\*\*/g, "").trim())
    .filter((l) => l.length > 2);
}

function extractContentFocus(md) {
  const sec = extractMdSection(md, "## 4. 内容关注点", "## 5.");
  const questions = [];
  for (const m of sec.matchAll(/- \*\*Q\d+\*\*[：:](.+)/g)) questions.push(m[1].trim());
  return { questions };
}

function extractOpeningGuide(md) {
  const sec = extractMdSection(md, "## 6. 内容切入方式", "## 7.");
  const recommended = [];
  const avoid = [];
  let mode = null;
  for (const line of sec.split("\n")) {
    if (line.includes("不推荐")) mode = "avoid";
    else if (line.includes("推荐开场")) mode = "recommended";
    const bullet = line.replace(/^[-*❌✅]\s*/, "").trim();
    if (bullet.startsWith("-") || bullet.startsWith("**")) continue;
    if (mode === "recommended" && line.trim().startsWith("- **")) {
      recommended.push(line.replace(/^-\s*\*\*[^*]+\*\*[：:]\s*/, "").trim());
    }
    if (mode === "avoid" && line.trim().startsWith("- ❌")) {
      avoid.push(line.replace(/^- ❌\s*/, "").trim());
    }
  }
  return { recommended, avoid };
}

function extractProductImplant(md) {
  const sec = extractMdSection(md, "## 7. 产品植入方式", "## 8.");
  const emphasize = extractBulletList(sec.split("### 不应强调")[0] || sec);
  const avoidSec = sec.split("### 不应强调")[1]?.split("###")[0] || "";
  const avoid = extractBulletList(avoidSec).map((l) => l.replace(/^❌\s*/, ""));
  const goldenMatch = sec.match(/>\s*"([^"]+)"/);
  return { emphasize, avoid, goldenRule: goldenMatch ? goldenMatch[1] : "" };
}

function extractSituationalDetails(md) {
  const sec = extractMdSection(md, "### 人设细节特征", "## 4.");
  return sec
    .split("\n")
    .filter((l) => l.trim().startsWith("- **"))
    .map((l) => l.replace(/^-\s*/, "").replace(/\*\*/g, "").trim());
}

function extractUserDescription(md) {
  const sec = extractMdSection(md, "## 2. 用户可见说明", "## 3.");
  return sec
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .join(" ");
}

function extractCoreSituation(md) {
  const positioning = extractMdSection(md, "## 3. 人设定位", "## 4.");
  const start = positioning.indexOf("### 核心处境");
  if (start < 0) return "";
  const chunk = positioning.slice(start).split(/\n### /)[0];
  return chunk
    .replace(/### 核心处境\s*/, "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();
}

function extractRulesFromSystem(system) {
  const personality = [];
  const compliance = [];
  const expression = [];
  const lengthGuide = { short: "", medium: "", long: "" };
  const blocks = system.split(/【([^】]+)】/);
  for (let i = 1; i < blocks.length; i += 2) {
    const title = blocks[i];
    const body = (blocks[i + 1] || "").trim();
    const lines = body.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
    if (title.includes("人格")) personality.push(...lines);
    else if (title.includes("合规")) compliance.push(...lines);
    else if (title.includes("表达")) expression.push(...lines);
    else if (title.includes("内容长度")) {
      for (const line of lines) {
        if (/short/i.test(line)) lengthGuide.short = line.replace(/^-?\s*short[：:]\s*/i, "");
        if (/medium/i.test(line)) lengthGuide.medium = line.replace(/^-?\s*medium[：:]\s*/i, "");
        if (/long/i.test(line)) lengthGuide.long = line.replace(/^-?\s*long[：:]\s*/i, "");
      }
    }
  }
  return { personality, compliance, expression, lengthGuide };
}

function convertJinjaToC3(text) {
  return text
    .replace(/\{\{\s*topic_label\s*\}\}/g, "{{topic}}")
    .replace(/\{\{\s*keywords\s*\|\s*default\([^)]*\)\s*\}\}/g, "{{topic}}")
    .replace(/\{\{\s*selected_title\s*\}\}/g, "{{selectedTitle}}")
    .replace(/\{\{\s*weixin_feature_mapping\s*\}\}/g, "{{selectedFeatures}}")
    .replace(/\{\{\s*rag_viral_methodology\s*\}\}/g, "{{phraseGroup}}")
    .replace(/\{\{\s*rag_deep_research\s*\}\}/g, "{{topicMaterials}}")
    .replace(/\{\{\s*hot_topic_info\[:?\d*\]?\s*\}\}/g, "{{topicMaterials}}")
    .replace(/\{\{\s*video_duration_seconds\s*\|\s*default\(\d+\)\s*\}\}/g, "60")
    .replace(/\{\{\s*segment_count\s*\|\s*default\(\d+\)\s*\}\}/g, "3")
    .replace(/\{%\s*if[^%]*%\}[\s\S]*?\{%\s*endif\s*%\}/g, "")
    .replace(/\{%\s*elif[^%]*%\}[\s\S]*?(?=\{%|$)/g, "")
    .replace(/\{\{\s*topic_type\s*\}\}/g, "{{contentType}}");
}

function convertMdVars(text) {
  return text
    .replace(/\{\{businessLine\}\}/g, "腾讯微证券")
    .replace(/\{\{product_feature\}\}/g, "{{selectedFeatures}}")
    .replace(/\{\{audience_profile\}\}/g, "{{brandVoice}}")
    .replace(/\{\{phrase_library\}\}/g, "{{phraseGroup}}")
    .replace(/\{\{compliance_rule\}\}/g, "{{complianceRules}}")
    .replace(/\{\{risk_disclaimer\}\}/g, "市场有风险，投资需谨慎。")
    .replace(/\{\{materials\}\}/g, "{{topicMaterials}}")
    .replace(/\{\{#if sceneSuggestions\}\}[\s\S]*?\{\{\/if\}\}/g, "")
    .replace(/\{\{sceneSuggestions\}\}/g, "未提供");
}

function normalizeVocabulary(v = {}) {
  return { mustUse: v.must_use || v.mustUse || [], prefer: v.prefer || [], avoid: v.avoid || [] };
}

function normalizeStyle(style) {
  return {
    tone: style.tone || "",
    emojiDensity: style.emoji_density || style.emojiDensity || "",
    titleStyle: style.title_style || style.titleStyle || "",
    sentenceLength: style.sentence_length || style.sentenceLength || "",
    perspective: style.perspective || "",
    vocabulary: normalizeVocabulary(style.vocabulary),
    xiaohongshuSlang: style.xiaohongshu_slang || style.xiaohongshuSlang || [],
  };
}

function normalizeDifferentiation(d, matrixSpec) {
  const cs = d.content_structure || d.contentStructure || {};
  const contrast = { ...(d.contrast_with_personas || d.contrastWithPersonas || {}) };
  for (const [k, v] of Object.entries(PERSONA_ID_FIX)) {
    if (contrast[k]) {
      contrast[v] = contrast[k];
      delete contrast[k];
    }
  }
  return {
    coreAngle: d.core_angle || d.coreAngle || matrixSpec.contentMission,
    openingHookPatterns: d.opening_hook_patterns || d.openingHookPatterns || [],
    titleFormulas: d.title_formulas || d.titleFormulas || [],
    titleExamples: d.title_examples || d.titleExamples || [],
    contentStructure: {
      pattern: cs.pattern || matrixSpec.narrativeMode,
      sectionEmojis: cs.section_emojis || cs.sectionEmojis || [],
      uniqueRule: cs.unique_rule || cs.uniqueRule || "",
    },
    productImplantStyle: d.weixin_implant_style || d.productImplantStyle || "",
    ctaVariations: d.cta_variations || d.ctaVariations || [],
    forbiddenVoice: d.forbidden_voice || d.forbiddenVoice || [],
    contrastWithPersonas: contrast,
  };
}

function normalizeSceneAdaptation(sa) {
  const out = {};
  for (const [k, v] of Object.entries(sa || {})) {
    out[k] = {
      angle: v.angle || "",
      featureFocus: v.feature_focus || v.featureFocus || "",
      toneShift: v.tone_shift || v.toneShift || "",
    };
  }
  return out;
}

function normalizeKnowledgeBase(kb) {
  if (!kb) return { required: [], conditional: [] };
  return {
    required: kb.required || [],
    conditional: (kb.conditional || []).map((c) => ({
      kbId: c.kb_id || c.kbId,
      when: c.when,
      note: c.note,
    })),
  };
}

function sceneHintsBlock(sceneAdaptation) {
  return Object.entries(sceneAdaptation)
    .map(([k, v]) => `- ${k}：${v.angle}（功能：${v.featureFocus}；语气：${v.toneShift}）`)
    .join("\n");
}

function c3Injection() {
  return `
【C3 运行时注入】
- 内容类型：{{contentType}}
- 主题：{{topic}}
- 目标读者：{{targetUser}}
- 篇幅：{{contentLength}}
- 选中角度：{{selectedAngle}}
- 自定义：{{customRequirement}}
- 素材：{{topicMaterials}}
- 产品：{{selectedFeatures}}
- 话术：{{phraseGroup}}
- 品牌：{{brandVoice}}
- 合规：{{complianceRules}}`;
}

function matrixAnalysis(id) {
  const m = MATRIX.personas[id];
  return {
    sourceType: m.sourceType,
    sourceFile: m.sourceFile,
    contentMission: m.contentMission,
    readerQuestion: m.readerQuestion,
    primaryAxis: m.primaryAxis,
    narrativeMode: m.narrativeMode,
    overlapCluster: m.overlapCluster,
    nearestNeighbor: m.nearestNeighbor,
    doNotUseWhen: m.doNotUseWhen,
    preprocessingNotes: m.preprocessingNotes,
  };
}

function routingGuard(analysis) {
  return `
【路由锁定 — 禁止串人设】
- 内容使命：${analysis.contentMission}
- 读者问题：${analysis.readerQuestion}
- 叙事模式：${analysis.narrativeMode}
- 与 ${analysis.nearestNeighbor.id} 的区别：${analysis.nearestNeighbor.distinguisher}
- 以下情况禁用本人设：${analysis.doNotUseWhen.join("；")}`;
}

function buildWzqStandard(id, meta) {
  const raw = JSON.parse(fs.readFileSync(path.join(ARCHIVES_WZQ, meta.file), "utf8"));
  const analysis = matrixAnalysis(id);
  const sceneAdaptation = normalizeSceneAdaptation(raw.scene_adaptation);
  const differentiation = normalizeDifferentiation(raw.differentiation, analysis);

  const contentUser = `${convertJinjaToC3(raw.prompts.content.up)}
${c3Injection()}

【场景适配】
${sceneHintsBlock(sceneAdaptation)}
${routingGuard(analysis)}

只输出合法 JSON。`;

  const rules = extractRulesFromSystem(raw.sp);

  return {
    id,
    label: raw.meta.persona_label,
    status: "active",
    version: "1.3.0",
    origin: `archives/wzq/${meta.file}`,
    summary: analysis.contentMission,
    defaultAudienceId: meta.defaultAudienceId,
    contentTypes: meta.contentTypes,
    analysis,
    identity: {
      emoji: raw.meta.emoji,
      description: raw.meta.description,
      tags: raw.meta.tags,
      targetAudience: raw.meta.target_audience,
      compatibleScenes: raw.meta.compatible_scenes,
      outputFormats: raw.meta.output_formats,
      backstory: raw.meta.differentiation_summary,
      personalityTraits: rules.personality.slice(0, 8),
      situationalDetails: [],
    },
    contentFocus: {
      questions: [`${analysis.readerQuestion}（${analysis.primaryAxis}）`],
    },
    style: normalizeStyle(raw.style),
    differentiation,
    sceneAdaptation,
    openingGuide: { recommended: differentiation.openingHookPatterns, avoid: differentiation.forbiddenVoice },
    productImplant: {
      emphasize: [differentiation.productImplantStyle],
      avoid: ["独立成段硬推产品", "收益承诺式 CTA"],
      goldenRule: differentiation.productImplantStyle,
    },
    rules: {
      personality: rules.personality.length ? rules.personality : ["遵守 system prompt 人格规则"],
      compliance: rules.compliance.length ? rules.compliance : ["严禁荐股、收益承诺、私信导流"],
      expression: rules.expression.length ? rules.expression : ["纯文本，禁止 Markdown"],
      lengthGuide: rules.lengthGuide.short ? rules.lengthGuide : { short: "300-400字", medium: "400-500字", long: "600-800字" },
    },
    config: {
      model: raw.config.model,
      temperature: raw.config.temperature,
      maxTokens: raw.config.max_completion_tokens || 4096,
    },
    prompts: {
      system: `${raw.sp}\n${routingGuard(analysis)}`,
      content: { user: contentUser },
      title: { user: `${convertJinjaToC3(raw.prompts.title.up)}\n\n主题：{{topic}} | 类型：{{contentType}}` },
      video: { user: convertJinjaToC3(raw.prompts.video.up) },
      tags: { user: `${convertJinjaToC3(raw.prompts.tags.up)}\n\n主题：{{topic}} | 标题：{{selectedTitle}}` },
    },
    knowledgeBase: normalizeKnowledgeBase(raw.knowledge_base),
    output: {
      mode: "native_persona_json",
      schemaHint: `严格按 ${id} 的 contentStructure 输出 JSON，pattern：${differentiation.contentStructure.pattern}`,
    },
    acceptance: [
      `是否回答读者问题：${analysis.readerQuestion}`,
      `是否体现叙事模式：${analysis.narrativeMode}`,
      `是否满足 uniqueRule：${differentiation.contentStructure.uniqueRule}`,
      `是否与 ${analysis.nearestNeighbor.id} 明显可区分？`,
      "合规红线全部通过",
    ],
  };
}

function buildMdStandard(id, meta) {
  const mdPath = path.join(ARCHIVES, meta.file);
  const md = fs.readFileSync(mdPath, "utf8");
  const analysis = matrixAnalysis(id);
  const system = extractMdBlock(md, "System Prompt");
  const user = convertMdVars(extractMdBlock(md, "User Prompt"));
  const outputSchema = extractMdSection(md, "## 10. 输出格式", "## 11.");
  const acceptance = [...md.matchAll(/- \[ \] (.+)/g)].map((m) => m[1]);
  const rules = extractRulesFromSystem(system);
  const contentFocus = extractContentFocus(md);
  const openingGuide = extractOpeningGuide(md);
  const productImplant = extractProductImplant(md);
  const situationalDetails = extractSituationalDetails(md);

  const userDesc = extractUserDescription(md);
  const coreSituation = extractCoreSituation(md);

  const contentUser = `${user}
${c3Injection()}
${routingGuard(analysis)}

只输出 JSON，严格遵循 output.schemaHint。`;

  const styleSec = extractMdSection(md, "## 5. 表达风格", "## 6.");

  return {
    id,
    label: id === "workplace_newcomer" ? "职场新人·攒钱日记" : id === "concept_teacher" ? "理财教学博主" : "市场观察员",
    status: "active",
    version: "1.3.0",
    origin: `archives/${meta.file}`,
    summary: analysis.contentMission,
    defaultAudienceId: meta.defaultAudienceId,
    contentTypes: meta.contentTypes,
    analysis,
    identity: {
      emoji: id === "workplace_newcomer" ? "📝" : id === "concept_teacher" ? "📚" : "🔭",
      description: userDesc,
      tags: [],
      targetAudience: analysis.readerQuestion,
      compatibleScenes: id === "hotspot_observer" ? ["market_hot"] : ["beginner_guide", "life_lifestyle"],
      outputFormats: ["image_text", "video"],
      backstory: coreSituation,
      personalityTraits: rules.personality.slice(0, 8),
      situationalDetails,
    },
    contentFocus,
    style: {
      tone: styleSec.match(/### 语气\n\n(.+)/)?.[1]?.split("\n")[0] || "",
      emojiDensity: id === "workplace_newcomer" ? "极低（0-2个，禁止分段标题）" : "低（0-3个）",
      titleStyle: id === "workplace_newcomer" ? "literary" : id === "concept_teacher" ? "conceptual" : "observational",
      sentenceLength: "见 md 规格书 §5",
      perspective: "第一人称",
      vocabulary: { mustUse: [], prefer: [], avoid: [] },
      xiaohongshuSlang: [],
    },
    differentiation: {
      coreAngle: analysis.contentMission,
      openingHookPatterns: openingGuide.recommended,
      titleFormulas: [],
      titleExamples: [],
      contentStructure: {
        pattern: analysis.narrativeMode,
        sectionEmojis: [],
        uniqueRule: analysis.preprocessingNotes,
      },
      productImplantStyle: productImplant.goldenRule,
      ctaVariations: [],
      forbiddenVoice: openingGuide.avoid,
      contrastWithPersonas: { [analysis.nearestNeighbor.id]: analysis.nearestNeighbor.distinguisher },
    },
    sceneAdaptation: id === "hotspot_observer"
      ? { market_hot: { angle: "事件还原+反向视角+所以呢", featureFocus: "问元宝AI、实时行情", toneShift: "慢半拍，6-24h后动笔" } }
      : id === "concept_teacher"
        ? {
            beginner_guide: { angle: "概念拆解", featureFocus: "极简UI、基金筛选器", toneShift: "耐心教学" },
            tool_review: { angle: "教学道具式功能", featureFocus: "收益看板", toneShift: "工具辅助理解" },
          }
        : {
            life_lifestyle: { angle: "生活瞬间", featureFocus: "极简UI", toneShift: "像写日记" },
            beginner_guide: { angle: "第一次认真看钱", featureFocus: "波动提醒", toneShift: "还在试" },
            market_hot: { angle: "通勤刷到新闻的内心戏", featureFocus: "问元宝AI", toneShift: "只谈感受不解读" },
          },
    openingGuide,
    productImplant,
    rules,
    config: { model: "deepseek-chat", temperature: id === "hotspot_observer" ? 0.6 : id === "concept_teacher" ? 0.65 : 0.68, maxTokens: 4096 },
    prompts: {
      system: `${system}\n${routingGuard(analysis)}`,
      content: { user: contentUser },
      title: { user: `生成3个标题。主题：{{topic}} | 类型：{{contentType}}\n使命：${analysis.contentMission}` },
      video: { user: `视频脚本。标题：{{selectedTitle}} | 场景：{{topic}}` },
      tags: { user: `6-8个标签。场景：{{topic}} | 标题：{{selectedTitle}}` },
    },
    knowledgeBase: normalizeKnowledgeBase(null),
    output: { mode: "native_persona_json", schemaHint: outputSchema.replace(/^## 10\. 输出格式\n\n/, "") },
    acceptance: acceptance.length ? acceptance : [`是否体现：${analysis.contentMission}`],
  };
}

for (const [id, meta] of Object.entries(WZQ_MAP)) {
  fs.writeFileSync(path.join(STANDARDS, `${id}.json`), `${JSON.stringify(buildWzqStandard(id, meta), null, 2)}\n`, "utf8");
}
for (const [id, meta] of Object.entries(MD_MAP)) {
  fs.writeFileSync(path.join(STANDARDS, `${id}.json`), `${JSON.stringify(buildMdStandard(id, meta), null, 2)}\n`, "utf8");
}

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry.json"), "utf8"));
registry.version = "1.3.0";
registry.description = "7 套人设经 archives 预处理 + persona-matrix 角度分析后写入 standards";
registry.analysisRef = "persona-matrix.json";
registry.archivesRef = "archives/";
registry.routingTable = MATRIX.routingTable;
for (const p of registry.personas) {
  const m = MATRIX.personas[p.id];
  if (m) p.origin = `archives/${m.sourceType === "wzq_json" ? "wzq/" : ""}${m.sourceFile}`;
}
fs.writeFileSync(path.join(ROOT, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`, "utf8");

console.log("rebuilt 7 standards from archives with matrix-driven preprocessing");
