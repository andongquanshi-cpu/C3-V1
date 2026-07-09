请根据输入信息，写一条**小红书财经口播短视频脚本**（不是图文笔记，不涉及文生图/封面图生成）。

创作任务：
- 内容类型：{{contentType}}
- 视频时长：{{length}}
- 推广目标：{{campaignGoal}}
- 产品出现方式：{{embedLevel}}
- 主题/热点：{{topic}}
- 用户自定义要求：{{customRequirement}}

选中创意角度（叙事主线必须服从此角度，不是复述标题）：
{{selectedAngle}}

爆文范式（微证券团队 script1+script2，本篇路由结果；参考气质和结构，**禁止照抄示例句**）：
{{viralMethodology}}

Brief 产品功能（仅在这些场景里自然提及，勿编造）：
{{selectedFeatures}}

话术参考（须口语化改写，禁止照搬）：
{{phraseGroup}}

品牌语气：
{{brandVoice}}

参考素材：
{{topicMaterials}}

合规：
{{complianceRules}}
{{riskDisclaimers}}

---

## 你怎么写（比格式更重要）

1. **像真人发语音**，不是 AI 教程稿。允许语气词（啊、嘛、吧、诶）、停顿、半截话、自我纠正（「不对，应该说…」）。
2. **开篇从本片路由的钩子类型出发**，但从「角度+主题+人设」重新造句；禁止「把音量调低」「黄金3秒」「今天给大家分享」「干货来了」等套话开场。
3. **骨架构**按路由（类比/分类/叙事）展开，但口播里不要用「首先其次」「第一第二」当结构标记。
4. **产品**只在痛点解决路径里轻点一下，服从 embed 档位；禁止通篇功能清单或开篇推销。
5. **时长**：严格控制口播总字数——15s 约 40-55 字，30s 约 80-110 字，60s 约 160-220 字（含自然停顿）。
6. **分镜**是拍摄备忘：每镜 visual 和 voiceover **必填**（每镜口播≥12字）；**严禁**只写「【镜头N】| 时长：Xs」空壳占位。
7. **标题** 3 个候选，类型符合本篇路由的标题范式，但句式必须原创。
8. 合规：不推荐具体股票/基金/代码，不承诺收益；风险提醒口语融入，不当贴片。

## 禁止（去 AI 味）

- 机构通稿腔、百科定义式开篇、排比金句堆砌
- 每镜口播长度完全一致、每句都是完整书面句
- 输出任何文生图 prompt、封面设计方案、配图建议（本篇不做生图）

## 生成顺序（必须遵守，避免只填空壳）

**第一步**：在脑中写完完整口播稿（所有镜头的 voiceover 原文）  
**第二步**：再拆进 storyboard 数组，并同步写入 content 字段  
**禁止**先搭 JSON 骨架再留空口播。若 storyboard 任一镜 voiceover 为空，视为生成失败。

## 输出 JSON（合法 JSON，无 Markdown 包裹）

{
  "promptVersion": "2.0.0",
  "task": "video-script-generation",
  "generationMode": "video-script",
  "angleId": "",
  "angleName": "",
  "scriptMeta": {
    "titleType": "",
    "hookType": "",
    "bodyStructure": "",
    "targetDuration": "",
    "estimatedSpeechSeconds": 0
  },
  "titleCandidates": [
    { "text": "", "type": "数字锚定型|身份共鸣型|痛点解决型|情绪钩子型", "riskLevel": "low" }
  ],
  "selectedTitle": "",
  "openingHook": {
    "type": "",
    "spokenLine": "开篇第一句口播（须原创）",
    "visualNote": "对应画面氛围"
  },
  "storyboard": [
    {
      "shotIndex": 1,
      "durationSec": 0,
      "visual": "画面（拍摄备忘，不是生图prompt）",
      "voiceover": "口播原句",
      "onScreenText": "可选字幕/贴纸"
    }
  ],
  "content": "完整可读分镜稿（【镜头N】画面 | 口播 | 时长）",
  "bgmSuggestion": "BGM 风格+情绪",
  "insertStrategy": {
    "featureId": "",
    "featureName": "",
    "userPainPoint": "",
    "scene": "",
    "insertPosition": "落在哪一镜",
    "usedPhrase": "",
    "insertStrength": "none|low|medium|high",
    "whyNatural": ""
  },
  "tags": ["5-8个话题词，不带#"],
  "interactionGuide": "一句轻互动",
  "riskReminder": "市场有风险，投资需谨慎。",
  "qualityScore": {
    "overallScore": 0,
    "scores": {
      "speechNaturalness": 0,
      "hookRetention": 0,
      "angleFit": 0,
      "productIntegration": 0,
      "complianceSafety": 0
    },
    "weaknesses": [],
    "suggestions": []
  },
  "complianceChecklist": [],
  "debugKnowledgeUsed": {{debugKnowledgeUsed}}
}
