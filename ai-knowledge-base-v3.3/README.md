# 腾讯理财通 & 微证券小红书 AI 知识库 v3.3

由 `docs/knowledgebase/` 源稿经 `npm run build:kb` 生成，供 Prompt 引擎检索调用。

## 文件说明

- `index.json`：入口索引与推荐检索策略
- `schema.json`：字段规范
- `brand-voice.json`：理财通 / 微证券双品牌调性
- `product-features.json`：双业务线产品功能
- `content-templates.json`：图文结构模板（USER / PRODUCT 系列）
- `phrase-library.json`：按用户群与内容类型组织的话术库
- `compliance-rules.json`：金融合规规则（可检索项）
- `compliance-rewrite-rules.cleaned.json`：替代表达库
- `risk-disclaimers.json`：标准风险提示语句
- `platform-rules.json`：小红书平台规则
- `visual-guidelines.json`：封面与配图视觉规范
- `audience-profiles.json`：详细受众画像（与 `personas/audiences.json` 同步）

## 更新流程

1. 编辑 `docs/knowledgebase/` 下的 Markdown 源稿
2. 运行 `npm run build:kb`
3. 重启开发服务

## 调用建议

不要把完整知识库一次性塞进 Prompt。按 `businessLine`、`contentType` 和任务类型检索 2–4 条产品功能、1–2 个模板、1 组话术，并始终注入高风险合规规则与必选风险提示。
