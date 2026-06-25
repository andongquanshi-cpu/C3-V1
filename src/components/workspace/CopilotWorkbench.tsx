"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  FileText,
  ImageIcon,
  KeyRound,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, parseLLMJson, safeJsonParse } from "@/lib/utils";
import {
  applyBusinessLineToBrief,
  BUSINESS_LINE_PRESETS,
  featureMatchesBusinessLine,
  getBusinessLinePreset,
  getContentTypeConfig,
  getContentTypeLabel,
  getContentTypesForLine,
  getTargetUserSegment,
  normalizeBriefForBusinessLine,
  normalizeBusinessLine,
} from "@/lib/business-line";
import type {
  ApiConfig,
  BriefInput,
  BusinessLine,
  ComplianceReport,
  ContentType,
  CreativeAngle,
  Draft,
  GeneratedContent,
  KnowledgeListView,
  Material,
  ProductFeatureView,
} from "@/lib/types";

const STORAGE_KEYS = {
  api: "c3-v0-api-config",
  drafts: "c3-v0-drafts",
  materials: "c3-v0-materials",
  brief: "c3-v0-brief",
};

const DEFAULT_API_CONFIG: ApiConfig = {
  text: {
    key: "",
    apiUrl: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
  },
  image: {
    key: "",
    apiUrl: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
    model: "doubao-seedream-3.0-t2i",
    format: "volcengine",
  },
  hotspot: {
    key: "",
    apiUrl: "https://api.tavily.com/search",
  },
};

const DEFAULT_BRIEF: BriefInput = {
  businessLine: "weisec",
  contentType: "brand-seed",
  topic: "腾讯微证券小程序如何帮助投资小白做日常盯盘",
  targetUser: "入门新股民",
  campaignGoal: "内容营销：提升「新手首选炒股工具」认知，引导用户微信搜索体验并转化为开户用户",
  bloggerLevel: "middle",
  embedLevel: "medium",
  contentLength: "medium",
  generationMode: "image-text",
  generateCount: 2,
  customRequirement: "",
  selectedFeatureIds: [],
  selectedFeatureNames: [],
  materials: [],
};

