# 腾讯理财通 & 微证券小红书 AI 知识库 v4.0

由 `ai-knowledge-base-v3.3` 经 `npm run build:kb:v4` 迁移生成。

## 架构原则

**一套知识库、分层资产、按维度检索** — 不拆成两套物理副本。

| 层级 | 目录 | 共用/分叉 |
|------|------|-----------|
| L0 共用内核 | `layers/L0-shared/` | 合规、平台、改写、全局免责 |
| L1 品牌层 | `layers/L1-brand/` | 按 businessLine |
| L2 产品层 | `layers/L2-product/` | 按 businessLine |
| L3 内容模式 | `layers/L3-content-pattern/` | businessLine × contentType |
| L4 受众层 | `layers/L4-audience/` | businessLine × audience |
| L5 表达层 | `personas/`（外部） | 通过 applicablePersonaIds |
| L6 场景层 | 预留 scenarioTags | 未来扩展 |

## 构建

```bash
npm run build:kb:v4
```

## 检索维度

见 `schema.json` → `retrievalDimensions`。当前引擎已实现 businessLine、contentType、targetUser、featureIds、embedLevel；personaId / scenarioPackId 等为预留字段。

## 详细说明

见 [docs/C3_KB_V4_ARCHITECTURE.md](../docs/C3_KB_V4_ARCHITECTURE.md)
