请基于以下任务信息，生成小红书财经内容的创意角度矩阵。

任务信息：
- Brief 业务配置（必须服从，优先级高于泛科普选题）：
{{briefBusinessContext}}
- 创作场景规则（必须服从，决定选题形态）：
{{creationSceneRules}}
- 内容类型：{{contentType}}
- 用户主题（热点模式下为「怎么聊热点」的叙事视角；场景模式下为角度主线）：{{topic}}
- 主热点（热点解读模式必须围绕此项及下方素材展开；场景模式忽略）：{{primaryHotspotReference}}
- 素材模式：{{materialModeHint}}
- 目标用户：{{targetUser}}
- 推广目标：{{campaignGoal}}
- 植入强度：{{embedLevel}}
- 博主层级：{{bloggerLevel}}
- 用户自定义要求：{{customRequirement}}
- 本次生成批次：{{diversitySeed}}（仅用于打散表达，不得改变上方用户选择）

参考热点/素材（热点解读模式下的选题主线与事实依据，必须挂钩）：
{{topicMaterials}}

热点权重分配（必须按槽位执行）：
{{hotspotCoveragePlan}}

可选产品功能（角度须按下方「Brief 功能绑定」选用，id 填 recommendedFeatureIds）：
{{selectedFeatures}}

Brief 功能绑定（按产品出现方式）：
{{embedAngleProductRules}}

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
2. 每个角度的 coreIdea 必须首先回答「这篇笔记读者为什么要看」——情绪、场景、观点或信息增量；不能把角度写成产品卖点标题或新闻标题复述。**须服从上方「创作场景规则」**（如炒股工具测评须含对比语境，不能写成单功能广告）。
3. **热点解读模式**：已选热点是选题主线，每个角度的 coreIdea 都必须与热点素材相关；须基于「事实要点」做信息解读（政策含义/市场影响/普通人怎么办），禁止空泛 Reaction 角度（如仅「我的第一反应」「先别急着冲」而无分析骨架）。用户主题是聊热点的视角。禁止 {{generateCount}} 个角度写成一模一样的新闻摘要。productBridge 须服从下方「Brief 功能绑定」规则。
4. 如果“最近同配置已生成角度”非空，本次必须生成新的切入点：不得近似复刻其中已有的 coreIdea、userPainPoint、contentStructure、differentiationAxis、displayTags 和标题套路；不能只是替换同义词或调整语序。这是表达避让，不允许改写用户选择的业务线、Offer、场景、读者、人设、功能、植入强度或素材事实。
5. 每个角度必须填写 differentiationAxis，说明它主要靠什么和其他角度区分；可选值方向包括：生活场景 / 情绪钩子 / 叙事人称 / 信息增量 / 产品距离 / 热点切入 / 风险意识。同一批次内 differentiationAxis 不得重复超过 1 次。
6. 角度之间至少在人群、情绪、叙事结构、核心观点中有 2 项不同；热点模式下禁止 4 个角度写成同一篇新闻复述，也禁止 4 个角度全部脱离热点。
7. 不得重复使用相同开头模式、相同 painPoint、相同 contentStructure、相同 titleDirections 句式。
8. 须服从上方「Brief 功能绑定」：**high** 档位 recommendedFeatureIds 须绑定全部勾选功能、productBridge 必填；**medium** productBridge 与 recommendedFeatureIds 选填，角度优先像真人选题；**none** 允许纯内容角度。
9. 必须服从 L4 目标读者与博主人设：角度的观察视角、情绪钩子、叙事结构要像该人设会提出的选题；不要串成其他人设——但若与 Brief 业务配置冲突，以 Brief 为准（**high** 须体现 Offer/功能/场景；**medium** 理解层级即可）。
10. 若 L4 提供 forbiddenVoice / forbiddenExpressions / antiHomogeneity，必须避开；若提供 mandatoryMarkers，角度中至少体现其中 1 项。
11. productBridge 格式：「用户痛点 → 生活场景 → 产品/功能动作（对应 Brief 勾选） → 个人感受/判断 → 合规提醒」，softSentence 要像小红书口语。
12. 不能出现具体股票/基金推荐、买卖建议、收益承诺、内幕消息或私信导流。
13. displayTags 是角度选择页展示用的小红书风格短标签，输出 3-5 个；每个标签 2-8 个中文字符，可带 #，要像「#闲钱管理」「#市场回暖」「#普通人视角」「#避坑思路」，不要写成长标题或完整句子。
14. 标题方向 titleDirections 应偏生活化/ curiosity / 共鸣，避免「XX 功能太强了」类硬广标题；**禁止**「N步/N个点/分成X份」框架式标题；**热点解读时禁止**「我的第一反应是…」「先别急着冲」「跟我有什么关系」等空泛 Reaction 标题作为主方向——标题须含具体事件/政策/现象。titleDirections 只供后续成稿参考，不承担卡片标签展示。
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
