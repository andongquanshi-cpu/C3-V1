请基于已生成的财经图文内容，生成 3 个封面方案（用于文生图）。

内容：
{{generatedContent}}

内容模板：
{{selectedTemplate}}

品牌和视觉规范：
{{brandVoice}}

视觉指南：
{{visualGuidelines}}

合规规则：
{{complianceRules}}

生成要求：
1. 生成 3 个不同方向封面：干货信息图风、情绪生活风、工具/场景风（生活场景为主，产品界面仅辅助）。三套构图须明显不同，禁止都用「笔记本+咖啡+绿植+手机」桌面四件套。
2. coverText 不超过 12 个汉字，须呼应正文标题核心议题；禁止栏目名（财经干货/财经笔记）和平台名。
3. imagePrompt 必须完整可执行，须包含：
   - 画幅：竖版 3:4（写「竖版信息流封面」，**不要写「小红书」**）
   - 主体场景与核心物件（与正文议题相关）
   - 光线与色调（中文描述，禁止 # 色号）
   - 构图（留白给封面大字；大字只出现一次）
   - 若有 coverText，写「画面内醒目大字仅一句：xxx」——不要写 coverText: 字段格式
4. 不得出现收益承诺、具体标的、内幕、机会确定性、夸大词。
5. 不要真实人物正脸/半脸特写；不要满屏红绿 K 线、暴富金币、二维码。
6. **禁止**生成平台 Logo、角标条、水印字、「竖活版」等参数字。
7. 产品界面若出现须清晰可读且与品牌一致，否则宁可不放界面。
8. coverScore 只评价方案文字，不评价实际图片。
9. 输出必须是合法 JSON，不要 Markdown、解释或代码块。

输出 JSON 结构必须严格包含：
{
  "promptVersion": "3.4.0",
  "task": "cover-suggestions",
  "covers": [
    {
      "coverId": "cover_001",
      "coverType": "干货图",
      "style": "dry-goods",
      "coverText": "",
      "visualDirection": "",
      "imagePrompt": "",
      "recommendReason": "",
      "coverScore": 0,
      "scoreTarget": "封面文案和封面方案文字，不评价实际生成图片",
      "riskLevel": "low",
      "riskNotes": []
    }
  ],
  "debugKnowledgeUsed": {{debugKnowledgeUsed}}
}
