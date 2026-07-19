# C3-V3 工程结构

## 页面与路由

- `/`：开始创作
- `/drafts`：草稿箱
- `/api/prompt-engine`：统一 Prompt 构建与阶段校验
- `/api/eastmoney-proxy`：财经热点搜索
- `/api/llm-proxy`：文字模型代理
- `/api/image-proxy`：图片模型代理与生图门禁

## 生成链路

1. 用户确认业务线、Offer、功能、场景、读者、人设、植入强度和可选素材。
2. 前端按 8 个创意轴采样 6 组坐标，并结合历史坐标避重。
3. Prompt Engine 将坐标与 Brief、场景、热点、产品层级和人设规则合并。
4. 用户确认一个或多个角度后逐篇生成图文或视频脚本。
5. 每篇内容独立执行结构检查与合规审查。
6. 图文内容可进入视觉计划与生图；视频脚本直接进入预览审核。

## 关键模块

- `src/lib/creative/`：创意维度与采样器
- `src/lib/prompt-engine.ts`：Prompt 编排
- `src/lib/topic-materials.ts`：热点/场景素材路由
- `src/lib/narrative-anti-template.ts`：去模板化约束
- `src/lib/video-script-routing.ts`：视频模块组合
- `src/lib/image-prompt-utils.ts`：图片 Prompt 清洗与组装
- `src/hooks/useMatrixWorkspaceSession.ts`：五阶段会话与持久化状态

内部代码仍沿用 `matrix` 作为工作流协议标识，以兼容服务端阶段门禁；所有用户界面统一显示“开始创作”。
