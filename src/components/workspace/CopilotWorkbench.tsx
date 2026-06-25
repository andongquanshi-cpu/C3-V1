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
import type {
  ApiConfig,
  BriefInput,
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
  contentType: "brand-seed",
  topic: "腾讯微证券小程序如何帮助投资小白做日常盯盘",
  targetUser: "投资小白",
  campaignGoal: "内容种草和功能认知",
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

const CONTENT_TYPES: Array<{ value: ContentType; label: string; description: string; needHotspot: boolean }> = [
  { value: "stock-tutorial", label: "炒股教程类", description: "选股、盯盘、压力位等干货教学", needHotspot: false },
  { value: "finance-tips", label: "理财干货类", description: "基金、理财技巧、资产配置表达", needHotspot: false },
  { value: "personal-exp", label: "个人经验类", description: "心得、避坑、生活化投资场景", needHotspot: false },
  { value: "hotspot-analysis", label: "热点分析类", description: "结合市场或政策热点做降维解读", needHotspot: true },
  { value: "brand-seed", label: "品牌种草类", description: "腾讯微证券功能体验与使用教程", needHotspot: false },
];

const STEP_ITEMS = [
  { id: 1, label: "API 配置", icon: KeyRound },
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
  const type = CONTENT_TYPES.find((item) => item.value === brief.contentType)?.label || "财经内容";
  const demoAngles: CreativeAngle[] = [
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
        productAction: "打开腾讯微证券小程序查看自选和消息提醒",
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
        productAction: "用腾讯微证券做公开信息整理",
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
  const title = angle.titleDirections[0] || angle.angleName;
  const featureName = brief.selectedFeatureNames[0] || "行情查询";
  return {
    id: uid("content"),
    angleId: angle.angleId,
    angleName: angle.angleName,
    titleCandidates: [
      { text: title, type: "干货式", riskLevel: "low" },
      { text: "投资小白先看这 3 点", type: "数字式", riskLevel: "low" },
      { text: "盯盘不用一直盯着屏幕", type: "反差式", riskLevel: "low" },
    ],
    selectedTitle: title,
    coverTextCandidates: [
      { text: "盯盘轻一点", style: "干货", riskLevel: "low" },
      { text: "先看清再判断", style: "工具", riskLevel: "low" },
      { text: "小白看盘清单", style: "清单", riskLevel: "low" },
    ],
    selectedCoverText: "盯盘轻一点",
    content: [
      `很多投资小白不是不想做功课，而是每天信息太碎：通勤刷到热点、午休看到行情变化、晚上才想起来复盘。`,
      `我更建议把“盯盘”拆成轻一点的流程：先看公开信息，再看和自己关注方向有关的变化，最后记录不确定的地方。`,
      `如果只是做日常信息整理，可以用腾讯微证券里的${featureName}相关能力，把行情、提醒和自选信息放到同一个入口里看。`,
      `重点是：工具只能帮助你提高信息获取效率，不能替你判断买卖。看到任何热点，都要回到风险、估值和自身承受能力。`,
      `市场有风险，投资需谨慎。`,
    ].join("\n\n"),
    insertStrategy: {
      featureName,
      userPainPoint: angle.userPainPoint || "",
      scene: "碎片化盯盘和公开信息整理",
      insertPosition: "正文中段",
      usedPhrase: `用腾讯微证券里的${featureName}相关能力做信息整理`,
      insertStrength: brief.embedLevel,
    },
    tags: ["腾讯微证券", "投资小白", "财经干货", "小红书运营"],
    interactionGuide: "你平时会在哪个时间点看市场信息？评论区可以写下你的习惯。",
    riskReminder: "市场有风险，投资需谨慎。",
    imagePromptSuggestions: [
      {
        style: "dry-goods",
        prompt: "3:4 小红书财经干货封面，深色中性背景，中心是一张简洁检查表，标题文字为“盯盘轻一点”，画面包含手机界面抽象元素，不出现具体股票名称、代码、收益截图或持仓截图，专业克制，留白充足",
        coverText: "盯盘轻一点",
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
    setBrief({ ...DEFAULT_BRIEF, ...safeJsonParse(localStorage.getItem(STORAGE_KEYS.brief) || "", {}) });
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
  const selectedType = CONTENT_TYPES.find((item) => item.value === brief.contentType);
  const filteredFeatures = useMemo(() => {
    const all = knowledge?.features || [];
    const byType = all.filter((feature) => feature.suitableContentTypes.includes(brief.contentType));
    return byType.length ? byType : all.slice(0, 8);
  }, [brief.contentType, knowledge]);

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
          query: `${brief.topic || "中国财经"} 今日 A股 理财 市场热点 小红书 内容选题`,
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
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-normal">C3-V0 Copilot AI 工作台</h1>
                <p className="text-sm text-muted-foreground">基于 G12 重构的五步内容创作最小可用版本</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={hasTextApi(apiConfig) ? "success" : "warning"}>{hasTextApi(apiConfig) ? "文字 API 已配置" : "演示模式"}</Badge>
            <Badge variant="secondary">KB {knowledge?.knowledgeBaseVersion || "加载中"}</Badge>
            <Badge variant="outline">草稿 {drafts.length}</Badge>
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
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">内容类型</span><strong>{selectedType?.label}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">目标人群</span><strong>{brief.targetUser}</strong></div>
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
                  <CardTitle>1. API 配置</CardTitle>
                  <CardDescription>API Key 仅保存在浏览器 localStorage。未配置文字 API 时，可使用本地演示生成完成流程验证。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
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
                  <CardDescription>选择类型、用户、主推功能，并补充热点或素材。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {CONTENT_TYPES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => updateBrief({ contentType: item.value })}
                        className={cn("rounded-lg border p-4 text-left transition-colors", brief.contentType === item.value ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong>{item.label}</strong>
                          {item.needHotspot ? <Badge variant="warning">需要热点</Badge> : <Badge variant="secondary">可无热点</Badge>}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
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
                        <option>投资小白</option>
                        <option>忙碌上班族</option>
                        <option>热点关注者</option>
                        <option>微信高频用户</option>
                        <option>轻量理财用户</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><Database className="h-4 w-4" /> 知识库功能选择</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {filteredFeatures.slice(0, 8).map((feature) => (
                        <label key={feature.id} className="flex gap-3 rounded-md border border-border p-3 text-sm">
                          <input type="checkbox" checked={brief.selectedFeatureIds.includes(feature.id)} onChange={(event) => toggleFeature(feature, event.target.checked)} />
                          <span><strong>{feature.name}</strong><span className="block text-muted-foreground">{feature.summary}</span></span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <Label>素材/热点输入</Label>
                      <Textarea value={materialDraft} onChange={(event) => setMaterialDraft(event.target.value)} placeholder="粘贴新闻、用户洞察、热点摘要、竞品素材等" />
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
                    <Button onClick={() => setStep(3)}>进入创意角度</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>3. 创意角度生成</CardTitle>
                  <CardDescription>Prompt Engine 会带入 KB v3.2 的产品功能、模板、话术和合规规则。</CardDescription>
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

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={generateAngles} disabled={isBusy}>生成创意角度</Button>
                    <Button variant="secondary" onClick={generateContent} disabled={isBusy || (angles.length > 0 && selectedAngles.length === 0)}>按选中角度生成内容</Button>
                  </div>

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
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>4. 内容生成与图片入口</CardTitle>
                  <CardDescription>查看正文、合规摘要和图片 Prompt。配置图片 API 后可从这里触发生成。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {results.length === 0 ? (
                    <div className="rounded-md border border-border p-5 text-sm text-muted-foreground">还没有生成内容。可以返回第 3 步生成角度，或直接点击下方按钮用当前 brief 生成演示内容。</div>
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

                  <div className="flex gap-2">
                    <Button onClick={generateContent} disabled={isBusy}>生成内容</Button>
                    <Button variant="secondary" onClick={() => setStep(5)}>进入审核/草稿</Button>
                  </div>
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
                            <p className="mt-1 text-sm text-muted-foreground">{new Date(draft.savedAt).toLocaleString()} · {draft.generationSnapshot.contentType}</p>
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
                <CardDescription>来自 G12 的 KB v3.2</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">产品功能</span><strong>{knowledge?.counts?.features ?? "-"}</strong></div>
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
