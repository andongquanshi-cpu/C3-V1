# C3 知识库 v4.0 架构说明

## 设计目标

1. **一套知识库**，不按业务线复制完整副本。
2. **共用与分叉清晰**：合规/平台共用；品牌/产品/内容按 `businessLine` 分叉。
3. **预留更深颗粒度**：受众、人设、场景、活动、账号层级等通过扩展字段接入，无需再拆物理库。

## 分层模型（L0–L6）

```text
L0_shared          合规规则、改写规则、平台规则、风险提示
    │              businessLine: all（全业务线注入）
    ├─ L1_brand    brand-voice, visual-guidelines
    ├─ L2_product  product-features（必须分线）
    ├─ L3_content  content-templates, phrase-library
    ├─ L4_audience audience-profiles
    ├─ L5_persona  personas/（外部库，ID 关联）
    └─ L6_scenario 预留 scenarioTags / scenario-packs.json
```

## 目录结构

```text
ai-knowledge-base-v4.0/
  index.json              # 版本、分层清单、files 路径、检索策略
  schema.json             # 字段规范与 retrievalDimensions
  README.md
  layers/
    L0-shared/
      compliance-rules.json
      compliance-rewrite-rules.cleaned.json
      platform-rules.json
      risk-disclaimers.json
    L1-brand/
      brand-voice.json
      visual-guidelines.json
    L2-product/
      product-features.json
    L3-content-pattern/
      content-templates.json
      phrase-library.json
    L4-audience/
      audience-profiles.json
```

## 共用 vs 分叉

| 资产 | 层级 | 策略 |
|------|------|------|
| compliance-rules | L0 | 共用，`appliesTo` 可按内容类型细分 |
| compliance-rewrite-rules | L0 | 共用 |
| platform-rules | L0 | 共用（小红书通用） |
| risk-disclaimers | L0 | 全局 + 可按业务线加强 |
| brand-voice | L1 | `weisec` / `licaitong` |
| visual-guidelines | L1 | 分线 |
| product-features | L2 | **必须分线** |
| content-templates | L3 | 分线 + contentType |
| phrase-library | L3 | 分线 + contentType |
| audience-profiles | L4 | 分线 + 受众 |
| personas | L5 | 独立 `personas/`，`applicablePersonaIds` 关联 |

## 检索地址（当前 + 预留）

```text
businessLine × contentType × promptTask     ← 已实现
  × targetUser
  × selectedFeatureIds
  × embedLevel
  × personaId          ← 预留（表达层）
  × audienceId         ← 预留
  × scenarioPackId     ← L6 预留
  × campaignId         ← L6 预留
  × accountTier        ← 博主层级等预留
```

引擎入口：`src/lib/knowledge-retriever.ts` → `retrieveKnowledge(input)`。

v4.0 通过 `index.json` 的 `files` 映射加载分层路径；检索逻辑与 v3.3 兼容。

## 条目扩展字段（v4.0 新增）

每条 `items[]` 可携带：

| 字段 | 用途 |
|------|------|
| `knowledgeLayer` | L0_shared … L4_audience |
| `businessLine` | weisec / licaitong / all |
| `applicablePersonaIds` | 关联 personas registry id |
| `applicableAudienceIds` | 关联受众 |
| `scenarioTags` | 场景包标签（L6 预留） |
| `campaignTags` | 活动标签（预留） |
| `accountTierTags` | tail / middle / head（预留） |

## 构建与更新

```bash
# 从 v3.3 迁移生成 v4.0（当前）
npm run build:kb:v4

# 从 Markdown 源稿生成 v3.3（原有）
npm run build:kb
```

后续可将 `docs/knowledgebase/` 源稿按 `shared/`、`weisec/`、`licaitong/` 组织，build 脚本直接产出 v4.0。

## 与 workbench 的关系

| Workbench 字段 | KB 层级 |
|----------------|---------|
| businessLine | L1–L4 分叉轴 |
| contentType | L3 模板/话术筛选 |
| selectedFeatureIds | L2 产品加权 |
| targetUser | L4 受众匹配 |
| personaId（待接 UI） | L5 personas |
| bloggerLevel（待接 KB） | L6 accountTierTags 预留 |

## 版本演进

| 版本 | 特点 |
|------|------|
| v3.2 | 微证券为主 JSON |
| v3.3 | 双业务线 `businessLine` 字段 |
| v4.0 | 分层目录 + 扩展字段 + index manifest + 预留检索维度 |
