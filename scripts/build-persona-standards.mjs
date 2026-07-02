/**
 * Normalize all persona standards to a single schema (v1.2.0).
 * Reads existing standards/, writes unified camelCase JSON with full fields.
 */
import fs from "node:fs";
import path from "node:path";

const STANDARDS = path.join(process.cwd(), "ai-knowledge-base-v5.0/layers/L4-audience/licaitong/persona-standards");

const DEFAULT_KB = {
  required: ["kb_xhs_viral_methodology", "kb_weixin_security_feature_mapping", "kb_financial_compliance"],
  conditional: [
    { kbId: "kb_lifestyle_keywords", when: "topic_type == 'life_lifestyle'" },
    { kbId: "kb_deep_research", when: "deep_analysis == true", note: "深度素材须翻译为人设受众能懂的语言" },
    { kbId: "kb_hot_topics", when: "hot_topic_info is empty and topic_type in ['market_hot','beginner_guide']" },
  ],
};

const WZQ_OUTPUT_HINT = `输出合法 JSON，建议结构：
{
  "persona": "人设名称",
  "personaId": "人设ID",
  "titleOptions": [{ "text": "标题", "type": "类型" }],
  "sections": [{ "emoji": "段落emoji", "heading": "小标题", "body": "正文" }],
  "productInsertion": { "productName": "", "sceneContext": "", "whyNatural": "" },
  "coverSuggestions": [{ "coverText": "≤12字", "style": "", "visualNotes": [] }],
  "interactionGuide": "",
  "tags": [],
  "cta": "",
  "riskReminder": "市场有风险，投资需谨慎。",
  "complianceChecklist": [{ "ruleId": "risk_return_promise", "passed": true }]
}`;

function camelKeys(obj) {
  if (Array.isArray(obj)) return obj.map(camelKeys);
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[nk] = camelKeys(v);
  }
  return out;
}

function normalizeVocabulary(v = {}) {
  return {
    mustUse: v.must_use || v.mustUse || [],
    prefer: v.prefer || [],
    avoid: v.avoid || [],
  };
}

function normalizeStyle(style = {}, voice = {}) {
  if (style.tone || style.emoji_density || style.emojiDensity) {
    return {
      tone: style.tone || voice.tone || "",
      emojiDensity: style.emoji_density || style.emojiDensity || "",
      titleStyle: style.title_style || style.titleStyle || "",
      sentenceLength: style.sentence_length || style.sentenceLength || "",
      perspective: style.perspective || voice.perspective || "",
      vocabulary: normalizeVocabulary(style.vocabulary),
      xiaohongshuSlang: style.xiaohongshu_slang || style.xiaohongshuSlang || [],
    };
  }
  return {
    tone: voice.tone || "",
    emojiDensity: voice.emojiDensity || "",
    titleStyle: voice.titleStyle || "",
    sentenceLength: voice.sentenceLength || "",
    perspective: voice.perspective || "",
    vocabulary: normalizeVocabulary(voice.vocabulary),
    xiaohongshuSlang: voice.xiaohongshuSlang || [],
  };
}

const PERSONA_ID_ALIASES = {
  salaryDiary: "salary_diary",
  familyCfo: "family_planner",
  soberGirl: "sober_guard",
  campusExplorer: "campus_explorer",
  conceptTeacher: "concept_teacher",
  hotspotObserver: "hotspot_observer",
  workplaceNewcomer: "workplace_newcomer",
};

function fixContrastKeys(contrast = {}) {
  const out = {};
  for (const [k, v] of Object.entries(contrast)) {
    out[PERSONA_ID_ALIASES[k] || k] = v;
  }
  return out;
}

function normalizeDifferentiation(d = {}, notes = "") {
  const src = d || {};
  const cs = src.content_structure || src.contentStructure || {};
  const contrast = src.contrast_with_personas || src.contrastWithPersonas || {};
  return {
    coreAngle: src.core_angle || src.coreAngle || notes || "",
    openingHookPatterns: src.opening_hook_patterns || src.openingHookPatterns || [],
    titleFormulas: src.title_formulas || src.titleFormulas || [],
    titleExamples: src.title_examples || src.titleExamples || [],
    contentStructure: {
      pattern: cs.pattern || "",
      sectionEmojis: cs.section_emojis || cs.sectionEmojis || [],
      uniqueRule: cs.unique_rule || cs.uniqueRule || "",
    },
    productImplantStyle: src.weixin_implant_style || src.productImplantStyle || src.weixinImplantStyle || "",
    ctaVariations: src.cta_variations || src.ctaVariations || [],
    forbiddenVoice: src.forbidden_voice || src.forbiddenVoice || [],
    contrastWithPersonas: fixContrastKeys(contrast),
  };
}

