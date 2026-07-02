# L4 表达上下文层

本层拆成两个正交维度，与 Brief / 工作台 UI 一致：

| 文件 | 维度 | Brief 字段 | 说明 |
|------|------|------------|------|
| `target-readers.json` | **目标读者** | `audienceTag` / `targetUser` | 写给谁看：痛点、信息习惯、安全/禁用表达 |
| `persona-options.json` | **博主人设** | `personaId` | 谁来说：身份、风格、场景路由、读者配对、植入与合规摘要 |

`persona-options` 与 `personas/standards` 的分工：

- **本层**：业务线选型卡片（UI 展示、RAG 摘要、场景/读者路由、`whenToUse`）
- **personas/standards**：完整 system prompt、变体骨架、输出 schema

**口吻与结构标准**不在本层，而在 `personas/standards/{personaId}.json`（原 L5 表达层）。

## 检索约定

- 生成内容时：**读者画像**来自 `target-readers`，**表达骨架**来自 `personas/standards`
- `persona-options` 用于 UI 推荐、场景/读者匹配，以及 `requiresHotspotMaterials` 等门禁
- `suitablePersonaIds` / `compatibleAudienceIds` 表示推荐组合，非强制绑定（Brief 里读者与人设弱关联）

## 理财通 vs 微证券

- **理财通**读者用 `audienceTag`（student / mama / white-collar）
- **微证券**读者用 `audienceId`（ws_audience_001 …），与 `business-line.ts` 的 targetUserSegments 对齐
