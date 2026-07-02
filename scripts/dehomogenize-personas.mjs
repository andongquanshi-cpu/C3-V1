/**
 * Break homogeneity: each persona gets unique archetype, output schema, rules, anti-patterns.
 */
import fs from "node:fs";
import path from "node:path";

const STANDARDS = path.join(process.cwd(), "ai-knowledge-base-v5.0/layers/L4-audience/licaitong/persona-standards");
const WZQ_IDS = new Set(["campus_explorer", "salary_diary", "sober_guard", "family_planner"]);

const SPECS = {
  campus_explorer: {
    contentArchetype: "emoji_listicle_peer",
    contentArchetypeLabel: "校园同学安利体（Emoji 分段清单）",
    outputSchemaHint: `{
  "persona": "校园理财探索生",
  "personaId": "campus_explorer",
  "contentArchetype": "emoji_listicle_peer",
  "titleOptions": [{ "text": "≤20字含emoji", "type": "共鸣型|实习型|零花钱型" }],
  "sections": [
    { "emoji": "🎓", "role": "共鸣开头", "body": "宿舍/实习场景2-3句" },
    { "emoji": "💡", "role": "踩坑发现", "body": "第一人称踩坑，人话" },
    { "emoji": "📱", "role": "小步骤", "body": "零花钱级别可操作" },
    { "emoji": "✨", "role": "鼓励", "body": "降低门槛1-2句" }
  ],
  "peerVoiceMarkers": ["宝子", "室友", "谁懂啊"],
  "productInsertion": { "style": "同学安利App", "sceneContext": "", "sampleLine": "我室友用的，微信搜就行" },
  "cta": "👉 微信搜腾讯微证券",
  "riskReminder": "投资有风险，入市需谨慎。",
  "tags": [],
  "complianceChecklist": []
}`,
    antiHomogeneity: {
      neverUse: ["工资分配框架", "家庭账本比例", "别XX了", "事实还原/反向视角", "定义→类比→误解教学体", "纯文学无结构长叙事"],
      neverSoundLike: ["salary_diary:打工人时间线日记", "workplace_newcomer:文学散文", "sober_guard:批判清单", "family_planner:家庭CFO框架", "concept_teacher:概念课", "hotspot_observer:新闻观察"],
      mandatoryMarkers: ["宝子或室友", "零花钱/实习工资语境", "每段开头emoji"],
    },
    lengthGuide: { short: "250-350字，2个emoji段", medium: "400-500字，4个emoji段", long: "550-650字，可加第5段踩坑补充" },
    acceptance: [
      "读起来像大学生在宿舍分享，而不是机构教程？",
      "是否出现宝子/室友/零花钱/实习工资等校园语境词？",
      "正文是否用🎓💡📱✨分段（不是💼日记体、不是纯段落散文）？",
      "是否避免了工资条分配、家庭比例、新闻解读、概念定义课口吻？",
      "产品是否像同学安利而非测评报告？",
    ],
  },

  salary_diary: {
    contentArchetype: "diary_timeline",
    contentArchetypeLabel: "打工人日记体（时间线叙事，非清单）",
    outputSchemaHint: `{
  "persona": "打工人真实日记",
  "personaId": "salary_diary",
  "contentArchetype": "diary_timeline",
  "titleOptions": [{ "text": "≤20字", "type": "真实分享型|通勤型|工资型" }],
  "timelineAnchor": "上周四下班 | 发工资那天 | 三个月后的我",
  "diaryEntries": [
    { "timeLabel": "具体时间点", "scene": "工位/地铁/下班", "whatHappened": "第一手经历", "feeling": "情绪" }
  ],
  "methodsLearned": [{ "label": "我现在的做法", "detail": "可执行，不画饼" }],
  "honestReflection": "不完美的现状反思",
  "productInsertion": { "style": "碎片时间工具测评", "sceneContext": "通勤/工位摸鱼" },
  "cta": "👉 微信搜腾讯微证券",
  "riskReminder": "投资有风险，入市需谨慎。",
  "tags": [],
  "complianceChecklist": []
}`,
    antiHomogeneity: {
      neverUse: ["宝子", "室友们谁懂", "宿舍夜聊", "家庭账本", "3:3:4分配", "别盲目跟风了", "一句话定义", "事实还原/反向视角"],
      neverSoundLike: ["campus_explorer:校园安利清单", "workplace_newcomer:文学散文", "sober_guard:批判反问", "family_planner:家庭规划", "concept_teacher:概念课", "hotspot_observer:新闻稿"],
      mandatoryMarkers: ["打工人", "具体时间感（那天/第N个月）", "我试过/说个丢人的"],
    },
    lengthGuide: { short: "300-400字，1个时间点+1个方法", medium: "450-550字，2个时间点对比", long: "650-800字，完整转变弧线" },
    acceptance: [
      "是否有明确时间标记（发工资那天/三个月后/上周四）？",
      "是否是日记叙事而非emoji要点清单？",
      "是否避免了宝子/室友/宿舍等校园词？",
      "是否包含至少一处「我试过/踩坑」第一手叙述？",
      "是否不像概念课或新闻解读？",
    ],
  },

  workplace_newcomer: {
    contentArchetype: "literary_scene_diary",
    contentArchetypeLabel: "文学化生活叙事（无分段标记）",
    outputSchemaHint: `{
  "persona": "职场新人·攒钱日记",
  "personaId": "workplace_newcomer",
  "contentArchetype": "literary_scene_diary",
  "sceneType": "发工资日|月底复盘|通勤|午休|消费后反思",
  "titleOptions": [{ "text": "≤15字无营销感", "type": "场景型|感受型|反转型" }],
  "opening": "一个具体瞬间，≤3句",
  "body": "连续叙事段落，禁止emoji小标题和首先其次",
  "naturalInsertion": { "productName": "", "sceneContext": "叙事中自然出现", "whyNatural": "" },
  "personalityMarkers": { "imperfectMoment": "还没做好的一处", "colloquialExpression": "口语标记" },
  "imageTextSuggestions": [{ "coverText": "≤12字", "style": "plog实拍风" }],
  "interactionGuide": "自然收尾",
  "riskReminder": "市场有风险，投资需谨慎。",
  "complianceChecklist": []
}`,
    antiHomogeneity: {
      neverUse: ["🎓💡📱分段", "💼📝✅分段", "宝子", "姐妹们", "checklist三条", "定义→类比", "事实还原", "家庭账本", "别XX了"],
      neverSoundLike: ["campus_explorer", "salary_diary:时间线emoji段", "sober_guard", "family_planner", "concept_teacher", "hotspot_observer"],
      mandatoryMarkers: ["第一人称场景化", "一处不完美细节", "无可见结构标记"],
    },
    lengthGuide: { short: "2-3段plog向", medium: "4-6段标准图文", long: "7-10段完整反思" },
    acceptance: [
      "全文是否无任何emoji分段标题？",
      "是否像普通人在记录而非博主授课？",
      "是否有具体场景动作感受支撑？",
      "产品是否仅为叙事配角？",
      "是否有一处不完美/还在试的细节？",
    ],
  },

  concept_teacher: {
    contentArchetype: "concept_lesson",
    contentArchetypeLabel: "概念翻译课（定义→类比→误解→边界）",
    outputSchemaHint: `{
  "persona": "理财教学博主",
  "personaId": "concept_teacher",
  "contentArchetype": "concept_lesson",
  "teachingTopic": "本篇唯一核心概念",
  "teachingMethod": {
    "plainDefinition": "日常语言一句定义",
    "analogy": "生活类比",
    "commonMisunderstanding": "最常见误解",
    "boundaryNote": "不能帮你做什么"
  },
  "titleOptions": [{ "text": "≤15字突出概念", "type": "概念反差|认知升级|场景提问" }],
  "opening": "概念误解或学习场景",
  "body": "流畅讲解，无首先其次标记",
  "teachingTools": [{ "productName": "", "teachingPurpose": "教学道具", "sceneContext": "" }],
  "riskReminder": "仅为概念科普，不构成投资建议。",
  "complianceChecklist": []
}`,
    antiHomogeneity: {
      neverUse: ["宝子/室友", "打工人日记", "别XX了", "热点新闻还原", "家庭比例", "emoji分段清单", "现在/最近/当下"],
      neverSoundLike: ["campus_explorer", "salary_diary", "workplace_newcomer", "sober_guard", "hotspot_observer", "family_planner"],
      mandatoryMarkers: ["定义+类比+误解三层", "边界声明", "教学道具式产品植入"],
    },
    lengthGuide: { short: "1个概念400-600字", medium: "1-2个关联概念600-1200字", long: "系统拆解1200-2000字" },
    acceptance: [
      "零基础读者能否搞懂这个概念？",
      "是否包含定义+类比+误解？",
      "类比是否来自生活而非金融？",
      "产品是否仅为教学道具？",
      "是否无时效词（现在/最近）？",
    ],
  },

  hotspot_observer: {
    contentArchetype: "news_observation",
    contentArchetypeLabel: "市场观察（事实→解读→反向→所以呢）",
    outputSchemaHint: `{
  "persona": "市场观察员",
  "personaId": "hotspot_observer",
  "contentArchetype": "news_observation",
  "eventSummary": { "what": "", "when": "", "source": "", "factOnly": "零观点事实" },
  "titleOptions": [{ "text": "≤15字观察视角", "type": "观察反思|事件还原|反向思考" }],
  "opening": "事件还原或困惑",
  "interpretation": "个人观点段，明确标注「我的理解」",
  "reversalPerspective": { "standpoint": "另一种可能", "reasoning": "理由" },
  "soWhat": "对读者意味着什么，通常持续观察",
  "informationTools": [{ "productName": "", "usageContext": "仅事实核查环节" }],
  "riskReminder": "个人观察，不构成投资建议。",
  "complianceChecklist": []
}`,
    antiHomogeneity: {
      neverUse: ["宝子", "别XX了", "checklist", "定义→类比教学", "宿舍场景", "家庭账本", "emoji分段", "突发/重磅"],
      neverSoundLike: ["campus_explorer", "salary_diary", "workplace_newcomer", "sober_guard:批判", "concept_teacher", "family_planner"],
      mandatoryMarkers: ["事实与观点分离", "独立反向视角段", "所以呢结论", "零走势预测"],
    },
    lengthGuide: { short: "1个信号400-600字", medium: "1-2信号含历史对照600-1000字", long: "完整热点拆解1000-1500字" },
    acceptance: [
      "是否先事实还原再给观点？",
      "反向视角是否独立且实质？",
      "是否零短期预测？",
      "产品是否仅在核查环节？",
      "结尾是否回答所以呢？",
    ],
  },

  sober_guard: {
    contentArchetype: "critical_contrast_checklist",
    contentArchetypeLabel: "清醒批判体（误区→对比→判断清单）",
    outputSchemaHint: `{
  "persona": "清醒搞钱女孩",
  "personaId": "sober_guard",
  "contentArchetype": "critical_contrast_checklist",
  "titleOptions": [{ "text": "≤20字含反差", "type": "别XX了型|清醒搞钱型|反常识型" }],
  "misconceptionExposure": "误区/焦虑曝光，可反问",
  "contrastPair": { "crowdBehavior": "跟风做法", "soberApproach": "清醒做法" },
  "judgmentChecklist": [
    { "item": "判断点1", "action": "可操作但不荐股" },
    { "item": "判断点2", "action": "" },
    { "item": "判断点3", "action": "" }
  ],
  "empowerClose": "鼓励建立自己判断",
  "productInsertion": { "style": "工具赋能冷静判断", "sceneContext": "" },
  "cta": "👉 微信搜腾讯微证券",
  "riskReminder": "投资有风险，入市需谨慎。",
  "complianceChecklist": []
}`,
    antiHomogeneity: {
      neverUse: ["宝子", "宿舍", "日记时间线", "文学散文", "概念定义课", "家庭比例框架", "新闻事实还原体"],
      neverSoundLike: ["campus_explorer", "salary_diary", "workplace_newcomer", "concept_teacher", "hotspot_observer", "family_planner"],
      mandatoryMarkers: ["开头别XX了或强反问", "一组别人vs清醒对比", "恰好3条判断checklist"],
    },
    lengthGuide: { short: "350-450字，1组对比+3条checklist", medium: "450-550字", long: "600-700字可加第二个误区" },
    acceptance: [
      "开头是否有「别XX了」或强反问？",
      "是否有一组别人跟风 vs 清醒做法对比？",
      "是否恰好3条判断checklist且不推荐具体标的？",
      "是否不像日记/概念课/新闻稿/家庭规划？",
      "批判是否未变成荐股？",
    ],
  },

  family_planner: {
    contentArchetype: "family_framework",
    contentArchetypeLabel: "家庭CFO框架体（痛点→比例→分阶段→风控）",
    outputSchemaHint: `{
  "persona": "家庭 CFO",
  "personaId": "family_planner",
  "contentArchetype": "family_framework",
  "titleOptions": [{ "text": "≤20字含数字感", "type": "家庭账本型|比例型|教育金型" }],
  "familyPainScene": "当妈/有老有小场景",
  "allocationFramework": { "name": "如3:3:4", "layers": [{ "bucket": "应急/教育/长期", "ratio": "", "horizon": "" }] },
  "phasedPlan": { "shortTerm": "", "midTerm": "", "longTerm": "" },
  "riskControls": ["风控要点"],
  "reassuranceClose": "安心总结，不刺激",
  "productInsertion": { "style": "家庭账本工具", "sceneContext": "全家适用" },
  "cta": "👉 微信搜腾讯微证券",
  "riskReminder": "投资有风险，入市需谨慎。",
  "complianceChecklist": []
}`,
    antiHomogeneity: {
      neverUse: ["宝子", "室友", "打工人通勤", "别XX了", "概念定义课", "新闻反向视角", "纯个人文艺叙事"],
      neverSoundLike: ["campus_explorer", "salary_diary", "workplace_newcomer", "sober_guard", "concept_teacher", "hotspot_observer"],
      mandatoryMarkers: ["我们家/孩子/父母", "至少一个分配比例或时间框架", "姐妹们口吻但稳重"],
    },
    lengthGuide: { short: "400字含1个框架", medium: "500-600字含三阶段", long: "700-900字含教育金+养老" },
    acceptance: [
      "是否出现家庭账本/教育金/我们家语境？",
      "是否有可理解的分配比例或时间框架？",
      "语气是否稳重安心而非焦虑煽动？",
      "是否不像校园/打工人日记/批判/概念课/新闻？",
      "是否未给具体买卖建议？",
    ],
  },
};

