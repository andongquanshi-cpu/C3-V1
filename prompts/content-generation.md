请根据输入信息生成一条小红书财经内容草稿。

创作任务：
- 内容类型：{{contentType}}
- 生成模式：{{generationMode}}
- 篇幅/时长：{{length}}
- 博主层级：{{bloggerLevel}}
- 产品出现方式（非推销力度）：{{embedLevel}}
- 主题/热点：{{topic}}
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

参考热点/素材：
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
1. 生成内容必须贴合选中创意角度；正文主线是故事、观点、复盘或信息整理，不是产品功能罗列。
2. 标题生成 3 个候选，封面文案生成 3 个候选；标题优先吸引同类读者共鸣，不要像广告 slogan。
3. 正文必须口语化、分段清晰、有小红书阅读感（第一人称或朋友聊天感）；若 generationMode 为 video-script，content 字段输出口播视频脚本（分镜+口播句），总时长控制在指定秒数内。
4. 产品/功能提及须服从上方「产品出现方式」说明：先写人、再带点产品；禁止开篇就讲功能、禁止通篇教程式卖点。
5. 若需引用功能，优先 safeClaims；softInsertPhrases 仅作语气参考并必须改写；high 档位才可用 strongInsertPhrases，且仍须口语化。
6. 不得使用 forbiddenClaims、avoidExpressions、forbiddenPatterns 中的表达。
7. 不得推荐具体股票、基金、代码、买卖点位、收益率或「机会」确定性表达。
8. 必须包含风险提示。
9. tags 必填 5-8 个小红书话题词（不带 #），与主题、标题、读者相关；不得省略或留空。
10. insertStrategy.whyNatural 必须解释「为什么在这个场景里提产品不突兀」；若全文未提产品，insertStrength 填 none 并说明原因。
11. qualityScore 中 productIntegration 低分不应拉低 overallScore——真诚可读、合规安全权重更高。
12. 如果批量生成，每条内容必须绑定不同 angleId，且不得复用相同开头句、正文结构或互动引导。
13. 正文可有适量 emoji（按人设密度，通常 3-7 个），点缀在句中或偶发段首；禁止每篇按固定 emoji 顺序当分段标题。禁止「首先/其次/第一/第二」等可见结构标记；产品提及嵌在叙事中段，禁止文末单独 👉 硬推导流。
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
    "insertStrength": "none/low/medium/high",
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
