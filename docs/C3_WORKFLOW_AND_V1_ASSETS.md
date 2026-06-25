# C3 Copilot 工作台：V0 工作流与 V1 知识库 / 人设库

本文档用于对外介绍（如腾讯老师产品迭代沟通）和团队内部对齐，说明：

1. **V0 工作台**保留了什么、用户如何操作、系统如何跑通闭环；
2. **V1 新增**的知识库（`ai-knowledge-base-v3.3`）与人设库（`personas`）如何构建、如何被 Prompt 引擎调用，以及后续迭代方向。

---

## 1. 产品定位

C3 Copilot 是面向 **腾讯微证券 / 理财通小红书运营** 的内容创作助手。

- **做什么**：根据 Brief（内容类型、主题、人群、产品功能、素材）生成可编辑的小红书财经草稿，并完成合规审查。
- **不做什么**：不自动发布、不做交易建议、不替代人工终审。
- **技术形态**：Next.js 工作台 + Prompt Engine + 结构化知识检索 + 外部 LLM / 图片 / 热点 API。

---

## 2. V0 工作流介绍

V0 从 G12 迁移而来，核心是 **五步创作闭环**。工作流层在 V1 中基本保持不变，底层资产（知识库、人设）做了结构化升级。

### 2.1 五步流程

```text
1. API 配置 → 2. 类型/素材 → 3. 创意角度 → 4. 内容生成 → 5. 审核/草稿
```

| 步骤 | 用户操作 | 系统行为 |
|------|----------|----------|
| **1. API 配置** | 填写文字 / 图片 / 热点搜索 API Key（仅存浏览器 localStorage） | 未配置文字 API 时进入「演示模式」，用本地 mock 数据跑通全流程 |
| **2. 类型/素材** | 选择内容类型、目标人群、主推产品功能；手动粘贴或搜索热点素材 | 从知识库 API 拉取产品功能列表并按内容类型过滤；素材写入 Brief |
| **3. 创意角度** | 设置博主层级、植入强度、篇幅、生成数量；生成并勾选创意角度 | Prompt Engine 检索知识库 → 组装 Prompt → 调用 LLM 输出角度矩阵 JSON |
| **4. 内容生成** | 查看正文、标题、封面文案、图片 Prompt；可选调用图片 API | 对每个选中角度：先内容生成，再合规审查（两次 LLM 调用） |
| **5. 审核/草稿** | 人工复核合规摘要；保存到本地草稿箱 | 展示 `publishReadiness`；发布与数据复盘留待后续版本 |

**Brief（任务简报）** 贯穿全流程，记录：内容类型、主题、目标人群、已选功能、素材、角度、生成参数等。左侧 Task Brief 面板实时展示当前上下文。

### 2.2 五种内容类型

| 类型 | 说明 | 是否依赖热点 |
|------|------|--------------|
| 炒股教程类 | 选股、盯盘、压力位等干货教学 | 否 |
| 理财干货类 | 基金、理财技巧、资产配置表达 | 否 |
| 个人经验类 | 心得、避坑、生活化投资场景 | 否 |
| 热点分析类 | 结合市场或政策热点做降维解读 | 是（可 Tavily 搜索或手动粘贴） |
| 品牌种草类 | 微证券 / 理财通功能体验与使用教程 | 否 |

### 2.3 核心调用链路

```text
工作台 UI
  → POST /api/prompt-engine  （action: creativeAngles | contentGeneration | complianceReview）
      → knowledge-retriever.retrieveKnowledge(brief)   // 按任务检索 KB 片段
      → 填充 prompts/*.md 模板
      → 返回 system + user messages
  → POST /api/llm-proxy       // 转发至 DeepSeek 等兼容 API
  → 解析 JSON 结果 → 展示 / 存草稿
```

全局 System Prompt（`prompts/system.md`）对所有任务生效，硬性约束包括：

- 不得荐股、承诺收益、给出买卖信号或私信导流；
- 涉及投资内容必须含风险提示；
- 输出必须为合法 JSON，并包含 `debugKnowledgeUsed`；
- 信息不足时保守生成，不编造产品事实。

### 2.4 演示模式 vs 完整模式

| 模式 | 条件 | 表现 |
|------|------|------|
| 演示模式 | 未配置文字 API Key | 本地 mock 角度 / 正文 / 合规，流程可演示，内容差异化有限 |
| 完整模式 | 已配置文字 API | 真实知识检索 + LLM 生成 + 合规二次审查 |
| 图片（可选） | 配置图片 API Key | Step 4 根据 `imagePromptSuggestions` 调用 `/api/image-proxy` |

