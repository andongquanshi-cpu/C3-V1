import type { BusinessLine, BriefInput, ContentType } from "@/lib/types";

export interface BusinessLineContentType {
  value: ContentType;
  label: string;
  description: string;
  needHotspot: boolean;
  recommended?: boolean;
  materialHint: string;
}

export interface TargetUserSegment {
  id: string;
  label: string;
  description: string;
  /** 对齐 personas/audiences.json */
  audienceId?: string;
  /** 对齐 KB L4 检索名 */
  kbMatchName?: string;
  offerFocus?: "fixed-income-plus" | "equity-mixed" | "account-opening" | "general";
}

export interface BusinessLinePreset {
  id: BusinessLine;
  label: string;
  shortLabel: string;
  brandName: string;
  productIntro: string;
  positioning: string;
  promotionBackground: string;
  campaignGoal: string;
  campaignGoalAds: string;
  defaultContentType: ContentType;
  defaultTopic: string;
  defaultTargetUser: string;
  targetUserSegments: TargetUserSegment[];
  targetUserOptions: string[];
  platformSellingPoints: string[];
  contentTypes: BusinessLineContentType[];
}

const WEISEC_CONTENT_TYPES: BusinessLineContentType[] = [
  {
    value: "brand-seed",
    label: "品牌种草类",
    description: "微证券小程序：免下载、微信内开户交易盯盘，强调「新手首选炒股工具」认知。",
    needHotspot: false,
    recommended: true,
    materialHint: "可不填素材；补充用户洞察或竞品摘要有助于细化种草角度。",
  },
  {
    value: "stock-tutorial",
    label: "看盘入门类",
    description: "看盘、盯盘、术语与公开信息阅读，服务想入门炒股但未开户用户。",
    needHotspot: false,
    materialHint: "可不填素材；可粘贴用户常见疑问或术语列表。",
  },
  {
    value: "hotspot-analysis",
    label: "热点分析类",
    description: "行情、政策、公告降维解读，配合热股榜单与问元宝等信息整理场景。",
    needHotspot: true,
    materialHint: "建议补充热点素材：可搜索或粘贴新闻、公告摘要。",
  },
  {
    value: "personal-exp",
    label: "个人经验类",
    description: "办公通勤、午休盯盘、微信群聊分享行情等碎片化使用场景。",
    needHotspot: false,
    materialHint: "可不填素材；真实场景描述会让口吻更自然。",
  },
];

const LICAITONG_CONTENT_TYPES: BusinessLineContentType[] = [
  {
    value: "finance-tips",
    label: "理财干货类",
    description: "固收+稳健配置、股混认知、风险等级与选基框架，先风险后收益。",
    needHotspot: false,
    recommended: true,
    materialHint: "可不填素材；可粘贴新手常见误区或术语疑问。",
  },
  {
    value: "brand-seed",
    label: "品牌种草类",
    description: "理财通官方平台、微信内买基金、自选涨跌提醒、零钱转入等入口体验。",
    needHotspot: false,
    materialHint: "可不填素材；生活场景（工资到账、家庭配置）有助于种草表达。",
  },
  {
    value: "personal-exp",
    label: "个人经验类",
    description: "工资理财、家庭账本、商户/白领闲钱管理等真实生活记录。",
    needHotspot: false,
    materialHint: "可不填素材；个人场景片段可提升可信度。",
  },
  {
    value: "stock-tutorial",
    label: "理财入门教程",
    description: "基金术语、风险等级、流动性与常见误解，面向跃跃入市新人。",
    needHotspot: false,
    materialHint: "可不填素材；一个具体术语或误解案例即可作为主题切入点。",
  },
];

