# C3-V2.2 · 小红书内容运营工作台

> 基于 V2.1-main 升级，本版核心改造：**制图链路重构为「视觉计划 + 次级制图工作台」**，并适配火山方舟 **Seedream 5.0 pro** 图像模型。

---

## 一、这一版做了什么

### 1. 制图链路重构
- 移除旧的 `ImagePromptLab`（"1 张封面 + N 段拼图"式的旧交互）。
- 内容结果页 `ContentResultsPanel` 新增 **「开始制图」入口卡片 + 缩略图矩阵**，点击进入次级工作台。
- 新增次级组件 `VisualPlanStudio`：
  - **上方**：整体视觉规范（大号 Textarea，控制统一色调 / 字体 / 构图 / 合规约束），实时可编辑。
  - **中间**：视觉计划矩阵（每张一卡片，含图位 / 文案 / 图片提示词，可单卡重生）。
  - **下方**：一键生成整套图（受整体规范约束）+ 保存到草稿箱 + 批量下载。

### 2. Prompt & 后端管线
- 新增 `prompts/visual-plan.md`：约束**封面标题短且带钩子（8–14 汉字）**，内容图按 `hook-context / key-insight / action-cta` 有机分点，图与图之间有 `connection` 衔接字段。
- `prompt-engine` 注册 `visualPlan` action，`/api/prompt-engine` 增加对应分支。
- `/api/image-proxy` 接收 `overallStyle / coverText / role`，**服务端合成最终 prompt**（避免前端逃逸整体规范）。
- 新增 `/api/image-save`：图片生成成功后立即落地到 `public/generated/{contentId}/`，避免上游 URL 24h 过期。
- 两个 API 路由显式设置 `runtime = "nodejs"` + `maxDuration`（120s / 90s），适配 Seedream 5.0 pro **单张 60–80s** 的高清出图耗时。

### 3. 类型与工具
- `src/lib/types.ts`：新增 `VisualPlan` / `VisualPlanItem`，`GeneratedImage` 扩字段。
- `src/lib/visual-plan-utils.ts`：`parseVisualPlanPayload` / `buildFallbackVisualPlan` / `estimateContentImageCount`。
- `BusinessLineWorkbench`：新增 `contentSubView` 挂载 Studio；`updateResultImage` 兼容 `imageIndex`；新增 `updateResultVisualPlan`。
- `DraftBoxPanel`：展示整套图 + 单张原图 / 下载 / 复制。

### 4. 其他
- `.gitignore` 忽略 `public/generated`。
- 全局 lint 0 error。

---

## 二、目录结构（打包内容）

```
C3-V2.2/
├── ai-knowledge-base-v5.0/   # 知识库 JSON（35 个业务 JSON + 2 个说明 MD）
├── docs/                     # 项目文档
├── prompts/                  # 所有 Prompt 模板（含新增 visual-plan.md）
├── public/                   # 静态资产（不含运行时生成的 generated/）
├── scripts/                  # 辅助脚本
├── src/                      # 前后端源码（Next.js App Router）
│   ├── app/
│   │   ├── api/
│   │   │   ├── config/status/     # 配置就绪状态
│   │   │   ├── image-proxy/       # 图片生成代理（maxDuration=120s）
│   │   │   ├── image-save/        # 图片落地存档（maxDuration=90s）
│   │   │   ├── llm-proxy/         # 文本 LLM 代理
│   │   │   ├── prompt-engine/     # 提示词引擎路由
│   │   │   └── tavily-proxy/      # 热点搜索（可选）
│   │   └── ...
│   ├── components/
│   │   └── workspace/
│   │       ├── VisualPlanStudio.tsx      # ★ 新增：次级制图工作台
│   │       ├── ContentResultsPanel.tsx   # 制图入口 + 缩略图矩阵
│   │       ├── BusinessLineWorkbench.tsx # 主工作台（挂 Studio）
│   │       ├── DraftBoxPanel.tsx         # 草稿箱（整套图展示）
│   │       └── ...
│   └── lib/
│       ├── visual-plan-utils.ts   # ★ 新增
│       ├── server-api-config.ts   # 环境变量集中读取
│       ├── prompt-engine.ts
│       └── types.ts
├── .env.example              # 环境变量模板（含 Seedream 5.0 pro 提示）
├── .gitignore
├── components.json
├── next.config.ts
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tsconfig.json
└── README-V2.2.md            # 本文件
```

> 打包**不包含**：`node_modules/`（重装即可）、`.next/`（构建缓存）、`.env.local`（含真实密钥，需自行创建）、`public/generated/`（运行时产物）、`.DS_Store`。

