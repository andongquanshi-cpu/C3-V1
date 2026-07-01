请基于以下任务信息，生成小红书财经内容的创意角度矩阵。

任务信息：
- 内容类型：{{contentType}}
- 主题/热点：{{topic}}
- 目标用户：{{targetUser}}
- 推广目标：{{campaignGoal}}
- 产品植入强度：{{embedLevel}}
- 博主层级：{{bloggerLevel}}
- 用户自定义要求：{{customRequirement}}

可用产品功能：
{{selectedFeatures}}

可用内容模板：
{{selectedTemplates}}

品牌语气：
{{brandVoice}}

话术参考：
{{phraseGroup}}

合规约束：
{{complianceRules}}

生成要求：
1. 输出恰好 {{generateCount}} 个创意角度，角度之间必须明显不同，优先保证 JSON 完整合法。
2. 角度之间至少在人群、情绪、结构、产品桥接方式中有 2 项不同。
3. 每个角度必须说明适合的内容模板、核心情绪、用户痛点、可植入产品功能和植入方式。
4. 产品植入必须是“用户痛点 -> 内容场景 -> 产品动作 -> 使用结果 -> 合规提醒”的场景桥接，不要硬广。
5. 不能出现具体股票/基金推荐、买卖建议、收益承诺、内幕消息或私信导流。
6. 角度要适合小红书表达，但不能过度标题党。
7. 每个角度必须给出风险等级：low / medium / high。
8. 如果某角度容易产生合规风险，要在 riskNotes 中说明。
9. 只输出合法 JSON，不要输出 Markdown、解释文字或代码块。

输出 JSON 结构必须严格包含：
{
  "promptVersion": "3.3.0",
  "task": "creative-angles",
  "angles": [
    {
      "angleId": "angle_001",
      "angleName": "",
      "angleType": "",
      "coreIdea": "",
      "targetUser": "",
      "emotionalHook": [],
      "userPainPoint": "",
      "contentStructure": "",
      "recommendedTemplateId": "",
      "recommendedFeatureIds": [],
      "productBridge": {
        "painPoint": "",
        "contentScene": "",
        "productAction": "",
        "softSentence": "",
        "conversionHint": "",
        "complianceNote": ""
      },
      "titleDirections": [],
      "coverDirection": "",
      "expectedInteractionGoal": "",
      "riskLevel": "low",
      "riskNotes": []
    }
  ],
  "debugKnowledgeUsed": {{debugKnowledgeUsed}}
}
