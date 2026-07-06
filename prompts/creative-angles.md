请基于以下任务信息，生成小红书财经内容的创意角度矩阵。

任务信息：
- 内容类型：{{contentType}}
- 主题/热点：{{topic}}
- 目标用户：{{targetUser}}
- 推广目标：{{campaignGoal}}
- 产品出现方式（非推销力度）：{{embedLevel}}
- 博主层级：{{bloggerLevel}}
- 用户自定义要求：{{customRequirement}}
- 本次生成批次：{{diversitySeed}}（仅用于打散表达，不得改变上方用户选择）

参考热点/素材（事实依据，生成角度时必须回应）：
{{topicMaterials}}

可选产品功能（仅当角度需要自然带到时参考，不是每条角度都必须用）：
{{selectedFeatures}}

可用内容模板：
{{selectedTemplates}}

品牌语气：
{{brandVoice}}

目标读者与博主人设：
{{personaContext}}

话术参考：
{{phraseGroup}}

合规约束：
{{complianceRules}}

最近同配置已生成角度（必须避让其核心表达；不得为了避重改变上方用户选择）：
{{avoidRecentAngles}}

生成要求：
1. 输出恰好 {{generateCount}} 个创意角度，角度之间必须明显不同，优先保证 JSON 完整合法。
2. 每个角度的 coreIdea 必须首先回答「这篇笔记读者为什么要看」——情绪、场景、观点或信息增量；不能把角度写成产品卖点标题。
3. 若上方提供了热点/素材，至少一半角度必须直接基于素材中的事实点展开；productBridge 仅在有素材/主题关联时填写，且不得喧宾夺主。
4. 如果“最近同配置已生成角度”非空，本次必须生成新的切入点：不得近似复刻其中已有的 coreIdea、userPainPoint、contentStructure、differentiationAxis、displayTags 和标题套路；不能只是替换同义词或调整语序。这是表达避让，不允许改写用户选择的业务线、Offer、场景、读者、人设、功能、植入强度或素材事实。
5. 每个角度必须填写 differentiationAxis，说明它主要靠什么和其他角度区分；可选值方向包括：生活场景 / 情绪钩子 / 叙事人称 / 信息增量 / 产品距离 / 热点切入 / 风险意识。
6. 角度之间至少在人群、情绪、叙事结构、核心观点中有 2 项不同；不要 4 个角度都是「功能 A vs 功能 B」。
7. 不得重复使用相同开头模式、相同 painPoint、相同 contentStructure、相同 titleDirections 句式。
8. recommendedFeatureIds 可以为空数组：允许纯内容角度（经历、复盘、避坑、观点），不强绑产品。
9. 必须服从 L4 目标读者与博主人设：角度的观察视角、情绪钩子、叙事结构要像该人设会提出的选题；不要串成其他人设。
10. 若 L4 提供 forbiddenVoice / forbiddenExpressions / antiHomogeneity，必须避开；若提供 mandatoryMarkers，角度中至少体现其中 1 项。
11. 若填写 productBridge，必须是「用户痛点 → 生活场景 → 可选的产品动作 → 个人感受/判断 → 合规提醒」，softSentence 要像小红书口语，不像广告。
12. 不能出现具体股票/基金推荐、买卖建议、收益承诺、内幕消息或私信导流。
13. displayTags 是角度选择页展示用的小红书风格短标签，输出 3-5 个；每个标签 2-8 个中文字符，可带 #，要像「#闲钱管理」「#市场回暖」「#普通人视角」「#避坑思路」，不要写成长标题或完整句子。
14. 标题方向 titleDirections 应偏生活化/ curiosity / 共鸣，避免「XX 功能太强了」类硬广标题；titleDirections 只供后续成稿参考，不承担卡片标签展示。
15. 每个角度必须给出风险等级：low / medium / high。
16. 只输出合法 JSON，不要输出 Markdown、解释文字或代码块。

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
      "differentiationAxis": "",
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
      "displayTags": [],
      "titleDirections": [],
      "coverDirection": "",
      "expectedInteractionGoal": "",
      "riskLevel": "low",
      "riskNotes": []
    }
  ],
  "debugKnowledgeUsed": {{debugKnowledgeUsed}}
}