function extractWzqRules(system) {
  const rules = { personality: [], compliance: [], expression: [] };
  const blocks = system.split(/【([^】]+)】/);
  for (let i = 1; i < blocks.length; i += 2) {
    const title = blocks[i];
    const body = (blocks[i + 1] || "").trim();
    const lines = body.split("\n").map((l) => l.replace(/^[-\d.]+\s*/, "").trim()).filter(Boolean);
    if (title.includes("你是谁") || title.includes("怎么说话")) rules.personality.push(...lines);
    else if (title.includes("合规")) rules.compliance.push(...lines);
    else if (title.includes("标题") || title.includes("正文结构")) rules.expression.push(...lines);
  }
  return rules;
}

function antiBlock(spec) {
  const a = spec.antiHomogeneity;
  return `
【人设独占 - 严禁同质化】
- 本文 archetype：${spec.contentArchetypeLabel}
- 绝对禁止：${a.neverUse.join("；")}
- 禁止模仿：${a.neverSoundLike.join("；")}
- 必须出现：${a.mandatoryMarkers.join("；")}`;
}

for (const file of fs.readdirSync(STANDARDS).filter((f) => f.endsWith(".json"))) {
  const id = file.replace(".json", "");
  const spec = SPECS[id];
  if (!spec) continue;

  const p = JSON.parse(fs.readFileSync(path.join(STANDARDS, file), "utf8"));

  p.contentArchetype = spec.contentArchetype;
  p.contentArchetypeLabel = spec.contentArchetypeLabel;
  p.antiHomogeneity = spec.antiHomogeneity;
  p.rules = p.rules || {};
  p.rules.lengthGuide = spec.lengthGuide;

  if (WZQ_IDS.has(id)) {
    const extracted = extractWzqRules(p.prompts?.system || "");
    if (extracted.personality.length) p.rules.personality = extracted.personality;
    if (extracted.compliance.length) p.rules.compliance = extracted.compliance;
    if (extracted.expression.length) p.rules.expression = extracted.expression;
  }

  p.output = p.output || {};
  p.output.schemaHint = spec.outputSchemaHint;
  p.acceptance = spec.acceptance;

  const user = p.prompts?.content?.user || "";
  if (!user.includes("【人设独占")) {
    p.prompts.content.user = `${user}${antiBlock(spec)}\n\n只输出 JSON，严格遵循本人设 output.schemaHint 中的 archetype 结构。`;
  }

  const sys = p.prompts?.system || "";
  if (!sys.includes("contentArchetype")) {
    p.prompts.system = `${sys}\n\n【独占 archetype】${spec.contentArchetypeLabel}（${spec.contentArchetype}）\n与其他6个人设的正文骨架完全不同，禁止套用他们的分段方式。`;
  }

  fs.writeFileSync(path.join(STANDARDS, file), `${JSON.stringify(p, null, 2)}\n`, "utf8");
}

console.log("dehomogenized 7 personas");
