请根据输入信息生成一条小红书财经内容草稿。

创作任务：
- 内容类型：{{contentType}}
- 生成模式：{{generationMode}}
- 篇幅：{{length}}
- 博主层级：{{bloggerLevel}}
- 产品植入强度：{{embedLevel}}
- 主题/热点：{{topic}}
- 用户自定义要求：{{customRequirement}}

选中创意角度：
{{selectedAngle}}

选中内容模板：
{{selectedTemplate}}

可用产品功能：
{{selectedFeatures}}

可用话术：
{{phraseGroup}}

品牌语气和转化路径：
{{brandVoice}}

参考热点/素材：
{{topicMaterials}}

合规规则：
{{complianceRules}}

平台规则：
{{platformRules}}

必选风险提示：
{{riskDisclaimers}}

生成要求：
1. 生成内容必须贴合选中创意角度，不要混用多个角度导致主题发散。
2. 标题生成 3 个候选，封面文案生成 3 个候选。
3. 正文必须口语化、分段清晰、有小红书阅读感。
4. 产品植入必须发生在合理场景中，说明用户痛点、产品动作、植入位置和使用句。
5. 优先使用 selectedFeatures 中的 safeClaims 和 softInsertPhrases。
6. 不得使用 forbiddenClaims、avoidExpressions、forbiddenPatterns 中的表达。
7. 不得推荐具体股票、基金、代码、买卖点位、收益率或“机会”确定性表达。
8. 必须包含风险提示。
9. 如果批量生成，每条内容必须绑定不同 angleId，且不得复用相同开头句、正文结构、产品植入句式或互动引导。
10. 输出必须是合法 JSON，不要输出 Markdown、解释文字或代码块。

输出 JSON 结构必须严格包含：
{
  "promptVersion": "3.3.0",
  "task": "content-generation",
  "contentType": "{{contentType}}",
  "generationMode": "{{generationMode}}",
  "angleId": "",
  "angleName": "",
  "titleCandidates": [
    {
      "text": "",
      "type": "疑问式/数字式/反差式/收藏导向",
      "riskLevel": "low"
    }
  ],
  "selectedTitle": "",
  "coverTextCandidates": [
    {
      "text": "",
      "style": "干货/情绪/工具/热点",
      "riskLevel": "low"
    }
  ],
  "selectedCoverText": "",
  "content": "",
  "insertStrategy": {
    "featureId": "",
    "featureName": "",
    "userPainPoint": "",
    "scene": "",
    "insertPosition": "",
    "usedPhrase": "",
    "insertStrength": "none/low/medium/high",
    "whyNatural": ""
  },
  "tags": [],
  "interactionGuide": "",
  "riskReminder": "市场有风险，投资需谨慎。",
  "imagePromptSuggestions": [
    {
      "style": "dry-goods",
      "prompt": "",
      "coverText": "",
      "riskNotes": []
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
  "complianceChecklist": [
    {
      "ruleId": "risk_return_promise",
      "passed": true,
      "notes": ""
    }
  ],
  "debugKnowledgeUsed": {{debugKnowledgeUsed}}
}
