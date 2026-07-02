# L4 表达上下文（Audience & Persona）

| 文件/目录 | 用途 |
|-----------|------|
| `target-readers.json` | 写给谁看（Brief 目标读者） |
| `persona-options.json` | 谁来说（Brief 人设选项、场景路由、UI 摘要） |
| `persona-standards/` | 完整生成标准：system/user prompt、变体、输出 schema |

**分工**

- **persona-options**：工作台选型、读者/场景匹配、`promptSummary` 等轻量字段
- **persona-standards**：内容生成时加载的完整口吻标准（按业务线独立维护，可各自充实）

运行时由 `src/lib/persona-loader.ts` 按 `businessLine` 读取对应目录。