### 2.5 V0 明确暂未迁移的能力

以下 G12 能力在 V0/V1 当前工作台中 **尚未接入**：

- 图片实验室完整历史版本
- 资产库批量管理
- 数据复盘
- 自动发布

当前版本聚焦：**创作闭环 + 合规审查 + 本地草稿**。

---

## 3. V1 知识库（`ai-knowledge-base-v3.3`）

### 3.1 为什么要有结构化知识库

V0 早期主要依赖 Markdown 大段文档或零散配置。V1 将腾讯业务知识拆成 **可检索、可版本化、可共建** 的 JSON 资产，解决三个问题：

1. **Prompt 过长**：不再整库塞进上下文，而是按任务动态选取 2–4 条功能、1–2 个模板、1 组话术；
2. **合规可控**：高风险规则与必选风险提示始终注入；
3. **双业务线**：理财通 / 微证券品牌、产品、话术在同一套 schema 下分业务线管理。

### 3.2 目录与文件说明

知识库根目录：`ai-knowledge-base-v3.3/`（由 `docs/knowledgebase/` 源稿经 `npm run build:kb` 生成）。

| 文件 | 用途 |
|------|------|
| `index.json` | 版本入口、文件索引、推荐检索策略 |
| `schema.json` | 字段规范 |
| `brand-voice.json` | 理财通 / 微证券双品牌调性 |
| `product-features.json` | 双业务线产品功能（痛点、场景、植入话术、禁忌表达） |
| `content-templates.json` | 图文结构模板（USER / PRODUCT 系列） |
| `phrase-library.json` | 按用户群与内容类型组织的话术库 |
| `compliance-rules.json` | 金融合规规则（可检索项） |
| `compliance-rewrite-rules.cleaned.json` | 高风险表达替代表达库 |
| `risk-disclaimers.json` | 标准风险提示语句 |
| `platform-rules.json` | 小红书平台规则 |
| `visual-guidelines.json` | 封面与配图视觉规范 |
| `audience-profiles.json` | 详细受众画像（与 `personas/audiences.json` 同步） |

检索器优先读取 v3.3，若不存在则回退至 `ai-knowledge-base-v3.2`。

### 3.3 构建流程

```text
1. 编辑 docs/knowledgebase/ 下的 Markdown 源稿
2. 运行 npm run build:kb
3. 重启开发服务（或重新部署）
```

构建脚本（`scripts/build-knowledge-base.mjs`）会：

- 将源稿解析为上述 JSON 文件；
- 同步更新 `personas/audiences.json` 中的受众定义；
- 写入 `index.json` 版本号与生成时间。

**维护原则**：运营 / 产品 / 合规在源稿层共建；工程侧只负责构建与检索逻辑，不手改生成产物（除非紧急 hotfix）。

### 3.4 调用思路（检索，而非全量注入）

入口函数：`src/lib/knowledge-retriever.ts` → `retrieveKnowledge(input)`。

检索输入主要来自 Brief：

- `contentType`：内容类型
- `targetUser`：目标人群
- `embedLevel`：产品植入强度（none / low / medium / high）
- `selectedFeatureIds`：用户勾选的产品功能
- `templateId`：创意角度推荐模板（内容生成时）
- `promptTask`：任务类型（creative-angles / content-generation / compliance-review 等）
- `businessLine`：业务线（默认微证券 `weisec`，可切换理财通 `licaitong`）

检索输出（裁剪后注入 Prompt）：

| 资产类型 | 选取逻辑 | 典型数量 |
|----------|----------|----------|
| 产品功能 | 按类型、人群、勾选 ID 打分排序；受 `embedLevel` 限制 | 0–4 条 |
| 内容模板 | 匹配内容类型 + 人群 + 角度推荐 templateId | 1–2 条 |
| 话术组 | 按内容类型匹配 phrase group | 1 组 |
| 合规规则 | 6 条核心高风险规则 + 任务相关规则 | 动态 |
| 改写规则 | 与已选合规规则关联 | ≤6 条 |
| 品牌语气 | 按 businessLine + targetUser | 1 份 |
| 风险提示 | 按类型 / 业务线，含全局必选句 | 1–3 条 |
| 平台规则 | 内容生成 / 封面任务按需 | 4–5 条 |
| 视觉规范 | 封面相关任务 | ≤2 条 |

每次检索结果附带 `debugKnowledgeUsed`，记录实际用到的 KB 版本、路径与各资产 ID，便于调试与审计。

### 3.5 各 Prompt 任务的 KB 使用方式