export const BUSINESS_LINE_PRESETS: Record<BusinessLine, BusinessLinePreset> = {
  weisec: {
    id: "weisec",
    label: "腾讯微证券",
    shortLabel: "微证券",
    brandName: "腾讯微证券",
    productIntro:
      "腾讯官方出品的第三方证券服务平台小程序，合作持牌券商，依托微信生态提供行情资讯、异动提醒、便捷开户交易及 AI 智能炒股辅助服务。",
    positioning: "新手首选的轻量炒股信息与工具入口，敏捷、清醒、不带节奏",
    promotionBackground:
      "2026 年 A 股市场持续活跃，每年大量新投资者入市。微证券希望抓住市场红利期，以内容与广告多触点获取增量用户，扩大新用户规模。",
    campaignGoal: "内容营销：提升「新手首选炒股工具」认知，引导用户微信搜索体验并转化为开户用户",
    campaignGoalAds: "效果广告：吸引用户开户",
    defaultContentType: "brand-seed",
    defaultTopic: "上班族如何在微信里轻量盯盘，而不影响工作效率",
    defaultTargetUser: "入门新股民",
    targetUserSegments: [
      {
        id: "ws_audience_001",
        label: "入门新股民",
        audienceId: "ws_audience_001",
        kbMatchName: "微信内轻量入门型新股民",
        description:
          "23-35 岁白领/学生，尚未开户，想入门炒股；怕术语多、界面复杂，偏好微信里轻量看看。",
        offerFocus: "account-opening",
      },
      {
        id: "ws_audience_002",
        label: "忙碌热点上班族",
        audienceId: "ws_audience_002",
        kbMatchName: "忙碌热点跟进型上班族",
        description:
          "上班通勤碎片时间盯盘，又要跟热点；依赖提醒、榜单、问元宝等信息整理，不想多装 App。",
        offerFocus: "general",
      },
      {
        id: "ws_audience_003",
        label: "清醒避坑型",
        audienceId: "ws_audience_003",
        kbMatchName: "清醒避坑型年轻女性",
        description:
          "有初步理财意识，反感焦虑营销；想要冷静拆解、少跟风，建立自己的判断框架。",
        offerFocus: "general",
      },
    ],
    targetUserOptions: [],
    platformSellingPoints: [
      "界面简洁清晰，新手更易上手",
      "微信消息提醒：早报午报晚报、股价异动推送",
      "问元宝一键理解涨跌原因（信息辅助，非买卖信号）",
      "微信小程序免下载，开户交易盯盘一体化",
      "微信热股榜单、投资 Top 榜辅助发现公开信息",
      "办公/通勤碎片时间、微信群聊场景可快速查看与分享",
    ],
    contentTypes: WEISEC_CONTENT_TYPES,
  },
  licaitong: {
    id: "licaitong",
    label: "腾讯理财通",
    shortLabel: "理财通",
    brandName: "腾讯理财通",
    productIntro:
      "腾讯官方理财平台，超 2 亿用户，微信内即可理财买基金，零钱/零钱通可转入，资金流转灵活。",
    positioning: "可靠、清楚、克制的日常理财助手，家庭与白领闲钱配置入口",
    promotionBackground:
      "面向有理财需求的微信用户，通过效果广告获取申购转化，通过内容营销提升平台认知与搜索体验。",
    campaignGoal: "内容营销：提升平台认知，引导用户微信搜索体验并转化为申购用户",
    campaignGoalAds: "效果广告：吸引新用户申购",
    defaultContentType: "finance-tips",
    defaultTopic: "微信理财通里，白领如何比较固收+产品与查看风险等级",
    defaultTargetUser: "职场储蓄入门者",
    targetUserSegments: [
      {
        id: "lct_audience_001",
        label: "职场储蓄入门者",
        audienceId: "lct_audience_001",
        kbMatchName: "职场储蓄入门者",
        description:
          "刚工作、工资想存住；跃跃入市、不懂术语怕踩坑，适合入门教程与轻量种草。",
        offerFocus: "general",
      },
      {
        id: "lct_audience_002",
        label: "家庭稳健规划者",
        audienceId: "lct_audience_002",
        kbMatchName: "家庭稳健规划者",
        description:
          "有家庭责任，关注教育金/备用金；白领闲钱、商户稳健配置，固收+主场景。",
        offerFocus: "fixed-income-plus",
      },
      {
        id: "lct_equity_mixed",
        label: "股混进取基民",
        kbMatchName: "股混进取基民",
        description:
          "有一定经验与抗风险能力，来自竞品平台或想配置股混；内容偏认知与平台能力，不承诺收益。",
        offerFocus: "equity-mixed",
      },
    ],
    targetUserOptions: [],
    platformSellingPoints: [
      "腾讯官方平台，超 2 亿用户，安全可靠",
      "微信内理财/买基金，无需下载 App",
      "零钱/零钱通可转入，支持微信支付，资金流转灵活",
      "基金覆盖全，自选后微信内可关注涨跌",
      "费率相对银行更有优势，定期免申购费等权益",
      "固收+：严选好产品、多元资产配置、AI 陪伴（内容表达需合规，不承诺收益）",
    ],
    contentTypes: LICAITONG_CONTENT_TYPES,
  },
};

// 派生 targetUserOptions
for (const preset of Object.values(BUSINESS_LINE_PRESETS)) {
  preset.targetUserOptions = preset.targetUserSegments.map((item) => item.label);
}

export function getBusinessLinePreset(line?: BusinessLine) {
  return BUSINESS_LINE_PRESETS[line || "weisec"];
}

export function getTargetUserSegment(line: BusinessLine, label: string) {
  return getBusinessLinePreset(line).targetUserSegments.find((item) => item.label === label);
}

/** Brief 里用短标签，检索 KB 时用 personas / L4 全名 */
export function resolveKbTargetUser(line: BusinessLine, label: string) {
  const segment = getTargetUserSegment(line, label);
  return segment?.kbMatchName || label;
}

export function getContentTypesForLine(line?: BusinessLine) {
  return getBusinessLinePreset(line).contentTypes;
}

export function getContentTypeConfig(line: BusinessLine, contentType: ContentType) {
  return getContentTypesForLine(line).find((item) => item.value === contentType);
}

export function getContentTypeLabel(line: BusinessLine, contentType: ContentType) {
  return getContentTypeConfig(line, contentType)?.label || contentType;
}

export function isContentTypeAllowed(line: BusinessLine, contentType: ContentType) {
  return getContentTypesForLine(line).some((item) => item.value === contentType);
}

export function normalizeBusinessLine(value: unknown): BusinessLine {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "licaitong" || raw === "lct" || raw === "理财通") return "licaitong";
  return "weisec";
}

export function featureMatchesBusinessLine(feature: { businessLine?: string }, line: BusinessLine) {
  const featureLine = String(feature.businessLine || "all").toLowerCase();
  return featureLine === "all" || featureLine === line;
}

export function applyBusinessLineToBrief(brief: BriefInput, line: BusinessLine): BriefInput {
  const preset = getBusinessLinePreset(line);
  return {
    ...brief,
    businessLine: line,
    contentType: preset.defaultContentType,
    topic: preset.defaultTopic,
    targetUser: preset.defaultTargetUser,
    campaignGoal: preset.campaignGoal,
    selectedFeatureIds: [],
    selectedFeatureNames: [],
  };
}

export function normalizeBriefForBusinessLine(brief: BriefInput): BriefInput {
  const line = normalizeBusinessLine(brief.businessLine);
  const preset = getBusinessLinePreset(line);
  const contentType = isContentTypeAllowed(line, brief.contentType) ? brief.contentType : preset.defaultContentType;
  return {
    ...brief,
    businessLine: line,
    contentType,
    targetUser: preset.targetUserOptions.includes(brief.targetUser) ? brief.targetUser : preset.defaultTargetUser,
  };
}
