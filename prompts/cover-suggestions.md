请基于已生成的小红书内容，生成 3 个封面方案（用于 Seedream 文生图）。

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
1. 生成 3 个不同方向的封面：干货场景风、情绪生活风、产品/工具场景风（画面以生活场景为主，产品界面仅作辅助）。
2. 封面文案 coverText 必须短，不超过 12 个汉字，且与正文 selectedCoverText 或标题呼应。
3. imagePrompt 必须是完整、可执行的文生图描述，每条须包含：
   - 画幅：竖版 3:4 小红书封面
   - 主体场景与核心物件（书桌/账本/家庭桌面/手机等）
   - 光线与色调（柔和自然光、暖白米色等）
   - 构图（留白给封面大字的位置）
   - 若有 coverText，写明「画面内醒目大字：xxx」
4. 不得出现收益承诺、具体标的、内幕、机会确定性、夸大词。
5. 不要要求出现真实人物正脸特写；不要满屏红绿 K 线、暴富金币、二维码。
6. 如果涉及产品界面，仅作辅助元素，重点是生活理财场景。
7. coverScore 只能评价封面文案和封面方案文字，不得评价实际生成图片。
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
