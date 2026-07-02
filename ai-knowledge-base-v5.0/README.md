# 腾讯理财通 & 微证券小红书 AI 知识库 v5.0

由 `ai-knowledge-base-v4.0` 复制并按 **业务线子目录** 重组。

## 与 v4.0 的差异

v5.0 在 **有 businessLine 分叉的层级** 下，统一采用与 `L1-brand` 相同的目录约定：

| 子目录 | 含义 |
|--------|------|
| `licaitong/` | 理财通专属资产 |
| `weizhengquan/` | 微证券（`businessLine: weisec`）专属资产 |
| `a_shared/` | 仅 `businessLine: all` 的共用资产（L0 / L3） |

## 层级目录

| 层级 | 目录结构 |
|------|----------|
| L0 共用内核 | `layers/L0-shared/a_shared/` + 各业务线 `risk-disclaimers` 补充 |
| L1 品牌层 | `layers/L1-brand/licaitong/` · `weizhengquan/` |
| L2 产品层 | `layers/L2-product/licaitong/`（含 offer-packs）· `weizhengquan/` |
| L3 内容模式 | `a_shared/` + `licaitong/` + `weizhengquan/` |
| L4 表达上下文 | `target-readers.json` + `persona-options.json` · 按业务线 |
| L5 表达层 | `personas/`（外部） |
| L6 场景层 | 预留 |

## 重组脚本

```bash
node scripts/split-knowledge-base-v5.mjs
```

## 检索约定

- 按 `businessLine` 选子目录：`licaitong` → `licaitong/`，`weisec` → `weizhengquan/`
- L3 的 `licaitong/`、`weizhengquan/` bundle 已合并 `shared`（all）条目 + 业务线专属条目
- L0 合规/平台/改写规则在 `a_shared/`；免责文案按业务线读对应子目录

## 索引

见 [`index.json`](./index.json) 与 [`schema.json`](./schema.json)。
