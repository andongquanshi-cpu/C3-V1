请基于已生成的小红书内容，生成 3 个封面方案。

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
1. 生成 3 个封面方向：干货风、情绪风、产品场景风。
2. 封面文案必须短，不超过 12 个汉字。
3. 不得出现收益承诺、具体标的、内幕、机会确定性、夸大词。
4. 图片提示词应适合 3:4 小红书封面。
5. 不要要求出现真实人物面部。
6. 如果涉及产品界面，提醒避免具体股票名称、代码、收益截图、持仓截图。
7. coverScore 只能评价封面文案和封面方案文字，不得评价实际生成图片或声称看过图片。
8. 输出必须是合法 JSON，不要输出 Markdown、解释文字或代码块。

输出 JSON 结构必须严格包含：
{
  "promptVersion": "3.3.0",
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
