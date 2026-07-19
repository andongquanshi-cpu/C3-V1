请根据输入信息，写一条**小红书财经口播短视频脚本**（可执行分镜表，供拍摄/剪辑；不是图文笔记）。

创作任务：
- Brief 业务配置（必须服从）：
{{briefBusinessContext}}
- 创作场景规则（必须服从）：
{{creationSceneRules}}
- 内容类型：{{contentType}}
- 视频时长：{{length}}
- 推广目标：{{campaignGoal}}
- 植入强度：{{embedLevel}}
- 主题/热点：{{topic}}
- 主热点（热点解读须围绕此项）：{{primaryHotspotReference}}
- 成稿模式：{{hotspotContentHint}}
- 用户自定义要求：{{customRequirement}}

选中创意角度（叙事主线必须服从此角度，不是复述标题）：
{{selectedAngle}}

爆文范式（微证券团队 script1+script2，本篇路由结果；参考气质和结构，**禁止照抄示例句**）：
{{viralMethodology}}

话题策略（与业务线、Offer 和已选功能联动）：
{{tagStrategy}}

Brief 产品功能（仅在这些场景里自然提及，勿编造）：
{{selectedFeatures}}

话术参考（须口语化改写，禁止照搬）：
{{phraseGroup}}

品牌语气：
{{brandVoice}}

参考热点/素材（热点解读模式下口播须挂钩已选热点）：
{{topicMaterials}}

合规：
{{complianceRules}}
{{riskDisclaimers}}

{{videoRiskReminderGuide}}

---

## 你怎么写（比格式更重要）

1. **像真人发语音**，不是 AI 教程稿。允许语气词（啊、嘛、吧、诶）、停顿、半截话、自我纠正。
2. **黄金 3 秒钩子（强制）**：开篇口播 + 开篇画面必须同时抓人。从下列选一种钩子类型并写进 `openingHook.type` / `scriptMeta.hookType`：
   - 反常识 / 痛点情绪 / 好奇反问 / 数字反差
   - 禁止流水账开场（「周末上午我泡了杯咖啡…」这类无冲突叙述）
   - 禁止套话：「把音量调低」「黄金3秒」「今天给大家分享」「干货来了」
3. **说演一致（强制）**：口播说到的信息点，画面必须演出来。一个镜头口播若含 2–3 个信息点，`visual` 须用时间轴拆成对应画面变化（例：`(0-3s)… → (3-7s)…`）。宁可语速稍慢/镜头稍长，也不要「耳朵听三件事、眼睛只看滑动一下」。
4. **画面颗粒度（强制）**：每个 `visual` 须达到「能直接拍」粒度，至少包含：
   - 景别（远景/全景/中景/近景/特写）
   - 主体动作（手指从哪滑到哪、点哪里）
   - 屏幕/画面具体内容（显示什么文案、哪条消息、哪个入口名）
   - 环境背景（地点+1–2 道具）
   - 人物状态（表情/姿态；可用侧脸/手部，避免合规风险的清晰正脸特写要求）
   - 并填写 `cameraMove`（固定/推/拉/摇/移/跟 之一）
5. **节奏**：开头快（钩子镜可偏短、冲击强）→ 中间稳（讲清）→ 结尾稍慢（金句/CTA/风险）。填写每镜 `transition`（切/淡入淡出/滑动/缩放 等）。
6. **音效与 BGM**：
   - `bgmSuggestion`：整片 BGM（风格+情绪+相对口播更低音量）
   - 每镜 `sfx`：点击声/滑动声/消息「叮」等（没有就写「环境底噪/无特殊音效」）