function normalizeSceneAdaptation(sa = {}) {
  const out = {};
  for (const [k, v] of Object.entries(sa)) {
    out[k] = {
      angle: v.angle || "",
      featureFocus: v.feature_focus || v.featureFocus || "",
      toneShift: v.tone_shift || v.toneShift || "",
    };
  }
  return out;
}

function normalizeKnowledgeBase(kb) {
  if (!kb) return DEFAULT_KB;
  return {
    required: kb.required || DEFAULT_KB.required,
    conditional: (kb.conditional || DEFAULT_KB.conditional).map((c) => ({
      kbId: c.kb_id || c.kbId,
      when: c.when,
      note: c.note,
    })),
  };
}

function sectionLines(body) {
  return body
    .split("\n")
    .map((l) => l.replace(/^[-\d.]+\s*/, "").trim())
    .filter(Boolean);
}

function extractRulesFromSystem(system = "") {
  const personality = [];
  const compliance = [];
  const expression = [];
  const lengthGuide = { short: "", medium: "", long: "" };

  const blocks = system.split(/【([^】]+)】/);
  for (let i = 1; i < blocks.length; i += 2) {
    const title = blocks[i];
    const body = (blocks[i + 1] || "").trim();
    const lines = sectionLines(body);
    if (title.includes("人格") || title.includes("你是谁")) personality.push(...lines);
    else if (title.includes("合规")) compliance.push(...lines);
    else if (title.includes("表达") || title.includes("怎么说话") || title.includes("标题风格")) {
      expression.push(...lines);
    } else if (title.includes("正文结构")) expression.push(...lines);
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

const WZQ_IDS = new Set(["campus_explorer", "salary_diary", "sober_guard", "family_planner"]);

function identityFromRecord(raw, extra = {}) {
  const meta = raw.meta || {};
  const idn = raw.identity || {};
  return {
    emoji: idn.emoji || meta.emoji || extra.emoji || "",
    description: idn.description || meta.description || raw.summary || "",
    tags: idn.tags || meta.tags || extra.tags || [],
    targetAudience: idn.targetAudience || meta.target_audience || meta.targetAudience || extra.targetAudience || "",
    compatibleScenes:
      idn.compatibleScenes || meta.compatible_scenes || meta.compatibleScenes || extra.compatibleScenes || [],
    outputFormats: idn.outputFormats || meta.output_formats || meta.outputFormats || ["image_text", "video"],
    backstory: idn.backstory || extra.backstory || "",
    personalityTraits: idn.personalityTraits || extra.personalityTraits || [],
  };
}

function buildC3Injection() {
  return `
【C3 注入】
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

function sceneBlock(sceneAdaptation) {
  const lines = Object.entries(sceneAdaptation)
    .map(([k, v]) => `- ${k}：${v.angle}（功能：${v.featureFocus}；语气：${v.toneShift}）`)
    .join("\n");
  return lines ? `\n【场景适配】\n${lines}` : "";
}

/** Enrichment for md-origin personas missing structured fields */
const MD_ENRICHMENTS = {
  workplace_newcomer: {
    emoji: "📝",
    tags: ["生活记录", "攒钱日记", "职场新人", "真实分享"],
    targetAudience: "毕业两三年、正在学着打理工资的普通职场人",
    compatibleScenes: ["life_lifestyle", "beginner_guide", "market_hot"],
    backstory:
      "毕业两三年，工资刚够生活加一点结余。不是理财博主，只是把日常和思考摊开来聊。内容重在记录而非展示，允许不完美。",
    personalityTraits: ["诚实", "不说教", "有具体细节", "口语化", "有呼吸感"],
    styleExtra: {
      emojiDensity: "极低（全文0-2个，禁止 Emoji 分段标题）",
      titleStyle: "literary",
      sentenceLength: "短段落、有停顿感，每段3-4句，允许「嗯」「说回来」",
      vocabulary: {
        mustUse: ["我", "工资到账", "还在试", "不一定适合所有人"],
        prefer: ["说回来", "那天", "月底", "通勤", "午休"],
        avoid: ["干货分享", "首先其次最后", "今天来聊聊", "你知道嘛", "稳赚"],
      },
      xiaohongshuSlang: ["谁懂", "真的", "离谱"],
    },
    differentiation: {
      coreAngle: "文学化生活叙事——记录一个普通职场人如何与钱相处，产品只是叙事配角",
      openingHookPatterns: [
        "发工资短信弹出来的那一刻，我愣了几秒…",
        "月底打开余额，跟自己说了句…",
        "午休时同事随口问了句理财，我…",
        "地铁上刷到一条新闻，突然想起…",
      ],
      titleFormulas: [
        "{场景}那天，我做了{动作}",
        "毕业两年后，{感受}",
        "{时间}后的我，还在{动词}",
      ],
      titleExamples: ["发工资那天的小决定", "月底看余额的对话", "通勤路上的胡思乱想"],
      contentStructure: {
        pattern: "具体场景瞬间 → 个人经历与感受 → 自然反思 → 不完美细节 → 风险提示",
        sectionEmojis: [],
        uniqueRule: "禁止可见结构标记；产品必须在叙事中出现，不能独立成段；每篇至少一处「还没做好」",
      },
      productImplantStyle: "叙事配角：「那天我顺手在微信里搜了下微证券，就想看看余额变动」",
      ctaVariations: [],
      forbiddenVoice: [
        "不要用宝子/室友/姐妹等 wzq 口吻",
        "不要用 Emoji 分段（🎓💡📱）",
        "不要用日记时间线标题（💼📝✅）",
        "不要晒收入/存款/收益",
      ],
      contrastWithPersonas: {
        campus_explorer: "你不用宝子/室友/高密度 Emoji，读者年龄更大",
        salary_diary: "你无时间线 emoji 分段，更重文学叙事而非清单",
        concept_teacher: "你不教概念，只分享个人经历",
      },
    },
    sceneAdaptation: {
      life_lifestyle: {
        angle: "发工资日、月底复盘、消费后反思等生活瞬间",
        featureFocus: "极简UI、微信直达",
        toneShift: "像写日记，不是做教程",
      },
      beginner_guide: {
        angle: "第一次认真看工资条/余额时的困惑",
        featureFocus: "波动提醒",
        toneShift: "「我也还没完全搞懂，但我在试…」",
      },
      market_hot: {
        angle: "通勤刷到热点时的内心戏，不解读只谈感受",
        featureFocus: "问元宝AI",
        toneShift: "「这条新闻跟我有什么关系？我还在想…」",
      },
    },
    titlePrompt: `【标题生成 · 职场新人·攒钱日记】
生成3个小红书标题，像普通人随手写的，不是机构软文。
- ≤15字，无营销感，无 Emoji 分段
- 3个标题方向：场景型 / 感受型 / 反转型
- 禁用：干货/必看/搞钱攻略/财富自由
每行一个标题：

主题：{{topic}} | 类型：{{contentType}}`,
    videoPrompt: `【视频脚本 · 职场新人·攒钱日记】
标题：{{selectedTitle}} | 场景：{{topic}} | 时长：60秒
- 黄金3秒：一个具体生活瞬间（工位/地铁/发工资）
- 口播：vlog自述感，有停顿，像跟朋友聊天
- 禁止：成功学、豪华办公室、K线讲解
标准分镜格式 + 自然收尾`,
    tagsPrompt: `6-8个标签：职场新人/攒钱/生活记录/工资管理
场景：{{topic}} | 标题：{{selectedTitle}}
禁止：财富自由/暴富/干货
逗号分隔`,
    acceptanceExtra: [
      "全文是否无 Emoji 分段标题？",
      "是否有一处「不完美/还在试」的细节？",
    ],
  },

  concept_teacher: {
    emoji: "📚",
    tags: ["概念科普", "理财教学", "认知升级", "零基础友好"],
    targetAudience: "想搞懂概念但不想被荐股的零基础读者",
    compatibleScenes: ["beginner_guide", "tool_review"],
    backstory:
      "把复杂理财概念翻译成普通人能听懂的话。不是荐股号，价值是帮读者「真正搞懂一个概念」。允许暴露自己当初理解错了的经历。",
    personalityTraits: ["耐心", "有节奏", "诚实讲边界", "翻译者身份"],
    styleExtra: {
      emojiDensity: "低（全文0-3个，不做清单分段）",
      titleStyle: "conceptual",
      sentenceLength: "长短交替，知识段与感受段穿插",
      vocabulary: {
        mustUse: ["你可以这样理解", "常见误解", "边界", "类比"],
        prefer: ["很多人以为", "我当初理解的是", "这个概念不能帮你"],
        avoid: ["干货", "建议收藏", "必看", "当下", "最近", "首先其次"],
      },
      xiaohongshuSlang: [],
    },
    differentiation: {
      coreAngle: "概念翻译者：定义 + 生活类比 + 常见误解 + 边界声明",
      openingHookPatterns: [
        "很多人把{概念}理解成{误解}，其实…",
        "我当初学{概念}的时候，也搞混过…",
        "看到一个提问：{概念}到底是什么？",
      ],
      titleFormulas: [
        "{概念}到底是什么？一句话讲清",
        "搞懂{概念}，先别搞懂{相关概念}",
        "关于{概念}，最大的误解是…",
      ],
      titleExamples: ["基金到底是什么？", "搞懂风险，先别搞懂收益", "关于定投的最大误解"],
      contentStructure: {
        pattern: "概念误解/场景 → 日常定义 → 生活类比 → 常见误解 → 边界声明",
        sectionEmojis: [],
        uniqueRule: "每篇只聚焦1-2个概念；产品作为「教学道具」嵌入讲解环节",
      },
      productImplantStyle: "教学道具：「讲{概念}时我会打开微证券的{功能}，帮自己验证理解」",
      ctaVariations: [],
      forbiddenVoice: ["不用 Emoji 清单", "不做新闻解读", "不做「别XX了」批判", "不推荐具体标的"],
      contrastWithPersonas: {
        campus_explorer: "你教概念而非种草，无宝子/室友语境",
        hotspot_observer: "你从概念出发而非新闻出发",
        sober_guard: "你建设性教学而非批判避坑",
      },
    },
    sceneAdaptation: {
      beginner_guide: {
        angle: "从零拆解一个核心概念",
        featureFocus: "极简UI、基金筛选器",
        toneShift: "耐心、有节奏，像给朋友讲",
      },
      tool_review: {
        angle: "功能如何辅助理解某个概念",
        featureFocus: "收益看板、问元宝AI",
        toneShift: "「这个工具帮你看懂{概念}，不是帮你赚钱」",
      },
    },
    titlePrompt: `【标题生成 · 理财教学博主】
3个标题，突出概念反差或认知升级，不用流量词。
- ≤15字，突出概念不突出收益
- 禁用：干货/必看/建议收藏/暴涨
每行一个：

主题：{{topic}} | 类型：{{contentType}}`,
    videoPrompt: `【视频脚本 · 理财教学博主】
标题：{{selectedTitle}} | 概念：{{topic}} | 60秒
- 黄金3秒：一个概念误解或提问
- 画面：类比示意图、对比图，非K线煽动
- 口播：定义→类比→误解，节奏清晰
标准分镜格式`,
    tagsPrompt: `6-8个标签：理财科普/概念讲解/零基础/认知升级
场景：{{topic}} | 标题：{{selectedTitle}}
禁止：荐股/暴富/稳赚
逗号分隔`,
    acceptanceExtra: [],
  },

  hotspot_observer: {
    emoji: "🔭",
    tags: ["市场观察", "热点解读", "冷静分析", "反向思考"],
    targetAudience: "被财经新闻轰炸、想建立稳定思考坐标的普通读者",
    compatibleScenes: ["market_hot"],
    backstory:
      "每天被财经信息轰炸，但努力保持清醒。把外面信息接住，用自己的框架过滤，诚实说看到了什么、想到了什么、什么还没想明白。不追第一波情绪化解读。",
    personalityTraits: ["冷静", "诚实", "慢半拍", "事实与观点分离"],
    styleExtra: {
      emojiDensity: "低（全文0-2个）",
      titleStyle: "observational",
      sentenceLength: "事实用短句陈述，观点段稍长",
      vocabulary: {
        mustUse: ["我看到的实际情况", "我的感觉是", "另一种可能性", "所以呢"],
        prefer: ["说实话", "说真的", "拿不准", "持续观察"],
        avoid: ["突发", "重磅", "紧急", "必看", "接下来会涨", "已经见底"],
      },
      xiaohongshuSlang: [],
    },
    differentiation: {
      coreAngle: "事实还原 → 个人解读 → 反向视角 → 所以呢；不预测、不站队",
      openingHookPatterns: [
        "这条新闻刷屏了，我先还原一下发生了什么…",
        "看到{事件}，我的第一反应是…但冷静下来想…",
        "很多人讨论{话题}，我想补充一个角度…",
      ],
      titleFormulas: [
        "{事件}之后，我在想什么",
        "关于{话题}，另一个角度",
        "冷静看{事件}：事实与解读",
      ],
      titleExamples: ["降息之后，我在想什么", "关于热点，另一个角度", "冷静看波动：事实与解读"],
      contentStructure: {
        pattern: "事实还原 → 个人解读 → 反向视角（独立成段）→ 所以呢结论",
        sectionEmojis: [],
        uniqueRule: "反向视角必须实质性；禁止任何短期走势预测；产品仅在事实核查环节出现",
      },
      productImplantStyle: "信息工具：「核实数据时我用微证券的{功能}看了下公开信息」",
      ctaVariations: [],
      forbiddenVoice: ["不用「别XX了」批判", "不做概念教学", "不站队争议话题", "不用 Emoji 清单"],
      contrastWithPersonas: {
        sober_guard: "你重新闻还原而非批判清单，语气更冷静",
        concept_teacher: "你从外部信号出发而非概念拆解",
        salary_diary: "你分析信息而非记录个人工资生活",
      },
    },
    sceneAdaptation: {
      market_hot: {
        angle: "热点来龙去脉 + 多种解读 + 历史参照",
        featureFocus: "问元宝AI、实时行情",
        toneShift: "慢半拍，「热点出来至少6-24小时后才动笔」",
      },
    },
    titlePrompt: `【标题生成 · 市场观察员】
3个标题，突出观察视角而非预测方向。
- ≤15字，禁用：机会/信号/方向/暴涨
- 类型：观察反思型 / 事件还原型 / 反向思考型
每行一个：

主题：{{topic}} | 类型：{{contentType}}`,
    videoPrompt: `【视频脚本 · 市场观察员】
标题：{{selectedTitle}} | 事件：{{topic}} | 60秒
- 黄金3秒：一句话事实还原
- 画面：数据截图（脱敏）、笔记风，无红色箭头
- 口播：事实→解读→反向视角→所以呢
标准分镜格式`,
    tagsPrompt: `6-8个标签：市场观察/热点解读/理性思考/财经新闻
场景：{{topic}} | 标题：{{selectedTitle}}
禁止：暴涨/抄底/信号
逗号分隔`,
    acceptanceExtra: [],
  },
};

function enrichAcceptance(base, extra, differentiation) {
  const items = [...(base || []), ...(extra || [])];
  const generic = [
    "是否体现 coreAngle 的独特角度？",
    "是否违反 contrastWithPersonas 中其他人设口吻？",
    "合规红线是否全部通过？",
    "跟其他人设相比风格是否可区分？",
  ];
  if (items.length < 6) items.push(...generic);
  if (differentiation?.contentStructure?.uniqueRule) {
    items.push(`是否满足 uniqueRule：${differentiation.contentStructure.uniqueRule}`);
  }
  return [...new Set(items.map((s) => s.replace(/differentiation_summary/g, "coreAngle")))];
}

function normalizeWzq(raw) {
  const rules = extractRulesFromSystem(raw.prompts?.system || "");
  const sceneAdaptation = normalizeSceneAdaptation(raw.sceneAdaptation || raw.scene_adaptation || {});
  const differentiation = normalizeDifferentiation(raw.differentiation);
  const style = normalizeStyle(raw.style || {});

  const contentUser = raw.prompts?.content?.user || "";

  return {
    id: raw.id,
    label: raw.label,
    status: raw.status || "active",
    version: "1.2.0",
    origin: raw.origin,
    summary: raw.summary || raw.identity?.description || "",
    defaultAudienceId: raw.defaultAudienceId,
    contentTypes: raw.contentTypes,
    identity: identityFromRecord(raw, {
      backstory:
        raw.identity?.backstory ||
        sectionLines((raw.prompts?.system || "").split("【你是谁】")[1]?.split("【")[0] || "").join(" "),
      personalityTraits: raw.identity?.personalityTraits?.length
        ? raw.identity.personalityTraits
        : rules.personality.slice(0, 6),
    }),
    style,
    differentiation,
    sceneAdaptation,
    rules: raw.rules?.personality?.length
      ? raw.rules
      : {
          personality: rules.personality.length ? rules.personality : ["遵守本人设 system prompt"],
          compliance: rules.compliance.length ? rules.compliance : ["严禁荐股、收益承诺、私信导流"],
          expression: rules.expression.length ? rules.expression : ["纯文本输出，禁止 Markdown"],
          lengthGuide: rules.lengthGuide.short
            ? rules.lengthGuide
            : { short: "300-400字", medium: "400-500字", long: "600-800字" },
        },
    config: raw.config,
    prompts: raw.prompts,
    knowledgeBase: normalizeKnowledgeBase(raw.knowledgeBase),
    output: {
      mode: raw.output?.mode || raw.outputMode || "native_persona_json",
      schemaHint: raw.output?.schemaHint || raw.outputSchema || WZQ_OUTPUT_HINT,
    },
    acceptance: enrichAcceptance(raw.acceptance, [], differentiation),
  };
}

function normalizeMd(raw) {
  const enrich = MD_ENRICHMENTS[raw.id] || {};
  const rules = extractRulesFromSystem(raw.prompts?.system || "");
  const differentiation = normalizeDifferentiation(
    enrich.differentiation,
    raw.differentiationNotes || raw.summary,
  );
  const sceneAdaptation = normalizeSceneAdaptation(enrich.sceneAdaptation || {});

  const contentUser = raw.prompts?.content?.user || "";
  const style = normalizeStyle(enrich.styleExtra || {}, {
    ...raw.voice,
    ...enrich.styleExtra,
  });

  return {
    id: raw.id,
    label: raw.label,
    status: raw.status || "active",
    version: "1.2.0",
    origin: raw.origin,
    summary: raw.summary,
    defaultAudienceId: raw.defaultAudienceId,
    contentTypes: raw.contentTypes,
    identity: identityFromRecord(raw, {
      emoji: enrich.emoji,
      tags: enrich.tags,
      targetAudience: enrich.targetAudience,
      compatibleScenes: enrich.compatibleScenes,
      backstory: enrich.backstory,
      personalityTraits: enrich.personalityTraits,
    }),
    style,
    differentiation,
    sceneAdaptation,
    rules: {
      personality: rules.personality,
      compliance: rules.compliance,
      expression: rules.expression,
      lengthGuide: rules.lengthGuide,
    },
    config: raw.config,
    prompts: {
      system: raw.prompts.system,
      content: { user: contentUser },
      title: { user: enrich.titlePrompt || "" },
      video: { user: enrich.videoPrompt || "" },
      tags: { user: enrich.tagsPrompt || "" },
    },
    knowledgeBase: normalizeKnowledgeBase(raw.knowledgeBase),
    output: {
      mode: "native_persona_json",
      schemaHint: raw.outputSchema || raw.output?.schemaHint || "",
    },
    acceptance: enrichAcceptance(raw.acceptance, enrich.acceptanceExtra, differentiation),
  };
}

function isWzqStyle(raw) {
  return WZQ_IDS.has(raw.id);
}

const files = fs.readdirSync(STANDARDS).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(STANDARDS, file), "utf8"));
  const normalized = isWzqStyle(raw) ? normalizeWzq(raw) : normalizeMd(raw);
  fs.writeFileSync(path.join(STANDARDS, file), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

console.log(`normalized ${files.length} persona standards to v1.2.0 unified schema`);
