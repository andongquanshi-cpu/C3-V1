请对以下**小红书财经口播短视频脚本**进行合规、品牌表达和文案质量审查。

本篇是视频脚本，**不涉及图文封面、文生图 prompt、配图方案**；禁止评价或要求补充封面文案、封面图、imagePrompt。

待审脚本：
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
1. 标出所有可能违规或高风险句子（重点：口播 voiceover、标题、开篇钩子）。
2. 风险类型必须对应 complianceRules 中的 ruleId。
3. 给出保守替代表达，不要给更激进的营销表达。
4. 检查是否包含风险提示（口播或 riskReminder 字段）。
5. 检查是否存在收益承诺、个股/基金推荐、买卖点、内幕消息、私信导流、夸大产品能力。
6. 检查 storyboard 分镜是否具备可拍摄的口播与画面备忘；若仅有镜头时长占位、无口播原文，publishReadiness 应为 blocked。
7. 输出 publishReadiness：ready / needs_revision / blocked。
8. 质量评分只评价**视频脚本文字**（标题、口播、分镜可读稿），不得评价封面、配图或声称看过视频/图片。
9. **禁止**在 weaknesses、requiredFixes、summary 中提及封面、配图、文生图、3:4 竖版图等图文笔记专属项。
10. 输出必须是合法 JSON，不要输出 Markdown、解释文字或代码块。

输出 JSON 结构必须严格包含：
{
  "promptVersion": "3.3.0",
  "task": "compliance-review-video",
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
    "scoreTarget": "视频脚本文字（标题、口播、分镜稿），不评价封面或配图",
    "overallScore": 0,
    "scores": {
      "titleClick": 0,
      "speechNaturalness": 0,
      "hookRetention": 0,
      "readability": 0,
      "productIntegration": 0,
      "complianceSafety": 0
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