---

## 三、快速上手

### 1. 安装依赖

```bash
cd C3-V2.2
npm install
```

要求：Node.js ≥ 18.17（推荐 20.x）。

### 2. 配置 API Key

复制 `.env.example` 为 `.env.local`，填入你的密钥：

```bash
cp .env.example .env.local
```

`.env.local` 至少需要：

```bash
# 文字生成（必填，服务端读取）
LLM_API_KEY=sk-你的deepseek-key
LLM_API_URL=https://api.deepseek.com/v1/chat/completions
LLM_MODEL=deepseek-chat

# 图片生成（推荐）：火山方舟 Seedream 5.0 pro
IMAGE_API_KEY=ark-xxxxxxxx
IMAGE_API_URL=https://ark.cn-beijing.volces.com/api/v3/images/generations
IMAGE_MODEL=doubao-seedream-5-0-pro-260628
IMAGE_API_FORMAT=volcengine

# 热点搜索（可选，跳过不影响主流程）
TAVILY_API_KEY=
```

**注意事项：**
- `IMAGE_MODEL` 必须与你在方舟控制台"开通管理"里已开通的 **Model ID** 一致。如果你开通的是别的版本（4.5 / 4.0）或推理接入点 `ep-xxx`，直接替换此字段即可，代码是透传的。
- `IMAGE_API_URL` 必须是 `/api/v3/images/generations`，不是 OpenAI 风格的 `/v1/images/generations`。代码 `normalizeImageApiUrl` 会做纠错，但建议直接写对。
- 想切换到 OpenAI DALL·E：`IMAGE_API_FORMAT=openai` + `IMAGE_API_URL=https://api.openai.com/v1/images/generations` + `IMAGE_MODEL=dall-e-3`。

### 3. 启动开发服务

```bash
npm run dev
```

默认监听 3000 端口，被占用时会自动顺延 3001 / 3002。启动后打开对应地址：http://localhost:3000

### 4. 走一遍完整流程

1. 选择业务线（微证券 / 理财通）
2. Step1：创作配置（选题 / 场景 / 读者）
3. Step2：生成 / 选择创意角度
4. Step3：生成正文
5. 点击结果卡上的 **「开始制图」** → 进入次级工作台
6. 点击 **「生成视觉计划」** → 得到 6~8 张的规划（封面 + 内容页）
7. 编辑"整体视觉规范"（想要的色调 / 字体等）
8. 点击 **「一次性生成整套图」** → 等待（Seedream 5.0 pro **单张约 60–80s**，并行执行）
9. 单卡不满意可 **「重新生成」**（仍受整体规范约束）
10. 满意后点 **「保存到草稿箱」** → 图会持久化到 `public/generated/{contentId}/`

---

## 四、性能与体感提示

| 模型 | 单张耗时 | 适用场景 |
|---|---|---|
| `doubao-seedream-5-0-pro-260628` | 60–80s | 最终交付，高清最佳质量 |
| `doubao-seedream-4-5-251128` | 3–8s | 快速调试 |
| `doubao-seedream-4-0-250828` | 3–5s | 快速调试 |

如果只是调试链路，可临时把 `IMAGE_MODEL` 换成 4.5 / 4.0（需在方舟控制台先开通），可以显著加快反馈闭环。

---

## 五、常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| 页面顶部红条"LLM API 未配置" | `.env.local` 没写 `LLM_API_KEY`，或改完没重启 dev | 补齐后 `Ctrl+C` 重启 `npm run dev` |
| 生图报 `ModelNotOpen` (HTTP 404) | 方舟账号还没开通对应模型 | 去 https://console.volcengine.com/ark 「开通管理」点开通 |
| 生图报 `InvalidEndpointOrModel.NotFound` | `IMAGE_MODEL` 拼错 | 到方舟控制台复制准确 Model ID |
| 生图超时 / fetch failed | 大概率网络问题或旧 dev server 缓存 | 停 dev 重启；或临时切 4.5 快速验证链路 |
| 端口冲突显示"未配置" | 浏览器访问了老项目的 3000 端口 | 看终端日志实际监听端口（3001 等），或先关旧 dev |

---

## 六、版本关系

- **C3-V2.1-main**：视觉计划链路开发中版本
- **C3-V2.2**（本版）：视觉计划链路完成、适配 Seedream 5.0 pro、超时策略修正、打包发布版

打包时**排除了**运行时产物（`node_modules`、`.next`、`public/generated`）和密钥文件（`.env.local`），可直接放到任意目录、`npm install && npm run dev` 复用。
