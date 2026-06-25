#!/usr/bin/env node
/**
 * Build ai-knowledge-base-v3.3 from docs/knowledgebase source markdown.
 * Run: node scripts/build-knowledge-base.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs", "knowledgebase");
const OUT = path.join(ROOT, "ai-knowledge-base-v3.3");
const V32 = path.join(ROOT, "ai-knowledge-base-v3.2");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeJson(fileName, data) {
  fs.writeFileSync(path.join(OUT, fileName), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function extractCodeBlocks(content, lang) {
  const re = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```", "g");
  const blocks = [];
  let m;
  while ((m = re.exec(content)) !== null) blocks.push(m[1].trim());
  return blocks;
}

function parseMdListBlock(block) {
  return block
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parseSimpleYaml(yaml) {
  const result = {};
  let currentKey = null;
  let currentList = null;
  for (const raw of yaml.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (!currentList) currentList = [];
      currentList.push(listMatch[1].trim());
      result[currentKey] = currentList;
      continue;
    }
    const kv = line.match(/^([\w_]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      currentList = null;
      const val = kv[2].trim();
      if (val) result[currentKey] = val.replace(/^["']|["']$/g, "");
      else result[currentKey] = [];
    } else if (line.match(/^\s+\w+:/)) {
      const nested = line.match(/^\s+(\w+):\s*(.*)$/);
      if (nested && currentKey) {
        if (!result[currentKey] || typeof result[currentKey] !== "object" || Array.isArray(result[currentKey])) {
          result[currentKey] = {};
        }
        result[currentKey][nested[1]] = nested[2].trim();
      }
    }
  }
  return result;
}

function parseKbEntries(md, knowledgeType) {
  const entries = [];
  const normalized = md.replace(/\r\n/g, "\n");
  const parts = normalized.split(/\n---\n/);
  for (const part of parts) {
    const titleMatch = part.match(/^##\s+(.+)/m);
    if (!titleMatch) continue;
    const meta = {};
    for (const line of part.split("\n")) {
      const m = line.match(/^-\s+(\w+):\s*(?:`([^`]+)`|(.+))\s*$/);
      if (m) meta[m[1]] = (m[2] || m[3] || "").trim();
    }
    if (!meta.id) continue;
    const getSection = (n) => {
      const re = new RegExp(`### ${n}\\. [^\\n]+\\n([\\s\\S]*?)(?=\\n### |\\n---|$)`);
      const m = part.match(re);
      return m ? m[1].trim() : "";
    };
    const desc = getSection(1);
    const safeBlock = getSection(2);
    const forbiddenBlock = getSection(3);
    const scenesBlock = getSection(4);
    const summarySection = getSection(5);
    const summaryMatch = summarySection.match(/(?:可供 Prompt 调用的摘要)?\s*\n+([\s\S]+)/);
    const bulletField = (text, key) => {
      const re = new RegExp(`- ${key}:\\n([\\s\\S]*?)(?=\\n- [^\\s]|$)`);
      const m = text.match(re);
      if (!m) return [];
      return m[1].split("\n").map((l) => l.replace(/^\s+-\s*/, "").trim()).filter(Boolean);
    };
    const scalarField = (text, key) => {
      const m = text.match(new RegExp(`- ${key}:\\s*(.+)`));
      return m ? m[1].trim() : "";
    };
    entries.push({
      id: meta.id,
      businessLine: meta.businessLine,
      knowledgeType,
      name: titleMatch[1].trim(),
      priority: meta.priority || "Medium",
      applicablePersonas: (meta.applicablePersonas || "").split("、").map((s) => s.trim()).filter(Boolean),
      applicableContentTypes: (meta.applicableContentTypes || "").split("、").map((s) => s.trim()).filter(Boolean),
      description: desc.replace(/^这类用户[\s\S]*?\n\n/, "").split("\n").filter((l) => l.trim() && !l.startsWith("- ")).join(" ").slice(0, 500),
      ageStage: scalarField(desc, "年龄/阶段"),
      occupation: scalarField(desc, "职业/身份"),
      painPoints: bulletField(desc, "典型痛点"),
      infoHabits: bulletField(desc, "信息获取习惯"),
      primaryColors: scalarField(desc, "主色调"),
      coreElements: scalarField(desc, "核心元素"),
      styleKeywords: scalarField(desc, "风格关键词"),
      forbiddenVisuals: scalarField(desc, "禁止视觉"),
      safeExpressions: parseMdListBlock(safeBlock),
      forbiddenExpressions: parseMdListBlock(forbiddenBlock),
      applicableScenes: parseMdListBlock(scenesBlock),
      promptSummary: summaryMatch ? summaryMatch[1].trim() : "",
      source: meta.source || "",
    });
  }
  return entries;
}