| Prompt Action | 主要注入的 KB 内容 |
|---------------|-------------------|
| `creativeAngles` | 产品功能、模板、品牌语气、话术、合规规则 |
| `contentGeneration` | 上述 + 平台规则 + 必选风险提示 + 选中角度与素材 |
| `complianceReview` | 合规规则、改写规则、风险提示、平台规则、品牌禁忌表达 |
| `coverSuggestions` | 视觉规范、模板封面模式、图片相关平台规则 |

**调用建议**（与 `index.json` 中 `recommendedPromptRetrieval` 一致）：

- 不要把完整知识库一次性塞进 Prompt；
- 内容生成：2–4 条功能 + 1–2 模板 + 1 组话术 + 高风险合规 + 必选风险提示；
- 合规审查：规则 + 改写库 + 风险提示为主；
- 封面生成：视觉规范 + 封面话术模式 + 图片合规。

### 3.6 工作台中的 KB 暴露点

- **Step 2**：`/api/knowledge-base/list` 返回产品功能列表，供用户勾选主推功能；
- **Step 3–4**：用户不直接感知检索，由 Prompt Engine 在服务端完成；
- **页头 / 侧栏**：展示 KB 版本号与各资产数量统计。

---

## 4. V1 人设库（`personas`）

### 4.1 为什么需要人设库

知识库解决 **「写什么事实、守什么合规」**；人设库解决 **「用什么口吻、什么结构写」**。

没有分层时，同一 Brief 容易产出同质化「AI 腔」文案。V1 引入 **五套内容使命正交的人设**，每套有独立身份、口吻、结构、产品植入风格和防同质化规则。

### 4.2 目录结构

```text
personas/
  registry.json          # 人设注册表 + 路由表 routingTable
  audiences.json         # 受众画像（与 KB audience-profiles 同步）
  standards/
    peer_diary.json      # 同龄人日记（含 campus / salary / literary 变体）
    concept_teacher.json # 理财教学博主
    hotspot_observer.json# 市场观察员
    sober_guard.json     # 清醒搞钱女孩
    family_planner.json  # 家庭 CFO
```

### 4.3 五套人设概览

| ID | 名称 | 适用内容类型 | 核心使命 |
|----|------|--------------|----------|
| `peer_diary` | 同龄人日记 | 个人经验、品牌种草 | 生活化记录，降低距离感 |
| `concept_teacher` | 理财教学博主 | 炒股教程、理财干货 | 概念翻译，讲「怎么理解」不讲「买什么」 |
| `hotspot_observer` | 市场观察员 | 热点分析 | 热点降维解读，公开信息整理 |
| `sober_guard` | 清醒搞钱女孩 | 理财干货、热点 | 批判跟风，避坑判断 |
| `family_planner` | 家庭 CFO | 理财干货、品牌种草 | 家庭长期规划视角 |

每套标准文件（`standards/*.json`）包含：

- `identity` / `style`：身份、口吻、用词偏好
- `differentiation`：标题公式、结构模式、与其他人设的 `contrastWithPersonas`
- `antiHomogeneity`：禁止表达、勿模仿口吻、必须有标记
- `prompts`：专属 system / user 模板
- `rules`：人格、合规、篇幅等约束
- `variants`（可选）：同一使命下的细分变体（如同龄人日记的校园 / 打工人 / 职场随笔）

### 4.4 构建与维护流程

人设库 **不是** 由 `build:kb` 一键生成的，而是独立资产，维护方式：

1. **标准编辑**：直接维护 `personas/standards/*.json`，或在 archives + matrix 基础上用脚本重建：
   - `scripts/build-persona-standards.mjs`
   - `scripts/rebuild-personas-from-archives.mjs`
   - `scripts/dehomogenize-personas.mjs`
   - `scripts/apply-persona-analysis.mjs`
2. **受众同步**：`npm run build:kb` 会将 KB 中的 `audience-profiles` 合并回 `personas/audiences.json`；
3. **注册**：新人设需在 `registry.json` 中登记 `id`、`file`、`contentTypes`、`compatibleAudienceIds`。

`registry.json` 中的 `routingTable` 描述推荐路由，例如：

- 「要讲懂一个概念」→ `concept_teacher`
- 「有新闻/热点要解读」→ `hotspot_observer`
- 「要批判跟风/避坑」→ `sober_guard`

后续可在 UI 或自动路由层实现「Brief → 推荐人设」。

### 4.5 调用思路

人设相关逻辑在 `src/lib/persona-loader.ts`，Prompt 组装在 `src/lib/prompt-engine.ts`。

#### API 入口