7. **品牌露出（非 none 档）**：至少 1 镜「口播提到品牌/入口名」且「画面同步露出对应界面/搜索框/名称」；用场景带入，禁止硬广清单。**high** 后段可展开功能组合；**medium** 轻点即可；**none** 不提品牌。
8. **封面设计**：必须输出 `coverDesign`（封面帧画面 + 大字 + 可选小字 + 配色气质），服务信息流点击，不是文生图 prompt 堆砌。
9. **结尾 CTA**：最后一镜在风险提示之外，加一句软 CTA（评论互动 / 收藏 / 「微信搜××看看」三选一或组合），自然口语，不硬广。
10. **时长**：15s 约 40-55 字口播，30s 约 80-110 字，60s 约 160-220 字（含自然停顿）；分镜总时长贴近目标时长。
11. **标题** 3 候选，符合路由标题范式但句式原创；可适度用平台口语（谁懂啊、听劝、救命级等），禁止堆砌烂梗。
12. 合规：不荐股基代码、不承诺收益；风险提示口语嵌最后一镜；tags 8-10 个（不带 #）。

## 禁止

- 笼统画面（仅「手指滑动翻看消息」而无屏幕具体内容/时间轴）
- 口播信息点与画面动作数量严重不匹配
- 机构通稿腔、首先其次结构标记、空壳「【镜头N】| 时长」
- 输出文生图长 prompt；封面设计用短描述即可

## 生成顺序（必须遵守）

**第一步**：写完完整口播（含钩子句 + 软 CTA + 口语风险）  
**第二步**：按「说演一致」拆 storyboard，补齐景别/运镜/音效/转场  
**第三步**：写 coverDesign 与 bgmSuggestion  
**禁止**先搭空 JSON。

## 输出 JSON（合法 JSON，无 Markdown 包裹）

{
  "promptVersion": "2.1.0",
  "task": "video-script-generation",
  "generationMode": "video-script",
  "angleId": "",
  "angleName": "",
  "scriptMeta": {
    "titleType": "",
    "hookType": "反常识|痛点情绪|好奇反问|数字反差",
    "bodyStructure": "",
    "targetDuration": "",
    "estimatedSpeechSeconds": 0,
    "rhythmNote": "开头快/中间稳/结尾慢 的一句话说明"
  },
  "titleCandidates": [
    { "text": "", "type": "数字锚定型|身份共鸣型|痛点解决型|情绪钩子型", "riskLevel": "low" }
  ],
  "selectedTitle": "",
  "openingHook": {
    "type": "反常识|痛点情绪|好奇反问|数字反差",
    "spokenLine": "前3秒口播钩子（须有情绪/反差/好奇）",
    "visualNote": "前3秒冲击画面（须具体到景别+主体+状态）"
  },
  "coverDesign": {
    "visual": "封面帧：景别+主体+表情/状态+关键界面（一句话可拍）",
    "headline": "封面大字，8-14字",
    "subline": "可选小字，≤12字",
    "mood": "配色与情绪气质"
  },
  "storyboard": [
    {
      "shotIndex": 1,
      "durationSec": 0,
      "cameraMove": "固定|推|拉|摇|移|跟",
      "transition": "切|淡入淡出|滑动|缩放",
      "visual": "【景别】…；主体动作…；屏幕/画面内容…；环境…；人物状态…；（若多信息点用 0-3s/3-7s 时间轴）",
      "voiceover": "口播原句",
      "onScreenText": "可选字幕/贴纸",
      "sfx": "本镜音效"
    }
  ],
  "content": "完整可读分镜稿（含画面/口播/时长/运镜/音效）",
  "bgmSuggestion": "整片BGM：风格+情绪+相对口播更低约30%音量",
  "insertStrategy": {
    "featureId": "",
    "featureName": "",
    "userPainPoint": "",
    "scene": "",
    "insertPosition": "落在哪一镜",
    "usedPhrase": "",
    "insertStrength": "none|medium|high",
    "whyNatural": ""
  },
  "tags": ["8-10个强相关话题词，不带#"],
  "interactionGuide": "软CTA：评论/收藏/微信搜 之一，口语一句",
  "riskReminder": "口语化风险提示（须改写；嵌最后一镜口播）",
  "qualityScore": {
    "overallScore": 0,
    "scores": {
      "speechNaturalness": 0,
      "hookRetention": 0,
      "visualSpecificity": 0,
      "voiceVisualSync": 0,
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
