#!/usr/bin/env node
/**
 * Build ai-knowledge-base-v4.0 from ai-knowledge-base-v3.3.
 * Adds layered structure (L0–L4), extension fields, and index manifest.
 *
 * Run: node scripts/build-knowledge-base-v4.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "ai-knowledge-base-v3.3");
const OUT = path.join(ROOT, "ai-knowledge-base-v4.0");

const LAYER_DIRS = {
  L0_shared: "layers/L0-shared",
  L1_brand: "layers/L1-brand",
  L2_product: "layers/L2-product",
  L3_content_pattern: "layers/L3-content-pattern",
  L4_audience: "layers/L4-audience",
};

const FILE_LAYER = {
  "compliance-rules.json": "L0_shared",
  "compliance-rewrite-rules.cleaned.json": "L0_shared",
  "platform-rules.json": "L0_shared",
  "risk-disclaimers.json": "L0_shared",
  "brand-voice.json": "L1_brand",
  "visual-guidelines.json": "L1_brand",
  "product-features.json": "L2_product",
  "content-templates.json": "L3_content_pattern",
  "phrase-library.json": "L3_content_pattern",
  "audience-profiles.json": "L4_audience",
};

const PERSONA_LABEL_TO_ID = {
  同龄人日记: "peer_diary",
  理财教学博主: "concept_teacher",
  市场观察员: "hotspot_observer",
  清醒搞钱女孩: "sober_guard",
  家庭CFO: "family_planner",
  "家庭 CFO": "family_planner",
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(relPath, data) {
  const full = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function mapPersonaIds(item) {
  if (Array.isArray(item.applicablePersonaIds) && item.applicablePersonaIds.length) {
    return item.applicablePersonaIds;
  }
  const fromPersonas = toArray(item.applicablePersonas)
    .map((label) => PERSONA_LABEL_TO_ID[label] || "")
    .filter(Boolean);
  return fromPersonas;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function defaultBusinessLine(layer, item) {
  if (item.businessLine) return item.businessLine;
  if (layer === "L0_shared") return "all";
  return item.businessLine || "all";
}

function enrichItem(item, layer) {
  const enriched = {
    ...item,
    knowledgeLayer: layer,
    businessLine: defaultBusinessLine(layer, item),
    applicablePersonaIds: mapPersonaIds(item),
    applicableAudienceIds: toArray(item.applicableAudienceIds || item.audienceIds),
    scenarioTags: toArray(item.scenarioTags),
    campaignTags: toArray(item.campaignTags),
    accountTierTags: toArray(item.accountTierTags),
  };
  return enriched;
}

function enrichFile(fileName, raw, layer) {
  const base = { ...raw, version: "4.0", knowledgeLayer: layer, migratedFrom: "ai-knowledge-base-v3.3" };
  if (Array.isArray(raw.items)) {
    base.items = raw.items.map((item) => enrichItem(item, layer));
  }
  if (fileName === "brand-voice.json" && Array.isArray(raw.items)) {
    base.defaultBusinessLine = raw.defaultBusinessLine || "weisec";
  }
  return base;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error("Source not found:", SOURCE);
    process.exit(1);
  }

  if (fs.existsSync(OUT)) {
    fs.rmSync(OUT, { recursive: true, force: true });
  }
  fs.mkdirSync(OUT, { recursive: true });

  const filesManifest = {};

  for (const [fileName, layer] of Object.entries(FILE_LAYER)) {
    const srcPath = path.join(SOURCE, fileName);
    if (!fs.existsSync(srcPath)) {
      console.warn("Skip missing:", fileName);
      continue;
    }
    const raw = readJson(srcPath);
    const enriched = enrichFile(fileName, raw, layer);
    const relOut = `${LAYER_DIRS[layer]}/${fileName}`;
    writeJson(relOut, enriched);

    const key = fileName.replace(/\.json$/, "").replace(/-/g, "_");
    const manifestKey = {
      "compliance_rules": "complianceRules",
      "compliance_rewrite_rules.cleaned": "rewriteRules",
      "platform_rules": "platformRules",
      "risk_disclaimers": "riskDisclaimers",
      "brand_voice": "brandVoice",
      "visual_guidelines": "visualGuidelines",
      "product_features": "productFeatures",
      "content_templates": "contentTemplates",
      "phrase_library": "phraseLibrary",
      "audience_profiles": "audienceProfiles",
    }[key] || key;
    filesManifest[manifestKey] = relOut.replace(/\\/g, "/");
  }

  const schema = {
    version: "4.0",
    language: "zh-CN",
    purpose: "Layered Licaitong & WeSec Xiaohongshu knowledge base for scoped retrieval.",
    knowledgeLayers: {
      L0_shared: "合规、平台规则、全局免责 — businessLine 通常为 all，全业务线共用",
      L1_brand: "品牌调性、视觉规范 — 按 businessLine 分叉",
      L2_product: "产品功能与植入事实 — 必须按 businessLine 分叉",
      L3_content_pattern: "内容模板与话术 — businessLine × contentType",
      L4_audience: "受众画像 — businessLine × audience，与人设库 personas 关联",
      L5_persona: "表达层在 personas/ 目录，通过 applicablePersonaIds 关联",
      L6_scenario: "预留：场景包、活动战役、账号层级表达策略",
    },
    commonFields: [
      "id",
      "knowledgeLayer",
      "businessLine",
      "priority",
      "applicableContentTypes",
      "applicablePersonaIds",
      "applicableAudienceIds",
      "scenarioTags",
      "campaignTags",
      "accountTierTags",
      "promptSummary",
    ],
    retrievalDimensions: {
      required: ["businessLine", "contentType", "promptTask"],
      optional: [
        "targetUser",
        "audienceId",
        "personaId",
        "selectedFeatureIds",
        "embedLevel",
        "templateId",
        "phraseGroupId",
        "campaignId",
        "scenarioPackId",
        "accountTier",
      ],
    },
    entities: readJson(path.join(SOURCE, "schema.json")).entities,
  };
  writeJson("schema.json", schema);

  const index = {
    version: "4.0",
    name: "Tencent Licaitong & WeSec Xiaohongshu AI Knowledge Base",
    generatedAt: new Date().toISOString().slice(0, 10),
    migratedFrom: "ai-knowledge-base-v3.3",
    architecture: "single-kb-multi-layer",
    layers: {
      L0_shared: {
        label: "共用内核",
        scope: "all",
        files: [
          filesManifest.complianceRules,
          filesManifest.rewriteRules,
          filesManifest.platformRules,
          filesManifest.riskDisclaimers,
        ].filter(Boolean),
      },
      L1_brand: {
        label: "品牌层",
        scope: "businessLine",
        files: [filesManifest.brandVoice, filesManifest.visualGuidelines].filter(Boolean),
      },
      L2_product: {
        label: "产品层",
        scope: "businessLine",
        files: [filesManifest.productFeatures].filter(Boolean),
      },
      L3_content_pattern: {
        label: "内容模式层",
        scope: "businessLine × contentType",
        files: [filesManifest.contentTemplates, filesManifest.phraseLibrary].filter(Boolean),
      },
      L4_audience: {
        label: "受众层",
        scope: "businessLine × audience",
        files: [filesManifest.audienceProfiles].filter(Boolean),
      },
      L5_persona: {
        label: "表达层（外部）",
        scope: "personas/",
        note: "口吻与结构在 personas/standards，通过 applicablePersonaIds 与 KB 关联",
      },
      L6_scenario: {
        label: "场景层（预留）",
        scope: "scenarioTags / future scenario-packs.json",
        files: [],
      },
    },
    files: filesManifest,
    recommendedPromptRetrieval: {
      creativeAngles: [
        "L1 brandVoice by businessLine",
        "L3 1-2 contentTemplates",
        "L2 2-4 productFeatures",
        "L3 1 phraseLibrary group",
        "L0 required riskDisclaimers",
        "L0 high risk complianceRules",
      ],
      contentGeneration: [
        "L1 brandVoice by businessLine",
        "L3 1-2 contentTemplates",
        "L2 2-4 productFeatures by embedLevel",
        "L3 1 phraseLibrary group",
        "L0 riskDisclaimers + complianceRules + platformRules",
        "optional L4 audienceProfile by targetUser",
        "optional L5 persona via personaId (personas/)",
      ],
      complianceReview: [
        "L0 complianceRules",
        "L0 rewriteRules",
        "L0 riskDisclaimers",
        "L0 platformRules",
        "L1 brandVoice.avoidExpressions",
      ],
      coverGeneration: [
        "L1 visualGuidelines",
        "L3 contentTemplates.coverTextPatterns",
        "L0 platformRules.image",
        "L0 complianceRules",
      ],
    },
  };
  writeJson("index.json", index);

  const readme = `# 腾讯理财通 & 微证券小红书 AI 知识库 v4.0

由 \`ai-knowledge-base-v3.3\` 经 \`npm run build:kb:v4\` 迁移生成。

## 架构原则

**一套知识库、分层资产、按维度检索** — 不拆成两套物理副本。

| 层级 | 目录 | 共用/分叉 |
|------|------|-----------|
| L0 共用内核 | \`layers/L0-shared/\` | 合规、平台、改写、全局免责 |
| L1 品牌层 | \`layers/L1-brand/\` | 按 businessLine |
| L2 产品层 | \`layers/L2-product/\` | 按 businessLine |
| L3 内容模式 | \`layers/L3-content-pattern/\` | businessLine × contentType |
| L4 受众层 | \`layers/L4-audience/\` | businessLine × audience |
| L5 表达层 | \`personas/\`（外部） | 通过 applicablePersonaIds |
| L6 场景层 | 预留 scenarioTags | 未来扩展 |

## 构建

\`\`\`bash
npm run build:kb:v4
\`\`\`

## 检索维度

见 \`schema.json\` → \`retrievalDimensions\`。当前引擎已实现 businessLine、contentType、targetUser、featureIds、embedLevel；personaId / scenarioPackId 等为预留字段。

## 详细说明

见 [docs/C3_KB_V4_ARCHITECTURE.md](../docs/C3_KB_V4_ARCHITECTURE.md)
`;
  fs.writeFileSync(path.join(OUT, "README.md"), readme, "utf8");

  console.log("Built ai-knowledge-base-v4.0:");
  console.log("  layers:", Object.keys(LAYER_DIRS).length);
  console.log("  files:", Object.keys(filesManifest).length);
  console.log("  output:", OUT);
}

main();
