请根据输入信息生成一条小红书财经内容草稿。

创作任务：
- Brief 业务配置（必须服从，优先级高于人设泛科普默认）：
{{briefBusinessContext}}
- 创作场景规则（必须服从）：
{{creationSceneRules}}
- 内容类型：{{contentType}}
- 生成模式：{{generationMode}}
- 篇幅/时长：{{length}}
- 博主层级：{{bloggerLevel}}
- 植入强度：{{embedLevel}}
- 主题/热点：{{topic}}
- 主热点（热点解读成稿须围绕此项）：{{primaryHotspotReference}}
- 成稿模式：{{hotspotContentHint}}
- 用户自定义要求：{{customRequirement}}

选中创意角度：
{{selectedAngle}}

选中内容模板：
{{selectedTemplate}}

Brief 已勾选的产品功能（仅写这些，勿额外编造；可为空则按 embed 档位决定是否提及）：
{{selectedFeatures}}

可用话术（参考，须改写成口语，禁止照搬）：
{{phraseGroup}}

品牌语气和转化路径：
{{brandVoice}}

参考热点/素材（热点解读模式下为成稿事实依据，正文须挂钩）：
{{topicMaterials}}

合规规则：
{{complianceRules}}

平台规则：
{{platformRules}}

品牌视觉规范（封面 prompt 须参考）：
{{visualGuidelines}}

必选风险提示：
{{riskDisclaimers}}

生成要求：
1. 生成内容必须贴合选中创意角度，并服从「创作场景规则」与「成稿模式」。热点解读时正文主线须围绕已选热点事实展开，须写出**分析**（发生了什么→为什么→对普通人/市场意味着什么），不得写成与素材无关的泛科普，不得只有情绪 Reaction。正文须引用「事实要点」中至少 2 个具体信息点；**禁止编造**素材未出现的公司名、涨跌幅、指数点位、政策原文。场景创作时不得做新闻解读。正文主线是故事、观点、复盘、信息整理或**工具测评对比**——**high 档位除外**：后约 60% 篇幅可以产品/功能组合说明为主线。
2. 标题生成 3 个候选，封面文案生成 3 个候选；标题优先吸引同类读者共鸣，不要像广告 slogan。**热点解读时**标题须体现具体事件/政策/现象，禁止「我的第一反应是…」「先别急着冲」等空泛 Reaction 式标题。
3. 正文必须口语化、分段清晰、有小红书阅读感（第一人称或朋友聊天感）；若 generationMode 为 video-script，content 字段输出口播视频脚本（分镜+口播句），总时长控制在指定秒数内。
4. 产品/功能提及须服从上方「植入强度」：**none** 可不写产品；**medium** 故事/情绪/干货为主线，产品可完全不写或顺口 1 句带过（≤2 句、≤20%），不强制命中任何功能；**high** 前约 40% 铺垫 + 后约 60% 强硬展开平台→主推产品→全部子功能路径。
5. 若需引用功能，优先 safeClaims；softInsertPhrases 仅作语气参考并必须改写；high 档位才可用 strongInsertPhrases，且仍须口语化。
6. 不得使用 forbiddenClaims、avoidExpressions、forbiddenPatterns 中的表达。
7. 不得推荐具体股票、基金、代码、买卖点位、收益率或「机会」确定性表达。
8. 必须包含风险提示。
9. tags 必填 5-8 个小红书话题词（不带 #），与主题、标题、读者相关；不得省略或留空。
10. insertStrategy.whyNatural 必须解释「为什么在这个场景里提产品不突兀」（none/medium 若未提产品可写「本篇以纯内容价值为主」）；**high** insertStrength 填 high 且须覆盖全部 Brief 功能；**medium** 不强制命中功能，insertStrength 与 embed 档位一致。
11. qualityScore：**high** 档位 productIntegration 低于 60 视为不达标；**none/medium** 以内容可读性为主，未写产品不应因此低分。
12. 如果批量生成，每条内容必须绑定不同 angleId，且不得复用相同开头句、正文结构或互动引导。
13. 正文可有适量 emoji（按人设密度，通常 3-7 个），点缀在句中或偶发段首；禁止每篇按固定 emoji 顺序当分段标题。禁止「首先/其次/第一/第二」等可见结构标记；产品提及嵌在叙事中段（**high 档位**：后约 60% 篇幅展开产品/功能组合），禁止文末单独 👉 硬推导流。
14. imagePromptSuggestions 必填 1-3 条，每条 prompt 必须是可直接用于文生图的完整画面描述：竖版 3:4 小红书封面、主体场景、光线色调、构图；若有 selectedCoverText 须在 prompt 中写明「画面内封面大字：xxx」。禁止只写抽象概念或产品功能名。
15. 输出必须是合法 JSON，不要输出 Markdown、解释文字或代码块。

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
    "insertStrength": "none/medium/high",
    "whyNatural": ""
  },
  "tags": ["必填，5-8个话题词，不带#"],
  "interactionGuide": "",
  "riskReminder": "市场有风险，投资需谨慎。",
  "imagePromptSuggestions": [
    {
      "style": "dry-goods | emotion | lifestyle",
      "prompt": "完整文生图画面描述（3:4竖版、场景、光线、主体、封面压字位置）",
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