const STEP_ITEMS = [
  { id: 1, label: "环境与 API", icon: KeyRound },
  { id: 2, label: "类型/素材", icon: Layers3 },
  { id: 3, label: "创意角度", icon: Sparkles },
  { id: 4, label: "内容生成", icon: FileText },
  { id: 5, label: "审核/草稿", icon: ShieldCheck },
];

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function asText(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function hasTextApi(apiConfig: ApiConfig) {
  return Boolean(apiConfig.text.key && apiConfig.text.apiUrl && apiConfig.text.model);
}

function buildDemoAngles(brief: BriefInput): CreativeAngle[] {
  const preset = getBusinessLinePreset(brief.businessLine);
  const type = getContentTypeLabel(brief.businessLine, brief.contentType);
  const isLicaitong = brief.businessLine === "licaitong";
  const demoAngles: CreativeAngle[] = isLicaitong
    ? [
        {
          angleId: "demo_angle_001",
          angleName: "发工资后的三步理财检查",
          angleType: "生活场景",
          coreIdea: `围绕“${brief.topic || type}”，用工资到账、周末复盘、月底回顾三个节点，说明新手如何先做风险判断再看产品信息。`,
          targetUser: brief.targetUser,
          emotionalHook: ["可执行", "低压力", "生活化"],
          userPainPoint: "想开始理财，但不知道先看风险等级还是先看收益。",
          contentStructure: "生活场景 -> 判断框架 -> 平台操作 -> 风险提醒",
          recommendedTemplateId: "scenario-seeding",
          recommendedFeatureIds: brief.selectedFeatureIds,
          productBridge: {
            painPoint: "产品多、术语多，容易只看收益",
            contentScene: "微信里比较风险等级和期限",
            productAction: `打开${preset.brandName}浏览产品详情和风险揭示`,
            softSentence: "我更把它当成信息整理入口，不是替你做购买决定。",
            complianceNote: "不承诺收益，不输出买卖建议。",
          },
          titleDirections: ["发工资后我会先看这 3 项", "新手选基金先别急着看收益", "微信里怎么比较理财产品"],
          coverDirection: "暖色生活场景封面，突出检查清单",
          riskLevel: "low",
          riskNotes: ["需要避免把产品浏览表达成收益改善。"],
        },
        {
          angleId: "demo_angle_002",
          angleName: "定投前先搞懂的三个问题",
          angleType: "干货教程",
          coreIdea: `把“${brief.topic || type}”拆成三个入门问题：这笔钱多久不用、能接受多大波动、是否看过法律文件。`,
          targetUser: brief.targetUser,
          emotionalHook: ["避坑", "框架", "克制"],
          userPainPoint: "看到别人推荐就想跟，缺少自己的判断框架。",
          contentStructure: "常见误区 -> 三个问题 -> 平台辅助 -> 保守结论",
          recommendedTemplateId: "beginner-guide",
          recommendedFeatureIds: brief.selectedFeatureIds,
          productBridge: {
            painPoint: "信息碎片化，容易只看标题",
            contentScene: "先查产品类型，再看风险等级和规则",
            productAction: `用${preset.brandName}做公开信息整理`,
            softSentence: "工具适合帮你把信息摆清楚，不适合替你做决定。",
            complianceNote: "加入标准风险提示。",
          },
          titleDirections: ["定投前我会先问自己", "理财新手别跳过这 3 步", "先搞懂风险再看产品"],
          coverDirection: "清单式封面，呈现三个问题",
          riskLevel: "low",
          riskNotes: ["避免具体产品推荐和确定性判断。"],
        },
      ]
    : [
        {
          angleId: "demo_angle_001",
          angleName: "把盯盘变成日常小习惯",
          angleType: "场景种草",
          coreIdea: `围绕“${brief.topic || type}”，用上班通勤、午休、收盘后复盘三个场景，说明用户如何降低信息遗漏焦虑。`,
          targetUser: brief.targetUser,
          emotionalHook: ["省心", "低门槛", "可复制"],
          userPainPoint: "想看市场变化，但没有整块时间打开复杂工具。",
          contentStructure: "痛点提问 -> 场景拆解 -> 工具动作 -> 风险提醒",
          recommendedTemplateId: "scenario-seeding",
          recommendedFeatureIds: brief.selectedFeatureIds,
          productBridge: {
            painPoint: "碎片化时间无法持续盯盘",
            contentScene: "微信里快速查看行情和提醒",
            productAction: `打开${preset.brandName}小程序查看自选和消息提醒`,
            softSentence: "我会把它当成日常信息看板，而不是交易指令。",
            complianceNote: "不承诺收益，不输出买卖建议。",
          },
          titleDirections: ["普通人盯盘不用太复杂", "我把行情查看做轻了", "投资小白的日常看盘法"],
          coverDirection: "简洁清单式封面，突出 3 个使用场景",
          riskLevel: "low",
          riskNotes: ["需要避免把工具使用结果表达成收益改善。"],
        },
        {
          angleId: "demo_angle_002",
          angleName: "从信息焦虑到决策前检查表",
          angleType: "干货教程",
          coreIdea: `把“${brief.topic || type}”拆成一个发布前可审核的财经内容检查表，强调信息整理、风险意识和工具辅助。`,
          targetUser: brief.targetUser,
          emotionalHook: ["避坑", "清单", "理性"],
          userPainPoint: "看到热点容易跟风，缺少一套先看信息再判断的流程。",
          contentStructure: "错误做法 -> 检查清单 -> 产品功能辅助 -> 保守结论",
          recommendedTemplateId: "beginner-guide",
          recommendedFeatureIds: brief.selectedFeatureIds,
          productBridge: {
            painPoint: "热点信息多，容易只看标题",
            contentScene: "先查行情、再看提醒、最后做记录",
            productAction: `用${preset.brandName}做公开信息整理`,
            softSentence: "它更适合作为信息整理入口，不是替你做投资决定。",
            complianceNote: "加入市场风险提示。",
          },
          titleDirections: ["看到热点先别急", "投资小白的检查表", "别把热点当答案"],
          coverDirection: "表格式封面，呈现三步检查",
          riskLevel: "low",
          riskNotes: ["热点内容需避免个股推荐和确定性判断。"],
        },
      ];
  return demoAngles.slice(0, Math.max(1, brief.generateCount));
}

function buildDemoContent(brief: BriefInput, angle: CreativeAngle): GeneratedContent {
  const preset = getBusinessLinePreset(brief.businessLine);
  const title = angle.titleDirections[0] || angle.angleName;
  const featureName = brief.selectedFeatureNames[0] || (brief.businessLine === "licaitong" ? "产品浏览与筛选" : "行情查询");
  const isLicaitong = brief.businessLine === "licaitong";
  return {
    id: uid("content"),
    angleId: angle.angleId,
    angleName: angle.angleName,
    titleCandidates: [
      { text: title, type: "干货式", riskLevel: "low" },
      { text: isLicaitong ? "理财新手先看这 3 点" : "投资小白先看这 3 点", type: "数字式", riskLevel: "low" },
      { text: isLicaitong ? "选产品不用一次看懂全部" : "盯盘不用一直盯着屏幕", type: "反差式", riskLevel: "low" },
    ],
    selectedTitle: title,
    coverTextCandidates: [
      { text: isLicaitong ? "先看风险等级" : "盯盘轻一点", style: "干货", riskLevel: "low" },
      { text: "先看清再判断", style: "工具", riskLevel: "low" },
      { text: isLicaitong ? "新手理财清单" : "小白看盘清单", style: "清单", riskLevel: "low" },
    ],
    selectedCoverText: isLicaitong ? "先看风险等级" : "盯盘轻一点",
    content: isLicaitong
      ? [
          `很多理财新手不是不想开始，而是产品信息太碎：工资到账想存一点、周末想比较风险等级、月底才想起来复盘。`,
          `我更建议把“了解理财”拆成轻一点的流程：先看这笔钱多久不用，再看风险等级和流动性，最后记录自己还不确定的地方。`,
          `如果只是做公开信息整理，可以在${preset.brandName}里用${featureName}相关能力，把产品类型、风险等级和规则说明放到同一个入口里看。`,
          `重点是：平台只能帮助你提高信息获取效率，不能替你判断买不买。看到任何推荐，都要回到风险承受能力和产品规则。`,
          `市场有风险，投资需谨慎。`,
        ].join("\n\n")
      : [
          `很多投资小白不是不想做功课，而是每天信息太碎：通勤刷到热点、午休看到行情变化、晚上才想起来复盘。`,
          `我更建议把“盯盘”拆成轻一点的流程：先看公开信息，再看和自己关注方向有关的变化，最后记录不确定的地方。`,
          `如果只是做日常信息整理，可以用${preset.brandName}里的${featureName}相关能力，把行情、提醒和自选信息放到同一个入口里看。`,
          `重点是：工具只能帮助你提高信息获取效率，不能替你判断买卖。看到任何热点，都要回到风险、估值和自身承受能力。`,
          `市场有风险，投资需谨慎。`,
        ].join("\n\n"),
    insertStrategy: {
      featureName,
      userPainPoint: angle.userPainPoint || "",
      scene: isLicaitong ? "工资到账后的产品信息整理" : "碎片化盯盘和公开信息整理",
      insertPosition: "正文中段",
      usedPhrase: `用${preset.brandName}里的${featureName}相关能力做信息整理`,
      insertStrength: brief.embedLevel,
    },
    tags: [preset.brandName, brief.targetUser, "财经干货", "小红书运营"],
    interactionGuide: isLicaitong
      ? "你发工资后通常会先做什么？评论区可以写下你的习惯。"
      : "你平时会在哪个时间点看市场信息？评论区可以写下你的习惯。",
    riskReminder: "市场有风险，投资需谨慎。",
    imagePromptSuggestions: [
      {
        style: "dry-goods",
        prompt: isLicaitong
          ? "3:4 小红书理财干货封面，暖色生活场景背景，中心是一张简洁检查表，标题文字为“先看风险等级”，画面包含微信界面抽象元素，不出现具体收益率、产品名称或持仓截图，克制温暖，留白充足"
          : "3:4 小红书财经干货封面，深色中性背景，中心是一张简洁检查表，标题文字为“盯盘轻一点”，画面包含手机界面抽象元素，不出现具体股票名称、代码、收益截图或持仓截图，专业克制，留白充足",
        coverText: isLicaitong ? "先看风险等级" : "盯盘轻一点",
        riskNotes: ["不展示收益率、股票代码或交易建议。"],
      },
    ],
    qualityScore: {
      overallScore: 82,
      scores: {
        readability: 84,
        productIntegration: 80,
        complianceSafety: 88,
        imagePromptClarity: 78,
      },
      weaknesses: ["演示内容未接入真实 LLM，风格变化有限。"],
      suggestions: ["配置文字 API 后可生成更多差异化表达。"],
    },
  };
}

function buildDemoCompliance(content: GeneratedContent): ComplianceReport {
  const hasRiskReminder = content.content.includes("市场有风险") || content.riskReminder.includes("市场有风险");
  return {
    overallRiskLevel: "low",
    publishReadiness: hasRiskReminder ? "ready" : "needs_revision",
    riskFindings: [],
    missingRequiredElements: hasRiskReminder ? [] : [{ type: "riskReminder", suggestedText: "市场有风险，投资需谨慎。" }],
    qualityScore: content.qualityScore,
    requiredFixes: hasRiskReminder ? [] : ["补充标准风险提示。"],
    summary: "未发现收益承诺、个股推荐、买卖点或私信导流表达。发布前仍需人工复核。",
  };
}

function normalizeAngles(value: unknown, brief: BriefInput): CreativeAngle[] {
  const parsed = value as { angles?: CreativeAngle[] } | CreativeAngle[];
  const angles = Array.isArray(parsed) ? parsed : Array.isArray(parsed.angles) ? parsed.angles : [];
  return angles.slice(0, 8).map((angle, index) => ({
    angleId: angle.angleId || `angle_${String(index + 1).padStart(3, "0")}`,
    angleName: angle.angleName || `创意角度 ${index + 1}`,
    angleType: angle.angleType || "内容角度",
    coreIdea: angle.coreIdea || "",
    targetUser: angle.targetUser || brief.targetUser,
    emotionalHook: Array.isArray(angle.emotionalHook) ? angle.emotionalHook : [],
    userPainPoint: angle.userPainPoint || "",
    contentStructure: angle.contentStructure || "",
    recommendedTemplateId: angle.recommendedTemplateId || "",
    recommendedFeatureIds: Array.isArray(angle.recommendedFeatureIds) ? angle.recommendedFeatureIds : [],
    productBridge: angle.productBridge || {},
    titleDirections: Array.isArray(angle.titleDirections) ? angle.titleDirections : [],
    coverDirection: angle.coverDirection || "",
    riskLevel: angle.riskLevel || "low",
    riskNotes: Array.isArray(angle.riskNotes) ? angle.riskNotes : [],
  }));
}

function normalizeContent(value: unknown, angle: CreativeAngle): GeneratedContent {
  const data = value as Partial<GeneratedContent>;
  return {
    id: uid("content"),
    angleId: data.angleId || angle.angleId,
    angleName: data.angleName || angle.angleName,
    titleCandidates: Array.isArray(data.titleCandidates) ? data.titleCandidates : [],
    selectedTitle: data.selectedTitle || data.titleCandidates?.[0]?.text || angle.titleDirections[0] || angle.angleName,
    coverTextCandidates: Array.isArray(data.coverTextCandidates) ? data.coverTextCandidates : [],
    selectedCoverText: data.selectedCoverText || data.coverTextCandidates?.[0]?.text || "财经干货",
    content: data.content || "",
    insertStrategy: data.insertStrategy || {},
    tags: Array.isArray(data.tags) ? data.tags : [],
    interactionGuide: data.interactionGuide || "",
    riskReminder: data.riskReminder || "市场有风险，投资需谨慎。",
    imagePromptSuggestions: Array.isArray(data.imagePromptSuggestions) ? data.imagePromptSuggestions : [],
    qualityScore: data.qualityScore,
    complianceReport: data.complianceReport,
    debugKnowledgeUsed: data.debugKnowledgeUsed,
  };
}

function normalizeCompliance(value: unknown, fallback: ComplianceReport): ComplianceReport {
  const data = value as Partial<ComplianceReport>;
  return {
    overallRiskLevel: data.overallRiskLevel || fallback.overallRiskLevel,
    publishReadiness: data.publishReadiness || fallback.publishReadiness,
    riskFindings: Array.isArray(data.riskFindings) ? data.riskFindings : fallback.riskFindings,
    missingRequiredElements: Array.isArray(data.missingRequiredElements) ? data.missingRequiredElements : fallback.missingRequiredElements,
    qualityScore: data.qualityScore || fallback.qualityScore,
    requiredFixes: Array.isArray(data.requiredFixes) ? data.requiredFixes : fallback.requiredFixes,
    summary: data.summary || fallback.summary,
    debugKnowledgeUsed: data.debugKnowledgeUsed,
  };
}

export function CopilotWorkbench() {
  const [step, setStep] = useState(1);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG);
  const [brief, setBrief] = useState<BriefInput>(DEFAULT_BRIEF);
  const [knowledge, setKnowledge] = useState<KnowledgeListView | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialDraft, setMaterialDraft] = useState("");
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [selectedAngleIds, setSelectedAngleIds] = useState<string[]>([]);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeResultId, setActiveResultId] = useState<string>("");
  const [status, setStatus] = useState("已就绪");
  const [isBusy, setIsBusy] = useState(false);
  const [imageResult, setImageResult] = useState<string>("");

  useEffect(() => {
    setApiConfig(safeJsonParse(localStorage.getItem(STORAGE_KEYS.api) || "", DEFAULT_API_CONFIG));
    const storedBrief = safeJsonParse<Partial<BriefInput>>(localStorage.getItem(STORAGE_KEYS.brief) || "", {});
    const businessLine = normalizeBusinessLine(storedBrief.businessLine);
    setBrief(normalizeBriefForBusinessLine({
      ...DEFAULT_BRIEF,
      ...storedBrief,
      businessLine,
    }));
    setMaterials(safeJsonParse(localStorage.getItem(STORAGE_KEYS.materials) || "", []));
    setDrafts(safeJsonParse(localStorage.getItem(STORAGE_KEYS.drafts) || "", []));

    fetch("/api/knowledge-base/list")
      .then((response) => response.json())
      .then((data: KnowledgeListView) => setKnowledge(data))
      .catch(() => setStatus("知识库加载失败，仍可使用演示流程"));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.api, JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.brief, JSON.stringify(brief));
  }, [brief]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.materials, JSON.stringify(materials));
    setBrief((current) => ({ ...current, materials }));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(drafts));
  }, [drafts]);

  const selectedAngles = useMemo(() => angles.filter((angle) => selectedAngleIds.includes(angle.angleId)), [angles, selectedAngleIds]);
  const activeResult = useMemo(() => results.find((item) => item.id === activeResultId) || results[0], [activeResultId, results]);
  const linePreset = useMemo(() => getBusinessLinePreset(brief.businessLine), [brief.businessLine]);
  const selectedTargetUser = useMemo(
    () => getTargetUserSegment(brief.businessLine, brief.targetUser),
    [brief.businessLine, brief.targetUser],
  );
  const contentTypes = useMemo(() => getContentTypesForLine(brief.businessLine), [brief.businessLine]);
  const selectedType = useMemo(
    () => getContentTypeConfig(brief.businessLine, brief.contentType),
    [brief.businessLine, brief.contentType],
  );
  const businessLineFeatures = useMemo(
    () => (knowledge?.features || []).filter((feature) => featureMatchesBusinessLine(feature, brief.businessLine)),
    [brief.businessLine, knowledge],
  );
  const filteredFeatures = useMemo(() => {
    const byType = businessLineFeatures.filter((feature) => feature.suitableContentTypes.includes(brief.contentType));
    return byType.length ? byType : businessLineFeatures.slice(0, 8);
  }, [brief.contentType, businessLineFeatures]);

  function switchBusinessLine(line: BusinessLine) {
    if (line === brief.businessLine) return;
    const preset = getBusinessLinePreset(line);
    setBrief((current) => applyBusinessLineToBrief(current, line));
    setMaterials([]);
    setAngles([]);
    setSelectedAngleIds([]);
    setResults([]);
    setActiveResultId("");
    setImageResult("");
    setStatus(`已切换到${preset.label}，内容类型与 Brief 已更新`);
  }

  function selectContentType(contentType: ContentType) {
    setBrief((current) => {
      const next = { ...current, contentType };
      const validIds = new Set(
        (knowledge?.features || [])
          .filter((feature) => featureMatchesBusinessLine(feature, current.businessLine))
          .filter((feature) => feature.suitableContentTypes.includes(contentType))
          .map((feature) => feature.id),
      );
      return {
        ...next,
        selectedFeatureIds: current.selectedFeatureIds.filter((id) => validIds.has(id)),
        selectedFeatureNames: current.selectedFeatureNames.filter((name) =>
          (knowledge?.features || []).some((feature) => feature.name === name && validIds.has(feature.id)),
        ),
      };
    });
  }

  function updateBrief(patch: Partial<BriefInput>) {
    setBrief((current) => ({ ...current, ...patch }));
  }

  function toggleFeature(feature: ProductFeatureView, checked: boolean) {
    setBrief((current) => {
      const ids = new Set(current.selectedFeatureIds);
      const names = new Set(current.selectedFeatureNames);
      if (checked) {
        ids.add(feature.id);
        names.add(feature.name);
      } else {
        ids.delete(feature.id);
        names.delete(feature.name);
      }
      return { ...current, selectedFeatureIds: [...ids], selectedFeatureNames: [...names] };
    });
  }

  function addManualMaterial() {
    const text = materialDraft.trim();
    if (!text) return;
    const material: Material = {
      id: uid("material"),
      title: text.split("\n")[0].slice(0, 48) || "手动素材",
      body: text,
      source: "手动输入",
      tags: [selectedType?.label || "财经内容"],
      createdAt: new Date().toISOString(),
    };
    setMaterials((current) => [material, ...current].slice(0, 12));
    setMaterialDraft("");
    setStatus("素材已加入 brief");
  }

  async function searchHotspot() {
    if (!apiConfig.hotspot.key) {
      setMaterialDraft("今日市场热点可在这里粘贴：例如政策变化、行业新闻、用户讨论焦点或竞品素材摘要。");
      setStatus("未配置热点 API，已切换为手动热点输入");
      return;
    }

    setIsBusy(true);
    setStatus("正在搜索热点...");
    try {
      const response = await fetch("/api/tavily-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: brief.businessLine === "licaitong"
            ? `${brief.topic || "理财"} 基金 利率 政策 小红书 内容选题`
            : `${brief.topic || "A股"} 行情 市场热点 政策 小红书 内容选题`,
          apiKey: apiConfig.hotspot.key,
          maxResults: 5,
          topic: "news",
          timeRange: "day",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "热点搜索失败");
      const nextMaterials: Material[] = (data.results || []).slice(0, 5).map((item: any) => ({
        id: uid("hotspot"),
        title: item.title || "财经热点",
        body: item.content || item.snippet || "",
        source: item.url || "Tavily",
        tags: ["热点"],
        createdAt: new Date().toISOString(),
      }));
      setMaterials((current) => [...nextMaterials, ...current].slice(0, 12));
      setStatus(`已加入 ${nextMaterials.length} 条热点素材`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "热点搜索失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function buildPrompt(action: string, input: Record<string, unknown>) {
    const response = await fetch("/api/prompt-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, input }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Prompt Engine 调用失败");
    return data as { system: string; user: string; debugKnowledgeUsed?: unknown };
  }

  async function callTextModel(prompt: { system: string; user: string }, options: { temperature?: number; maxTokens?: number } = {}) {
    const response = await fetch("/api/llm-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiUrl: apiConfig.text.apiUrl,
        apiKey: apiConfig.text.key,
        model: apiConfig.text.model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 4096,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "文字 API 调用失败");
    return data.choices?.[0]?.message?.content || "";
  }

  async function generateAngles() {
    setIsBusy(true);
    setStatus("正在检索知识库并生成创意角度...");
    try {
      const input = { ...brief, materials };
      const prompt = await buildPrompt("creativeAngles", input);
      if (!hasTextApi(apiConfig)) {
        const demo = buildDemoAngles(brief);
        setAngles(demo);
        setSelectedAngleIds(demo.map((angle) => angle.angleId));
        setStep(3);
        setStatus("未配置文字 API，已生成本地演示角度");
        return;
      }

      const raw = await callTextModel(prompt, { temperature: 0.35, maxTokens: 8192 });
      const parsed = parseLLMJson<unknown>(raw);
      const normalized = normalizeAngles(parsed, brief);
      setAngles(normalized);
      setSelectedAngleIds(normalized.slice(0, brief.generateCount).map((angle) => angle.angleId));
      setStep(3);
      setStatus(`已生成 ${normalized.length} 个创意角度`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "创意角度生成失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function generateContent() {
    const targetAngles = selectedAngles.length ? selectedAngles : buildDemoAngles(brief).slice(0, 1);
    setIsBusy(true);
    setStatus("正在按选中角度生成内容...");
    setImageResult("");
    try {
      const nextResults: GeneratedContent[] = [];
      for (const angle of targetAngles) {
        if (!hasTextApi(apiConfig)) {
          const demo = buildDemoContent(brief, angle);
          demo.complianceReport = buildDemoCompliance(demo);
          nextResults.push(demo);
          continue;
        }

        const contentPrompt = await buildPrompt("contentGeneration", {
          ...brief,
          materials,
          selectedAngle: angle,
          templateId: angle.recommendedTemplateId,
          selectedFeatureIds: [...new Set([...brief.selectedFeatureIds, ...angle.recommendedFeatureIds])],
        });
        const rawContent = await callTextModel(contentPrompt, { maxTokens: 4096 });
        const content = normalizeContent(parseLLMJson<unknown>(rawContent), angle);

        const compliancePrompt = await buildPrompt("complianceReview", {
          ...brief,
          generatedContent: content,
          selectedFeatureIds: [...new Set([...brief.selectedFeatureIds, ...angle.recommendedFeatureIds])],
        });
        const rawCompliance = await callTextModel(compliancePrompt, { temperature: 0.2, maxTokens: 4096 });
        content.complianceReport = normalizeCompliance(parseLLMJson<unknown>(rawCompliance), buildDemoCompliance(content));
        nextResults.push(content);
      }
      setResults(nextResults);
      setActiveResultId(nextResults[0]?.id || "");
      setStep(4);
      setStatus(`已生成 ${nextResults.length} 条内容，并完成合规审查`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "内容生成失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function generateImage() {
    const prompt = activeResult?.imagePromptSuggestions?.[0]?.prompt;
    if (!prompt) {
      setStatus("当前内容没有可用图片 Prompt");
      return;
    }
    if (!apiConfig.image.key) {
      setStatus("已保留图片 Prompt。配置图片 API Key 后可调用图片生成入口。");
      return;
    }

    setIsBusy(true);
    setStatus("正在调用图片生成 API...");
    try {
      const response = await fetch("/api/image-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          apiKey: apiConfig.image.key,
          apiUrl: apiConfig.image.apiUrl,
          model: apiConfig.image.model,
          format: apiConfig.image.format,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "图片生成失败");
      const url = data.data?.[0]?.url || data.data?.[0]?.b64_json || "";
      setImageResult(url);
      setStatus(url ? "图片生成完成" : "图片 API 已返回，但未找到图片地址");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "图片生成失败");
    } finally {
      setIsBusy(false);
    }
  }

  function saveActiveDraft() {
    if (!activeResult) return;
    const draft: Draft = {
      ...activeResult,
      savedAt: new Date().toISOString(),
      generationSnapshot: { ...brief, materials },
    };
    setDrafts((current) => [draft, ...current].slice(0, 30));
    setStep(5);
    setStatus("已保存到本地草稿箱");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-5">
        <header className="flex flex-col gap-4 border-b border-border pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-normal">C3 Copilot AI 工作台</h1>
                  <p className="text-sm text-muted-foreground">一套工作流，支持微证券与理财通双业务线</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={hasTextApi(apiConfig) ? "success" : "warning"}>{hasTextApi(apiConfig) ? "文字 API 已配置" : "演示模式"}</Badge>
              <Badge variant="secondary">{linePreset.shortLabel} · KB {knowledge?.knowledgeBaseVersion || "加载中"}</Badge>
              <Badge variant="outline">草稿 {drafts.length}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium">业务线</p>
              <p className="text-sm text-muted-foreground">{linePreset.positioning}</p>
            </div>
            <div className="flex rounded-lg border border-border bg-muted/40 p-1">
              {Object.values(BUSINESS_LINE_PRESETS).map((line) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => switchBusinessLine(line.id)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    brief.businessLine === line.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background",
                  )}
                >
                  {line.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="grid workflow-grid gap-5">
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>五步工作流</CardTitle>
                <CardDescription>保留 G12 核心路径，先跑通闭环。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {STEP_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStep(item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        step === item.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.id}. {item.label}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Brief</CardTitle>
                <CardDescription>当前生成上下文</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">业务线</span><strong>{linePreset.shortLabel}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">内容类型</span><strong>{selectedType?.label}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">目标人群</span><strong className="text-right">{brief.targetUser}</strong></div>
                <div className="rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">{selectedTargetUser?.description || linePreset.campaignGoal}</div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">素材</span><strong>{materials.length} 条</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">角度</span><strong>{selectedAngles.length}/{angles.length}</strong></div>
                <div className="rounded-md bg-muted p-3 text-muted-foreground">{brief.topic || "尚未填写主题"}</div>
              </CardContent>
            </Card>
          </aside>

          <section className="min-w-0 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>状态</CardTitle>
                <CardDescription>{status}</CardDescription>
              </CardHeader>
            </Card>

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>1. 环境与 API 配置</CardTitle>
                  <CardDescription>先在页头选择业务线（微证券 / 理财通），再配置 API。Key 仅保存在浏览器 localStorage。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 md:col-span-2">
                    <Label>当前业务线</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{linePreset.label}</Badge>
                      <span className="text-sm text-muted-foreground">{linePreset.positioning}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      切换业务线后，Step 2 的产品功能、默认主题和目标人群会同步更新，并清空已选功能与生成结果。
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>文字生成 API Key</Label>
                    <Input type="password" value={apiConfig.text.key} onChange={(event) => setApiConfig({ ...apiConfig, text: { ...apiConfig.text, key: event.target.value } })} placeholder="DeepSeek / OpenAI 兼容 Key" />
                  </div>
                  <div className="space-y-2">
                    <Label>文字 API 地址</Label>
                    <Input value={apiConfig.text.apiUrl} onChange={(event) => setApiConfig({ ...apiConfig, text: { ...apiConfig.text, apiUrl: event.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>文字模型</Label>
                    <Input value={apiConfig.text.model} onChange={(event) => setApiConfig({ ...apiConfig, text: { ...apiConfig.text, model: event.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>图片 API Key</Label>
                    <Input type="password" value={apiConfig.image.key} onChange={(event) => setApiConfig({ ...apiConfig, image: { ...apiConfig.image, key: event.target.value } })} placeholder="可选" />
                  </div>
                  <div className="space-y-2">
                    <Label>图片模型 / Endpoint</Label>
                    <Input value={apiConfig.image.model} onChange={(event) => setApiConfig({ ...apiConfig, image: { ...apiConfig.image, model: event.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>热点搜索 API Key</Label>
                    <Input type="password" value={apiConfig.hotspot.key} onChange={(event) => setApiConfig({ ...apiConfig, hotspot: { ...apiConfig.hotspot, key: event.target.value } })} placeholder="可选，Tavily" />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" onClick={() => setStep(2)}>进入内容配置</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>2. 内容类型与素材/热点</CardTitle>
                  <CardDescription>
                    当前为 {linePreset.label}。内容营销目标：{linePreset.campaignGoal}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {contentTypes.map((item) => (
                      <button
                        key={`${brief.businessLine}-${item.value}`}
                        type="button"
                        onClick={() => selectContentType(item.value)}
                        className={cn(
                          "rounded-lg border p-4 text-left transition-colors",
                          brief.contentType === item.value ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{item.label}</strong>
                          {item.recommended ? <Badge variant="secondary">推荐</Badge> : null}
                          {item.needHotspot ? <Badge variant="warning">建议热点</Badge> : <Badge variant="outline">素材可选</Badge>}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>自定义主题</Label>
                      <Textarea value={brief.topic} onChange={(event) => updateBrief({ topic: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>目标人群</Label>
                      <Select value={brief.targetUser} onChange={(event) => updateBrief({ targetUser: event.target.value })}>
                        {linePreset.targetUserOptions.map((user) => (
                          <option key={user} value={user}>{user}</option>
                        ))}
                      </Select>
                      {selectedTargetUser ? (
                        <p className="text-xs leading-5 text-muted-foreground">{selectedTargetUser.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                      <span className="flex items-center gap-2"><Database className="h-4 w-4" /> {linePreset.shortLabel} 知识库功能</span>
                      <Badge variant="outline">
                        本类型 {filteredFeatures.length} 项 · 业务线共 {businessLineFeatures.length} 项
                      </Badge>
                    </div>
                    {filteredFeatures.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                        当前内容类型暂无强匹配功能，生成时将由知识库按业务线自动检索。
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {filteredFeatures.map((feature) => (
                          <label key={feature.id} className="flex gap-3 rounded-md border border-border p-3 text-sm">
                            <input type="checkbox" checked={brief.selectedFeatureIds.includes(feature.id)} onChange={(event) => toggleFeature(feature, event.target.checked)} />
                            <span><strong>{feature.name}</strong><span className="block text-muted-foreground">{feature.summary}</span></span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <Label>素材 / 热点（选填）</Label>
                      <Textarea value={materialDraft} onChange={(event) => setMaterialDraft(event.target.value)} placeholder="粘贴新闻、用户洞察、热点摘要、竞品素材等" />
                      {selectedType ? <p className="text-xs leading-5 text-muted-foreground">{selectedType.materialHint}</p> : null}
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <Button type="button" onClick={addManualMaterial}>加入素材</Button>
                      <Button type="button" variant="secondary" onClick={searchHotspot} disabled={isBusy}><Search className="h-4 w-4" /> 搜索热点</Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {materials.map((item) => <Badge key={item.id} variant="outline">{item.title}</Badge>)}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setStep(3)}>下一步：配置创意角度</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>3. 创意角度生成</CardTitle>
                  <CardDescription>先生成创意角度并勾选，再进入内容生成。Prompt Engine 会按当前业务线检索 KB v4.0。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>博主层级</Label>
                      <Select value={brief.bloggerLevel} onChange={(event) => updateBrief({ bloggerLevel: event.target.value as BriefInput["bloggerLevel"] })}>
                        <option value="tail">尾部博主</option>
                        <option value="middle">腰部博主</option>
                        <option value="head">头部博主</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>植入强度</Label>
                      <Select value={brief.embedLevel} onChange={(event) => updateBrief({ embedLevel: event.target.value as BriefInput["embedLevel"] })}>
                        <option value="none">不植入</option>
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>篇幅</Label>
                      <Select value={brief.contentLength} onChange={(event) => updateBrief({ contentLength: event.target.value as BriefInput["contentLength"] })}>
                        <option value="short">短</option>
                        <option value="medium">中</option>
                        <option value="long">长</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>生成数量</Label>
                      <Input type="number" min={1} max={5} value={brief.generateCount} onChange={(event) => updateBrief({ generateCount: Number(event.target.value) || 1 })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>自定义要求</Label>
                    <Textarea value={brief.customRequirement || ""} onChange={(event) => updateBrief({ customRequirement: event.target.value })} placeholder="例如：更像小红书干货贴，减少营销感" />
                  </div>

                  <Button onClick={generateAngles} disabled={isBusy}>生成创意角度</Button>

                  {angles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">生成后会出现多个角度卡片，请勾选 1 个或多个再进入内容生成。</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {angles.map((angle) => (
                        <label key={angle.angleId} className={cn("rounded-lg border p-4", selectedAngleIds.includes(angle.angleId) ? "border-primary bg-primary/10" : "border-border bg-card")}>
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedAngleIds.includes(angle.angleId)}
                              onChange={(event) => {
                                setSelectedAngleIds((current) => event.target.checked ? [...current, angle.angleId] : current.filter((id) => id !== angle.angleId));
                              }}
                            />
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2"><strong>{angle.angleName}</strong><Badge variant={angle.riskLevel === "low" ? "success" : "warning"}>{angle.riskLevel}</Badge></div>
                              <p className="text-sm text-muted-foreground">{angle.coreIdea}</p>
                              <div className="flex flex-wrap gap-1">{angle.titleDirections.slice(0, 3).map((title) => <Badge key={title} variant="outline">{title}</Badge>)}</div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col items-end gap-2 border-t border-border pt-4">
                    {angles.length > 0 && selectedAngles.length === 0 ? (
                      <p className="w-full text-sm text-muted-foreground">请至少勾选一个创意角度。</p>
                    ) : null}
                    <Button
                      onClick={generateContent}
                      disabled={isBusy || angles.length === 0 || selectedAngles.length === 0}
                    >
                      生成内容（已选 {selectedAngles.length} 个角度）
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>4. 内容生成与图片入口</CardTitle>
                  <CardDescription>基于 Step 3 选中的角度生成正文、合规审查与封面 Prompt。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {results.length === 0 ? (
                    <div className="rounded-md border border-border p-5 text-sm text-muted-foreground">
                      还没有生成内容。请返回第 3 步生成并勾选创意角度，再点击「生成内容」。
                      <div className="mt-4">
                        <Button variant="secondary" size="sm" onClick={() => setStep(3)}>返回创意角度</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {results.map((item) => (
                        <Button key={item.id} variant={activeResult?.id === item.id ? "default" : "secondary"} size="sm" onClick={() => setActiveResultId(item.id)}>
                          {item.selectedTitle}
                        </Button>
                      ))}
                    </div>
                  )}

                  {activeResult && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <article className="space-y-4 rounded-lg border border-border bg-card p-5">
                        <div>
                          <Badge variant="secondary">{activeResult.angleName}</Badge>
                          <h2 className="mt-3 text-xl font-semibold">{activeResult.selectedTitle}</h2>
                          <p className="mt-2 text-sm text-muted-foreground">封面文案：{activeResult.selectedCoverText}</p>
                        </div>
                        <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 font-sans text-sm leading-7">{activeResult.content}</pre>
                        <div className="flex flex-wrap gap-2">{activeResult.tags.map((tag) => <Badge key={tag} variant="outline">#{tag}</Badge>)}</div>
                        <div className="rounded-md bg-muted p-3 text-sm">互动引导：{activeResult.interactionGuide}</div>
                      </article>

                      <div className="space-y-4">
                        <section className="rounded-lg border border-border bg-card p-4">
                          <div className="mb-2 flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" /> 合规审查</div>
                          <p className="text-sm text-muted-foreground">{activeResult.complianceReport?.summary || "待审查"}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={activeResult.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}>{activeResult.complianceReport?.publishReadiness || "unknown"}</Badge>
                            <Badge variant="outline">风险 {activeResult.complianceReport?.overallRiskLevel || "low"}</Badge>
                          </div>
                        </section>
                        <section className="rounded-lg border border-border bg-card p-4">
                          <div className="mb-2 flex items-center gap-2 font-medium"><ImageIcon className="h-4 w-4" /> 图片 Prompt</div>
                          <p className="max-h-52 overflow-auto rounded-md bg-muted p-3 text-sm text-muted-foreground">{activeResult.imagePromptSuggestions[0]?.prompt || "暂无图片 Prompt"}</p>
                          <Button className="mt-3 w-full" variant="secondary" onClick={generateImage} disabled={isBusy}>生成图片入口</Button>
                          {imageResult && imageResult.startsWith("http") ? <a className="mt-2 block break-all text-sm text-primary" href={imageResult} target="_blank">查看生成图片</a> : null}
                        </section>
                        <Button className="w-full" onClick={saveActiveDraft}><CheckCircle2 className="h-4 w-4" /> 保存草稿</Button>
                      </div>
                    </div>
                  )}

                  {results.length > 0 ? (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={generateContent} disabled={isBusy || selectedAngles.length === 0}>
                        重新生成
                      </Button>
                      <Button variant="secondary" onClick={() => setStep(5)}>进入审核/草稿</Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {step === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle>5. 审核/发布与草稿箱</CardTitle>
                  <CardDescription>发布能力暂不接入，当前用于人工复核和本地草稿管理。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border p-4"><strong>合规审查</strong><p className="mt-2 text-sm text-muted-foreground">收益承诺、个股推荐、买卖点、导流、风险提示。</p></div>
                    <div className="rounded-lg border border-border p-4"><strong>品牌表达</strong><p className="mt-2 text-sm text-muted-foreground">专业、克制、工具辅助，不夸大产品能力。</p></div>
                    <div className="rounded-lg border border-border p-4"><strong>人工发布</strong><p className="mt-2 text-sm text-muted-foreground">账号发布和数据复盘后续版本再接入。</p></div>
                  </div>

                  <div className="space-y-3">
                    {drafts.length === 0 ? (
                      <div className="rounded-md border border-border p-5 text-sm text-muted-foreground">草稿箱为空。生成内容后点击“保存草稿”。</div>
                    ) : drafts.map((draft) => (
                      <div key={draft.id + draft.savedAt} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <strong>{draft.selectedTitle}</strong>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {new Date(draft.savedAt).toLocaleString()} · {getContentTypeLabel(
                                normalizeBusinessLine(draft.generationSnapshot.businessLine),
                                draft.generationSnapshot.contentType,
                              )}
                            </p>
                          </div>
                          <Badge variant={draft.complianceReport?.publishReadiness === "ready" ? "success" : "warning"}>{draft.complianceReport?.publishReadiness || "needs_review"}</Badge>
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{draft.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>知识库调用</CardTitle>
                <CardDescription>{linePreset.shortLabel} · KB v{knowledge?.knowledgeBaseVersion || "4.0"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">当前业务线功能</span><strong>{businessLineFeatures.length}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">内容模板</span><strong>{knowledge?.counts?.templates ?? "-"}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">合规规则</span><strong>{knowledge?.counts?.complianceRules ?? "-"}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">改写规则</span><strong>{knowledge?.counts?.rewriteRules ?? "-"}</strong></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>暂未迁移</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>图片实验室的历史版本、资产库批量管理、数据复盘和自动发布暂未进入 V0。</p>
                <p>当前图片能力保留 Prompt 与 API 入口，为后续迁移留好接口。</p>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}
