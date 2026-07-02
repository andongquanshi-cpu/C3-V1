请基于以下任务信息，生成小红书财经内容的创意角度矩阵。

任务信息：
- 内容类型：{{contentType}}
- 主题/热点：{{topic}}
- 目标用户：{{targetUser}}
- 推广目标：{{campaignGoal}}
- 产品出现方式（非推销力度）：{{embedLevel}}
- 博主层级：{{bloggerLevel}}
- 用户自定义要求：{{customRequirement}}

参考热点/素材（事实依据，生成角度时必须回应）：
{{topicMaterials}}

可选产品功能（仅当角度需要自然带到时参考，不是每条角度都必须用）：
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
2. 每个角度的 coreIdea 必须首先回答「这篇笔记读者为什么要看」——情绪、场景、观点或信息增量；不能把角度写成产品卖点标题。
3. 若上方提供了热点/素材，至少一半角度必须直接基于素材中的事实点展开；productBridge 仅在有素材/主题关联时填写，且不得喧宾夺主。
4. 角度之间至少在人群、情绪、叙事结构、核心观点中有 2 项不同；不要 4 个角度都是「功能 A vs 功能 B」。
5. recommendedFeatureIds 可以为空数组：允许纯内容角度（经历、复盘、避坑、观点），不强绑产品。
6. 若填写 productBridge，必须是「用户痛点 → 生活场景 → 可选的产品动作 → 个人感受/判断 → 合规提醒」，softSentence 要像小红书口语，不像广告。
7. 不能出现具体股票/基金推荐、买卖建议、收益承诺、内幕消息或私信导流。
8. 标题方向 titleDirections 应偏生活化/ curiosity / 共鸣，避免「XX 功能太强了」类硬广标题。
9. 每个角度必须给出风险等级：low / medium / high。
10. 只输出合法 JSON，不要输出 Markdown、解释文字或代码块。

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
