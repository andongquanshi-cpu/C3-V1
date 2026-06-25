请对以下小红书财经内容进行合规、品牌表达和文案质量审查。

待审内容：
{{generatedContent}}

合规规则：
{{complianceRules}}

清洗后的替代表达规则：
{{rewriteRules}}

平台规则：
{{platformRules}}

必选风险提示：
{{riskDisclaimers}}

品牌表达要求：
{{brandVoice}}

审查要求：
1. 标出所有可能违规或高风险句子。
2. 风险类型必须对应 complianceRules 中的 ruleId。
3. 给出保守替代表达，不要给更激进的营销表达。
4. 检查是否包含风险提示。
5. 检查是否存在收益承诺、个股/基金推荐、买卖点、内幕消息、私信导流、夸大产品能力。
6. 输出 publishReadiness：ready / needs_revision / blocked。
7. 质量评分只能评价文案草稿、封面文案和封面方案文字，不得评价实际生成图片或声称看过图片。
8. 评分维度必须包含图片 prompt 清晰度，只评价 prompt 是否具体、可执行、符合 3:4 小红书封面，不评价实际图片。
9. 输出必须是合法 JSON，不要输出 Markdown、解释文字或代码块。

输出 JSON 结构必须严格包含：
{
  "promptVersion": "3.3.0",
  "task": "compliance-review",
  "overallRiskLevel": "low/medium/high",
  "publishReadiness": "ready/needs_revision/blocked",
  "riskFindings": [
    {
      "ruleId": "",
      "riskType": "",
      "riskLevel": "low/medium/high",
      "originalText": "",
      "reason": "",
      "suggestedRewrite": "",
      "mustFix": true
    }
  ],
  "missingRequiredElements": [
    {
      "type": "riskReminder",
      "suggestedText": "市场有风险，投资需谨慎。"
    }
  ],
  "qualityScore": {
    "scoreTarget": "文案草稿、封面文案和封面方案文字，不评价实际生成图片",
    "overallScore": 0,
    "scores": {
      "titleClick": 0,
      "coverText": 0,
      "readability": 0,
      "saveValue": 0,
      "commentGuide": 0,
      "productIntegration": 0,
      "complianceSafety": 0,
      "imagePromptClarity": 0
    },
    "weaknesses": [],
    "suggestions": []
  },
  "brandVoiceFindings": [
    {
      "issue": "",
      "suggestedRewrite": ""
    }
  ],
  "approvedSafePhrases": [],
  "requiredFixes": [],
  "summary": "",
  "debugKnowledgeUsed": {{debugKnowledgeUsed}}
}