| 接口 / Action | 说明 |
|---------------|------|
| `GET /api/personas/list` | 返回 active 人设列表 + audiences |
| `POST /api/prompt-engine` `action: personaContent` | 人设驱动的内容生成 |

#### Prompt 组装方式（`personaContent`）

```text
system = prompts/system.md          // 全局合规与输出约束
       + persona.prompts.system     // 人设专属 system（或 variant 覆盖）
       + variant.spAddon（如有）

user   = persona.prompts.content.user  // 填充 topic、角度、素材等变量
       + output schemaHint
       + antiHomogeneity 约束

并行检索 KB（与 contentGeneration 相同）：
  selectedFeatures, selectedTemplates, phraseGroup,
  complianceRules, riskDisclaimers, platformRules, brandVoice
```

人设 **不替代** 知识库，而是叠加在 KB 之上：

- KB 提供产品事实、合规边界、模板与话术；
- Persona 控制叙事角度、语言风格、结构节奏与差异化。

`BriefInput` 已预留 `personaId` / `personaVariant` 字段；类型定义见 `src/lib/types.ts`。

### 4.6 当前接入状态（重要）

| 能力 | 状态 |
|------|------|
| 人设标准 JSON + registry | ✅ 已完成 |
| `/api/personas/list` | ✅ 已完成 |
| `personaContent` Prompt 路径 | ✅ 后端已通 |
| 工作台 UI 人设选择 | ⏳ 待接入（当前仍走通用 `contentGeneration`） |
| Brief → 人设自动推荐 | ⏳ 待实现（routingTable 已就绪） |

**近期迭代建议**：

1. Step 2 增加「博主人设」选择，按 `contentType` 过滤可用人设；
2. 选中人设后，内容生成改调 `personaContent` 而非 `contentGeneration`；
3. 可选：根据 `targetUser` + `contentType` 调用 routingTable 给出默认推荐。

---

## 5. 三层架构总览（对外介绍用）

```text
┌─────────────────────────────────────────────────────────┐
│  工作流层（V0 继承 G12）                                  │
│  API 配置 → Brief → 角度 → 生成 → 合规 → 草稿              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  知识层（V1：ai-knowledge-base-v3.3）                     │
│  产品 / 合规 / 模板 / 话术 / 受众 → 检索注入 Prompt        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  表达层（V1：personas）                                   │
│  五套正交人设 + 变体 + 防同质化 → 叠加在 KB 之上            │
└─────────────────────────────────────────────────────────┘
```

一句话：**V0 保证运营熟悉的五步闭环；V1 在闭环之下补上「可控的知识」和「差异化的口吻」。**

---

## 6. 内容类型 × 知识库 × 人设 对照

| 内容类型 | KB 常见模板 | 推荐人设 |
|----------|-------------|----------|
| 炒股教程类 | beginner-guide | concept_teacher |
| 理财干货类 | content-list | concept_teacher / sober_guard / family_planner |
| 个人经验类 | scenario-seeding | peer_diary |
| 热点分析类 | content-list | hotspot_observer / sober_guard |
| 品牌种草类 | scenario-seeding, tool-review | peer_diary / family_planner |

热点类内容建议配合 Tavily 或手动素材；未配置热点 API 时可降级为手动输入。

---

## 7. 相关文件索引

| 路径 | 说明 |
|------|------|
| `src/components/workspace/CopilotWorkbench.tsx` | 五步工作台 UI |
| `src/lib/prompt-engine.ts` | Prompt 组装（含 personaContent） |
| `src/lib/knowledge-retriever.ts` | KB 检索与 list 视图 |
| `src/lib/persona-loader.ts` | 人设加载与 Prompt 构建 |
| `prompts/*.md` | 各任务 Prompt 模板 |
| `ai-knowledge-base-v3.3/` | 结构化知识库产物 |
| `personas/` | 人设标准库 |
| `docs/knowledgebase/` | KB 源稿（build 输入） |
| `scripts/build-knowledge-base.mjs` | KB 构建脚本 |
| `docs/C3_V0_MIGRATION_PLAN.md` | V0 迁移技术计划 |

---

## 8. 版本说明

| 版本 | 工作流 | 知识库 | 人设 | UI |
|------|--------|--------|------|-----|
| V0 | G12 五步闭环 | v3.2 JSON 检索 | 无 | 完整五步 |
| V1 | 同 V0 | v3.3，双业务线，受众同步 | 五套标准 + API | 人设 UI 待接 |

文档随代码演进更新；KB 版本号以 `ai-knowledge-base-v3.3/index.json` 为准，人设版本以 `personas/registry.json` 为准。