function parseBrandVoiceMd(filePath, businessLine, id) {
  const content = read(filePath);
  const positioning = content.match(/\*\*一句话定位\*\*[：:]\s*(.+)/)?.[1]?.trim() || "";
  const brand = content.match(/^product:\s*(.+)$/m)?.[1]?.trim() || (businessLine === "licaitong" ? "腾讯理财通" : "腾讯微证券");
  const role = content.match(/## 1\. 品牌角色\n\n[\s\S]*?\*\*(.+?)\*\*/)?.[1] || "";
  const recommended = content.match(/### 推荐词\n\n(.+)/)?.[1]?.split(/[、,]/).map((s) => s.trim()).filter(Boolean) || [];
  const forbidden = content.match(/### 禁用词\n\n(.+)/)?.[1]?.split(/[、,]/).map((s) => s.trim()).filter(Boolean) || [];
  const conversionPaths =
    businessLine === "licaitong"
      ? ["微信 → 我 → 服务 → 理财通", "具体费率和交易规则以产品页面及法律文件为准"]
      : ["微信搜索腾讯微证券进入官方小程序", "具体功能、服务和活动规则以官方页面展示为准"];
  const riskReminders = ["市场有风险，投资需谨慎。", "本文仅作学习和信息整理参考，不构成投资建议。"];
  const imageGuidelines =
    businessLine === "licaitong"
      ? ["封面突出生活理财场景，避免暴富和强交易感", "使用暖色、账本、存钱罐等生活物件", "不得使用收益承诺表达"]
      : ["封面突出轻量信息场景，避免荐股和暴涨暗示", "使用办公桌、通勤、提醒卡片等元素", "不得展示具体股票代码和收益截图"];
  const recommendedTone = [];
  if (businessLine === "licaitong") {
    recommendedTone.push(
      "生活场景 → 用户困惑 → 判断框架 → 平台操作 → 风险提醒",
      "先讲风险与流动性，再讲收益",
      "不替用户做决定，不制造收益幻想",
    );
  } else {
    recommendedTone.push(
      "市场或生活场景 → 信息问题 → 工具用法 → 核验步骤 → 风险边界",
      "把功能写成信息整理和学习辅助，不写成收益工具",
      "榜单和 AI 不等于荐股或买卖信号",
    );
  }
  return {
    id,
    businessLine,
    brand,
    positioning: positioning || role,
    brandRole: role,
    recommendedTone,
    standardConversionPaths: conversionPaths,
    requiredRiskReminders: riskReminders,
    preferredProductExpressions: recommended.slice(0, 12),
    avoidExpressions: forbidden,
    imageAndCoverGuidelines: imageGuidelines,
    xiaohongshuRules: {
      titleDo: content.match(/### 标题[\s\S]*?- 推荐[：:]([\s\S]*?)- 禁止/)?.[1]?.trim() || "",
      titleDont: content.match(/- 禁止[：:]([\s\S]*?)\n\n### 正文/)?.[1]?.trim() || "",
      bodyFlow: content.match(/### 正文\n\n(.+)/)?.[1]?.trim() || "",
    },
    lastVerified: content.match(/last_verified:\s*(\S+)/)?.[1] || "2026-06-22",
  };
}

function buildLctProductFeatures() {
  return [
    {
      id: "feature_lct_product_browse",
      businessLine: "licaitong",
      name: "产品浏览与筛选",
      summary: "在微信理财通内浏览基金及其他理财产品，按类型、风险等级、期限等公开信息比较和查看详情。",
      aliases: ["理财通入口", "产品筛选", "风险等级查看"],
      suitableContentTypes: ["brand-seed", "finance-tips", "stock-tutorial", "scenario-seeding"],
      suitableUserSegments: ["理财新手", "职场储蓄入门者", "家庭稳健规划者", "轻量理财用户"],
      userPainPoints: ["产品多不知道怎么找", "不懂风险等级和期限", "不想再下载一个 App"],
      useCases: ["微信内进入理财通浏览产品", "比较风险等级和期限", "购买前阅读产品详情和法律文件"],
      productActions: ["微信 → 我 → 服务 → 理财通", "按需求筛选产品", "查看风险揭示和交易规则"],
      safeClaims: ["先看风险、期限和用途，再挑产品", "买之前先认清产品管理人和规则", "日常用微信也能查看理财安排"],
      softInsertPhrases: [
        "如果只是想先了解有哪些选择，可以在微信里打开理财通看一看。",
        "我习惯先看风险等级和期限，再决定要不要继续了解。",
      ],
      strongInsertPhrases: ["理财通把挑选和管理理财产品放进了熟悉的微信场景里。"],
      forbiddenClaims: ["不得使用腾讯兜底、绝对安全", "不得把精选解释为低风险或保本"],
      riskNotes: ["基金及理财产品均有相应风险，须结合风险测评判断。"],
      priority: 92,
    },
    {
      id: "feature_lct_fund_trade",
      businessLine: "licaitong",
      name: "基金搜索购买与持有",
      summary: "搜索基金、完成申购并在持有页面查看持仓和交易记录，具体规则以产品页面为准。",
      aliases: ["买基金", "基金申购", "持仓查看"],
      suitableContentTypes: ["finance-tips", "stock-tutorial", "scenario-seeding"],
      suitableUserSegments: ["基金投资者", "理财新手", "职场储蓄入门者"],
      userPainPoints: ["不知道从哪里买基金", "看不懂申购赎回规则", "担心操作复杂"],
      useCases: ["搜索基金名称或代码", "完成风险测评后申购", "在持有页查看持仓和收益展示"],
      productActions: ["搜索基金进入详情页", "阅读费率和风险揭示", "在资产页查看持有结果"],
      safeClaims: ["申购前须完成风险测评", "具体费率和规则以下单页面为准", "持有收益展示不代表未来表现"],
      softInsertPhrases: ["买之前我会先看懂赎回规则和费率，不急着下单。"],
      strongInsertPhrases: [],
      forbiddenClaims: ["不得承诺收益", "不得省略风险测评步骤"],
      riskNotes: ["历史收益不代表未来，选择需结合自身风险承受能力。"],
      priority: 88,
    },
    {
      id: "feature_lct_fund_watchlist",
      businessLine: "licaitong",
      name: "自选与净值关注",
      summary: "将关注的基金加入自选，集中查看净值或涨跌信息，用于跟踪不代表平台建议买入。",
      aliases: ["基金自选", "净值关注", "涨跌查看"],
      suitableContentTypes: ["finance-tips", "personal-exp", "scenario-seeding"],
      suitableUserSegments: ["基金投资者", "进阶基金用户", "家庭稳健规划者"],
      userPainPoints: ["想随时关注基金表现", "信息分散不好复盘"],
      useCases: ["把关注的基金放进自选", "集中查看净值变化", "定期复盘持有情况"],
      productActions: ["添加基金到自选", "在自选页查看公开净值信息"],
      safeClaims: ["自选用于持续跟踪，不代表买入建议", "净值更新频率以产品页面为准"],
      softInsertPhrases: ["把关注的基金放进自选，复盘会更集中。"],
      strongInsertPhrases: [],
      forbiddenClaims: ["不得把自选写成荐基"],
      riskNotes: ["净值波动是正常现象，不构成操作建议。"],
      priority: 80,
    },
    {
      id: "feature_lct_fund_sip",
      businessLine: "licaitong",
      name: "基金定投",
      summary: "对支持定投的基金设置金额和扣款周期，帮助形成纪律化投入习惯，不是收益保证。",
      aliases: ["定投", "自动扣款", "长期计划"],
      suitableContentTypes: ["finance-tips", "scenario-seeding", "brand-seed", "personal-exp"],
      suitableUserSegments: ["职场储蓄入门者", "理财新手", "家庭稳健规划者", "轻量理财用户"],
      userPainPoints: ["不擅长坚持投入", "总想等更好的点位", "工资到账后留不住钱"],
      useCases: ["设置固定金额和周期定投", "工资到账后自动转入", "建立长期储蓄习惯"],
      productActions: ["进入基金详情页选择定投", "设置金额、周期和支付方式", "定期检查计划"],
      safeClaims: ["定投解决的是怎么坚持，不是保证赚钱", "开始前要看清风险等级和费率", "并非所有产品均支持定投"],
      softInsertPhrases: [
        "对支持定投的基金，可以设置固定金额和周期，更像一个帮助坚持的工具。",
        "工资到账后先转一笔出来，比一上来追热点更踏实。",
      ],
      strongInsertPhrases: [],
      forbiddenClaims: ["不得说定投肯定赚钱", "不得说摊薄风险至无风险"],
      riskNotes: ["定投不能消除市场风险或保证盈利。"],
      priority: 90,
    },
    {
      id: "feature_lct_multi_asset",
      businessLine: "licaitong",
      name: "多元产品与配置",
      summary: "理财通提供不同资产类别和风险等级的产品选择，支持按目标和风险承受力做搭配，不是保本稳赚。",
      aliases: ["资产配置", "多元产品", "固收+"],
      suitableContentTypes: ["finance-tips", "scenario-seeding"],
      suitableUserSegments: ["家庭稳健规划者", "进阶基金用户", "稳健型用户"],
      userPainPoints: ["希望配置更均衡", "不知道不同产品承担什么角色"],
      useCases: ["按用途分开资金", "比较不同风险等级产品", "建立家庭资金分层安排"],
      productActions: ["浏览不同品类产品", "比较流动性、风险等级和规则"],
      safeClaims: ["从单押一个方向变成按目标和风险承受力搭配", "不把配置描述为保本或稳赚"],
      softInsertPhrases: ["选理财产品不只看历史收益，先把资金按用途分开更重要。"],
      strongInsertPhrases: [],
      forbiddenClaims: ["不得把固收+解释为低风险或保本", "不得复用未核验的目标收益数字"],
      riskNotes: ["具体产品策略和风险等级以产品资料为准。"],
      priority: 78,
    },
  ];
}

function buildWzqProductFeatures() {
  const v32 = JSON.parse(read(path.join(V32, "product-features.json")));
  return v32.items.map((item) => ({
    ...item,
    businessLine: "weisec",
  }));
}

function buildWzqExtraFeatures() {
  return [
    {
      id: "feature_wzq_broker_account",
      businessLine: "weisec",
      name: "合作券商开户",
      summary: "微证券连接合作券商提供开户入口，账户由券商提供和管理，须核对佣金标准和协议。",
      aliases: ["开户", "合作券商", "证券账户"],
      suitableContentTypes: ["brand-seed", "tool-review", "scenario-seeding", "stock-tutorial"],
      suitableUserSegments: ["潜在开户用户", "投资小白", "微信高频用户"],
      userPainPoints: ["不清楚如何开户", "担心佣金和流程复杂"],
      useCases: ["了解开户条件和流程", "确认合作券商和佣金说明", "完成线上身份核验"],
      productActions: ["进入开户或合作券商服务入口", "确认券商名称和协议", "按页面完成核验和测评"],
      safeClaims: ["先看清是哪家券商、佣金标准和协议，再提交开户", "账户由合作券商提供，微证券不是账户管理主体"],
      softInsertPhrases: ["从微证券进入开户流程时，第一步是确认实际开户券商和费用说明。"],
      strongInsertPhrases: [],
      forbiddenClaims: ["不得写未经核验的统一佣金", "不得把微证券称为证券公司"],
      riskNotes: ["开户和交易涉及风险，须独立判断。"],
      priority: 87,
    },
  ];
}

function parseContentTemplates() {
  const content = read(path.join(DOCS, "content_template_小红书金融图文内容模板库(1).md"));
  const yamlBlocks = extractCodeBlocks(content, "yaml");
  const userContentTypes = {
    "USER-01": ["finance-tips", "stock-tutorial", "brand-seed"],
    "USER-02": ["personal-exp", "scenario-seeding", "finance-tips"],
    "USER-03": ["finance-tips", "scenario-seeding"],
    "USER-04": ["finance-tips", "stock-tutorial"],
    "USER-05": ["stock-tutorial", "hotspot-analysis", "tool-review"],
    "USER-06": ["personal-exp", "finance-tips", "scenario-seeding"],
  };
  const userSegments = {
    "USER-01": ["理财小白", "投资小白", "轻量理财用户"],
    "USER-02": ["职场储蓄入门者", "忙碌上班族", "职场新人"],
    "USER-03": ["家庭稳健规划者", "稳健型用户", "轻量理财用户"],
    "USER-04": ["进阶基金用户", "基金投资者"],
    "USER-05": ["投资小白", "股票新手", "微信内轻量入门型新股民"],
    "USER-06": ["家庭稳健规划者", "有娃家庭", "家庭资产规划型用户"],
  };
  return yamlBlocks
    .map((block) => parseSimpleYaml(block))
    .filter((y) => y.template_id)
    .map((y) => {
      const id = String(y.template_id).toLowerCase().replace(/_/g, "-");
      const pageStructure = y.page_structure || {};
      const bodyStructure = Object.keys(pageStructure)
        .sort()
        .map((k) => `${k}: ${pageStructure[k]}`);
      const isProduct = id.startsWith("product-");
      return {
        id,
        templateId: y.template_id,
        name: y.title || y.user_group || y.product_category || id,
        businessLine: isProduct || ["USER-05", "USER-07", "PRODUCT-07"].includes(y.template_id) ? "all" : "licaitong",
        bestForContentTypes: userContentTypes[y.template_id] || ["finance-tips", "stock-tutorial", "hotspot-analysis"],
        suitableUserSegments: userSegments[y.template_id] || [y.user_group || "投资小白"],
        emotionalHook: [],
        bodyStructure: bodyStructure.length ? bodyStructure : ["痛点共鸣", "场景代入", "方法拆解", "工具承接", "风险提示", "轻 CTA"],
        recommendedInsertPosition: ["方案段落", "工具承接页", "结尾风险提示前"],
        titlePatterns: y.title ? [y.title] : [],
        coverTextPatterns: bodyStructure[0] ? [String(bodyStructure[0]).replace(/^P1:\s*封面[：:]\s*/, "").slice(0, 20)] : [],
        interactionGuidePatterns: toArray(y.cta).slice(0, 2),
        bodyCopy: toArray(y.body_copy),
        riskNotes: ["不得出现收益承诺", "不得诱导具体买卖", "必须包含风险提示"],
        priority: id.startsWith("user-") ? 80 : 70,
      };
    });
}

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function parsePhraseSubsection(section, heading) {
  const re = new RegExp(`### ${heading}\\s*\\n+\\\`\\\`\\\`md\\s*\\n([\\s\\S]*?)\\\`\\\`\\\``, "m");
  const m = section.match(re);
  if (!m) return [];
  return m[1].split("\n").map((l) => l.trim()).filter(Boolean);
}

function parsePhraseLibrary() {
  const content = read(path.join(DOCS, "phrase_library_小红书金融图文推荐用语库(1).md"));
  const sectionDefs = [
    { num: "2.1", id: "phrases-user-01", contentType: "finance-tips", userGroup: "理财小白" },
    { num: "2.2", id: "phrases-user-02", contentType: "personal-exp", userGroup: "工资管理型用户" },
    { num: "2.3", id: "phrases-user-03", contentType: "finance-tips", userGroup: "稳健型用户" },
    { num: "2.4", id: "phrases-user-04", contentType: "finance-tips", userGroup: "进阶基金用户" },
    { num: "2.5", id: "phrases-user-05", contentType: "stock-tutorial", userGroup: "股票新手" },
    { num: "2.6", id: "phrases-user-06", contentType: "personal-exp", userGroup: "家庭资产规划" },
  ];
  const items = sectionDefs.map(({ num, id, contentType, userGroup }) => {
    const re = new RegExp(`## ${num}[^#]+([\\s\\S]*?)(?=\\n## |$)`);
    const section = content.match(re)?.[1] || "";
    return {
      id,
      templateId: `USER-0${num.split(".")[1]}`,
      contentType,
      userGroup,
      businessLine: num === "2.5" ? "weisec" : num === "2.6" ? "all" : "licaitong",
      safeOpeningHooks: parsePhraseSubsection(section, "开头钩子").slice(0, 6),
      painPointPhrases: parsePhraseSubsection(section, "核心痛点").slice(0, 6),
      solutionPhrases: parsePhraseSubsection(section, "方法论句库").slice(0, 6),
      conversionPhrases: parsePhraseSubsection(section, "轻 CTA 句库").slice(0, 4),
      riskReminderPhrases: parsePhraseSubsection(section, "风险提示句库").slice(0, 4),
      titlePhrases: parsePhraseSubsection(section, "标题库").slice(0, 8),
      coverPhrases: parsePhraseSubsection(section, "封面短句库").slice(0, 6),
      phrasesToAvoid: [
        ...parsePhraseSubsection(section, "不适合直接推的内容"),
        "稳赚",
        "保本",
        "必涨",
        "闭眼买",
        "私信领取",
      ].slice(0, 12),
    };
  });

  const generalSection = content.match(/# 5\. 通用[\s\S]*$/)?.[0] || "";
  items.push({
    id: "phrases-general",
    templateId: "GENERAL",
    contentType: "brand-seed",
    userGroup: "通用",
    businessLine: "all",
    safeOpeningHooks: parsePhraseSubsection(generalSection, "5.5 开头钩子库").slice(0, 6),
    painPointPhrases: parsePhraseSubsection(generalSection, "5.6 用户共鸣句库").slice(0, 6),
    solutionPhrases: parsePhraseSubsection(generalSection, "5.7 方法论句库").slice(0, 6),
    conversionPhrases: parsePhraseSubsection(generalSection, "5.9 轻 CTA 句库").slice(0, 4),
    riskReminderPhrases: parsePhraseSubsection(generalSection, "5.8 风险提示句库").slice(0, 6),
    titlePhrases: parsePhraseSubsection(generalSection, "5.1 标题开头词库").slice(0, 6),
    coverPhrases: [],
    phrasesToAvoid: parsePhraseSubsection(generalSection, "5.10 禁用词与替代表达").slice(0, 15),
  });

  const wzqSection = content.match(/## 3\.7[\s\S]*?(?=## 3\.8|$)/)?.[0] || "";
  items.push({
    id: "phrases-product-07",
    templateId: "PRODUCT-07",
    contentType: "stock-tutorial",
    userGroup: "股票新手",
    businessLine: "weisec",
    safeOpeningHooks: parsePhraseSubsection(wzqSection, "开头钩子").slice(0, 6),
    painPointPhrases: parsePhraseSubsection(wzqSection, "核心痛点").slice(0, 6),
    solutionPhrases: parsePhraseSubsection(wzqSection, "方法论句库").slice(0, 6),
    conversionPhrases: parsePhraseSubsection(wzqSection, "轻 CTA 句库").slice(0, 4),
    riskReminderPhrases: parsePhraseSubsection(wzqSection, "风险提示句库").slice(0, 4),
    titlePhrases: parsePhraseSubsection(wzqSection, "标题库").slice(0, 6),
    coverPhrases: parsePhraseSubsection(wzqSection, "封面短句库").slice(0, 6),
    phrasesToAvoid: ["必涨", "荐股", "内幕", "跟买", "私信领取", "扣1私你"],
  });

  return items.filter((i) => i.safeOpeningHooks.length || i.painPointPhrases.length || i.titlePhrases.length);
}

function buildRiskDisclaimers() {
  const content = read(path.join(DOCS, "risk_disclaimer.md"));
  const textBlocks = extractCodeBlocks(content, "text").map((b) => b.replace(/^⚠️\s*/, "").trim());
  const scenarios = [
    { id: "disclaimer_general", scenario: "general", businessLine: "all", appliesTo: ["all"], priority: 100 },
    { id: "disclaimer_fund", scenario: "fund", businessLine: "all", appliesTo: ["finance-tips", "stock-tutorial"], priority: 90 },
    { id: "disclaimer_wealth", scenario: "wealth", businessLine: "licaitong", appliesTo: ["finance-tips", "scenario-seeding"], priority: 88 },
    { id: "disclaimer_securities", scenario: "securities", businessLine: "weisec", appliesTo: ["stock-tutorial", "hotspot-analysis"], priority: 88 },
    { id: "disclaimer_content", scenario: "content", businessLine: "all", appliesTo: ["all"], priority: 85 },
  ];
  return {
    version: "3.3",
    source: "docs/knowledgebase/risk_disclaimer.md",
    globalRiskReminder: "市场有风险，投资需谨慎。",
    triggerKeywords: ["投资", "理财", "基金", "股票", "行情", "开户", "交易", "收益", "涨跌"],
    items: scenarios.map((s, i) => ({
      ...s,
      text: textBlocks[i] || textBlocks[0] || "市场有风险，投资需谨慎。本文仅作学习和信息整理参考，不构成投资建议。",
      required: s.id === "disclaimer_general",
    })),
    allTexts: textBlocks.slice(0, 20),
  };
}

function buildPlatformRules() {
  return {
    version: "3.3",
    source: "docs/knowledgebase/platform_rule.md",
    items: [
      {
        id: "platform_no_external_link",
        category: "外链引流",
        riskLevel: "high",
        description: "文案中不得包含外部链接、二维码、微信号、电话号码或网址域名。",
        forbiddenPatterns: ["http://", "https://", "www.", "加微信", "扫码", "点击链接"],
        safeAlternatives: ["微信搜索腾讯微证券或腾讯理财通进入官方入口", "查看主页介绍了解官方路径"],
        appliesTo: ["all"],
      },
      {
        id: "platform_no_inducement",
        category: "诱导互动",
        riskLevel: "high",
        description: "禁止用利益诱导点赞、收藏、关注或评论。",
        forbiddenPatterns: ["点赞就送", "关注后私信送", "评论666抽奖", "收藏领红包"],
        safeAlternatives: ["如果这篇对你有帮助，可以收藏方便以后查看", "欢迎在评论区分享你的学习心得"],
        appliesTo: ["all"],
      },
      {
        id: "platform_finance_content",
        category: "金融内容",
        riskLevel: "high",
        description: "金融类内容须避免收益承诺、具体标的推荐和未经核验的活动信息。",
        forbiddenPatterns: ["稳赚", "保本", "必涨", "荐股", "跟买"],
        safeAlternatives: ["仅作信息整理和学习参考", "不构成投资建议"],
        appliesTo: ["all"],
      },
      {
        id: "platform_image_format",
        category: "图片规范",
        riskLevel: "medium",
        description: "封面不宜使用具体股票代码、收益截图、持仓截图或强煽动视觉。",
        forbiddenPatterns: ["收益截图", "持仓截图", "暴涨", "抄底"],
        safeAlternatives: ["使用生活场景或信息卡片式封面", "3:4 比例小红书封面风"],
        appliesTo: ["cover", "image-text"],
      },
      {
        id: "platform_official_path_only",
        category: "官方路径",
        riskLevel: "high",
        description: "引导用户了解产品须使用官方路径，禁止私信领资料或扣1私你式导流。",
        forbiddenPatterns: ["私信领取", "扣1私你", "加群交流", "进群领"],
        safeAlternatives: ["微信搜索官方小程序了解", "通过官方页面查看功能和服务"],
        appliesTo: ["all"],
      },
    ],
  };
}

function buildAudiencesForPersonas(kbAudiences) {
  const existing = JSON.parse(read(path.join(ROOT, "personas", "audiences.json")));
  const baseAudiences = (existing.audiences || []).filter((a) => !a.kbId);
  const newAudiences = kbAudiences.map((a) => ({
    id: a.id.toLowerCase().replace(/^kb_/, "").replace(/_/g, "_"),
    name: a.name.split("｜").pop() || a.name,
    kbMatchName: a.name.split("｜").pop() || a.name,
    businessLine: a.businessLine,
    kbId: a.id,
    ageStage: a.ageStage,
    occupation: a.occupation,
    needs: a.painPoints,
    painPoints: a.painPoints,
    infoHabits: a.infoHabits,
    tone: a.promptSummary?.slice(0, 40) || "",
    safeExpressions: a.safeExpressions,
    forbiddenExpressions: a.forbiddenExpressions,
    promptSummary: a.promptSummary,
    suitablePersonas: mapPersonas(a.applicablePersonas),
    applicableContentTypes: a.applicableContentTypes,
  }));
  return {
    version: "2.1.0",
    description: "内容目标受众标准，已合并 docs/knowledgebase/audience_profile。",
    audiences: [...baseAudiences, ...newAudiences],
  };
}

function mapPersonas(labels) {
  const map = {
    职场新人: "peer_diary",
    理财小白: "concept_teacher",
    轻储蓄用户: "peer_diary",
    家庭规划者: "family_planner",
    稳健投资者: "family_planner",
    校园理财探索生: "peer_diary",
    打工人真实日记: "peer_diary",
    热点追踪型用户: "hotspot_observer",
    市场观察员: "hotspot_observer",
    清醒搞钱女孩: "sober_guard",
    进阶理财用户: "sober_guard",
  };
  const ids = labels.map((l) => map[l]).filter(Boolean);
  return [...new Set(ids)];
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const brandVoice = {
    version: "3.3",
    defaultBusinessLine: "weisec",
    items: [
      parseBrandVoiceMd(path.join(DOCS, "lct", "brand_voice.md"), "licaitong", "brand_voice_licaitong"),
      parseBrandVoiceMd(path.join(DOCS, "wzq", "brand_voice(1).md"), "weisec", "brand_voice_weisec"),
    ],
  };

  const productFeatures = {
    version: "3.3",
    source: "docs/knowledgebase lct+wzq product_feature + v3.2 weisec features",
    items: [...buildLctProductFeatures(), ...buildWzqProductFeatures(), ...buildWzqExtraFeatures()],
  };

  const contentTemplates = {
    version: "3.3",
    source: "docs/knowledgebase/content_template",
    items: parseContentTemplates(),
  };

  const phraseLibrary = {
    version: "3.3",
    source: "docs/knowledgebase/phrase_library",
    items: parsePhraseLibrary(),
  };

  const kbAudiences = parseKbEntries(read(path.join(DOCS, "audience_profile(3).md")), "audience_profile");
  const visualGuidelines = {
    version: "3.3",
    source: "docs/knowledgebase/visual_guideline",
    items: parseKbEntries(read(path.join(DOCS, "visual_guideline(3).md")), "visual_guideline"),
  };

  const complianceRules = JSON.parse(read(path.join(V32, "compliance-rules.json")));
  complianceRules.version = "3.3";
  complianceRules.source = "v3.2 + docs/knowledgebase compliance_rule/risk_disclaimer excerpts";

  const rewriteRules = JSON.parse(read(path.join(V32, "compliance-rewrite-rules.cleaned.json")));
  rewriteRules.version = "3.3";

  const riskDisclaimers = buildRiskDisclaimers();
  const platformRules = buildPlatformRules();

  const audiencesMerged = buildAudiencesForPersonas(kbAudiences);

  writeJson("brand-voice.json", brandVoice);
  writeJson("product-features.json", productFeatures);
  writeJson("content-templates.json", contentTemplates);
  writeJson("phrase-library.json", phraseLibrary);
  writeJson("compliance-rules.json", complianceRules);
  writeJson("compliance-rewrite-rules.cleaned.json", rewriteRules);
  writeJson("risk-disclaimers.json", riskDisclaimers);
  writeJson("platform-rules.json", platformRules);
  writeJson("visual-guidelines.json", visualGuidelines);
  writeJson("audience-profiles.json", { version: "3.3", items: kbAudiences });

  fs.writeFileSync(path.join(ROOT, "personas", "audiences.json"), `${JSON.stringify(audiencesMerged, null, 2)}\n`);

  writeJson(
    "index.json",
    {
      version: "3.3",
      name: "Tencent Licaitong & WeSec Xiaohongshu AI Knowledge Base",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceDocs: "docs/knowledgebase",
      files: {
        schema: "schema.json",
        brandVoice: "brand-voice.json",
        productFeatures: "product-features.json",
        contentTemplates: "content-templates.json",
        phraseLibrary: "phrase-library.json",
        complianceRules: "compliance-rules.json",
        cleanedComplianceRewriteRules: "compliance-rewrite-rules.cleaned.json",
        riskDisclaimers: "risk-disclaimers.json",
        platformRules: "platform-rules.json",
        visualGuidelines: "visual-guidelines.json",
        audienceProfiles: "audience-profiles.json",
      },
      recommendedPromptRetrieval: {
        contentGeneration: [
          "brandVoice by businessLine",
          "1-2 contentTemplates",
          "2-4 productFeatures",
          "1 phraseLibrary group",
          "required riskDisclaimers",
          "high risk complianceRules + platformRules summary",
        ],
        complianceReview: ["complianceRules", "rewriteRules", "riskDisclaimers", "platformRules", "brandVoice.avoidExpressions"],
        coverGeneration: ["visualGuidelines", "contentTemplates.coverTextPatterns", "platformRules.image", "complianceRules"],
      },
    },
  );

  writeJson("schema.json", {
    version: "3.3",
    language: "zh-CN",
    purpose: "Licaitong & WeSec Xiaohongshu content knowledge base for prompt retrieval.",
    commonFields: ["id", "businessLine", "knowledgeType", "priority", "applicableContentTypes", "promptSummary"],
    entities: {
      productFeature: { required: ["id", "businessLine", "name", "summary", "safeClaims", "forbiddenClaims", "priority"] },
      brandVoice: { required: ["id", "businessLine", "brand", "positioning", "avoidExpressions", "requiredRiskReminders"] },
      contentTemplate: { required: ["id", "name", "bodyStructure", "titlePatterns", "riskNotes"] },
      phraseGroup: { required: ["id", "contentType", "safeOpeningHooks", "phrasesToAvoid"] },
      complianceRule: { required: ["id", "riskType", "riskLevel", "forbiddenPatterns", "reviewAction"] },
      riskDisclaimer: { required: ["id", "text", "appliesTo"] },
      platformRule: { required: ["id", "category", "forbiddenPatterns", "safeAlternatives"] },
      visualGuideline: { required: ["id", "businessLine", "promptSummary", "safeExpressions", "forbiddenExpressions"] },
      audienceProfile: { required: ["id", "businessLine", "painPoints", "promptSummary"] },
    },
  });

  console.log("Built ai-knowledge-base-v3.3:");
  console.log("  product features:", productFeatures.items.length);
  console.log("  content templates:", contentTemplates.items.length);
  console.log("  phrase groups:", phraseLibrary.items.length);
  console.log("  visual guidelines:", visualGuidelines.items.length);
  console.log("  audience profiles:", kbAudiences.length);
  console.log("  personas audiences:", audiencesMerged.audiences.length);
}

main();
