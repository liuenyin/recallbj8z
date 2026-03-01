
import { GameState, SUBJECT_NAMES, SubjectKey } from '../types';

// DeepSeek API Configuration
// const API_URL = "https://api.deepseek.com/chat/completions";
const API_URL = "https://api.chatanywhere.tech/v1/chat/completions";
const MODEL_NAME = "deepseek-chat"; 

export const generateBatchGameEvents = async (state: GameState) => {
  const apiKey = (import.meta as any).env?.VITE_API_KEY || (process as any).env?.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing!");
    throw new Error("API Key is missing");
  }

  // 1. Context Construction
  const subjectsStr = (Object.entries(state.subjects) as [SubjectKey, { level: number }][])
    .map(([k, v]) => `${SUBJECT_NAMES[k]}:Lv${Math.floor(v.level)}`)
    .join(', ');
  
  const statusStr = state.activeStatuses.map(s => s.name).join(',');
   const talentsStr = state.talents.map(t => t.name).join(', ');
  // Use history for context
  const recentHistory = state.history.slice(-5).map(h => `[Week ${h.week}] ${h.eventTitle}: ${h.resultSummary}`).join('\n');
  const recentTitles = state.history.slice(-5).map(h => h.eventTitle).join('、');

  const systemPrompt = `
    你是一个【北京八中重开模拟器】的事件生成引擎。
    
    玩家是一名八中的高一新生。游戏分为三个阶段：暑假/军训/高一上学期（第11周期中考试，21周期末考试）
    【当前状态】
    - 身份: ${state.competition === 'OI' ? '信竞生 (OIer)' : '高考生'}
    - 天赋: [${talentsStr || "无"}]
    - 阶段: ${state.phase} (第 ${state.week} 周)
    - 属性: 心态${state.general.mindset}, 健康${state.general.health}, 钱${state.general.money}, 效率${state.general.efficiency},魅力${state.general.romance}
    - 关系: ${state.romancePartner ? `对象:${state.romancePartner}` : '单身'}
    - 状态: [${statusStr}]
    
    【最近剧情】:
    ${recentHistory || "暂无，新学期开始。"}

    【重要属性说明 - 请严格遵守】
    1. **效率 (efficiency)**: 范围 0-20。通常 +1 或 -1。极少数情况 +2,+3。**绝对不要**一次性增加 >5。
    2. **其他属性 (心态/健康/魅力等)**: 范围 0-100。通常变动幅度在 2-10 之间。

    【任务】
    请你根据玩家的状态，生成三个风格不同，具有北京高中生活特色的突发事件。
    请根据玩家的【天赋】和【状态】调整事件风格（例如：有“非酋”天赋则多生成倒霉事，有“万人迷”则多生成情感类事件）。
    禁止生成与 "${recentTitles}" 雷同的主题。
    
    【格式要求】
    严格返回 JSON 数组，不要 Markdown 代码块。格式如下：
    [
      {
        "title": "事件标题",
        "description": "事件描述（口语化，生动，带点黑色幽默）",
        "type": "positive/negative/neutral",
        "choices": [
          {
            "text": "选项文本",
            "resultDescription": "结果反馈文本",
            "effect": {
              "mindset": 0, "health": 0, "money": 0, "efficiency": 0, 
              "romance": 0, "experience": 0, "luck": 0,
              "subjects": {"math": 0}, // 可选
              "oiStats": {"dp": 0} // 可选
            }
          }
        ]
      }
    ]
  `;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "生成3个随机事件。" }
        ],
        temperature: 1.1,
        response_format: { type: "json_object" } // DeepSeek supports JSON mode
      })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let jsonText = data.choices?.[0]?.message?.content || "[]";

    // Cleaning logic
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Sometimes DeepSeek might wrap the array in a key like {"events": [...]}, try to extract if needed
    // But with strict prompting it usually returns the array or object correctly.
    // If it returns an object { "events": [...] }, we need to handle it.
    let parsed = JSON.parse(jsonText);
    
    if (!Array.isArray(parsed)) {
        // Try to find an array value
        const values = Object.values(parsed);
        const foundArray = values.find(v => Array.isArray(v));
        if (foundArray) {
            parsed = foundArray;
        } else {
            // If it's a single object, wrap it
            parsed = [parsed];
        }
    }

    return parsed;

  } catch (error) {
    console.log("Using API Key:", apiKey ? ` ${apiKey}...` : "EMPTY!");
    console.error("AI API Error:", error);
    return [{
      title: "灵感枯竭",
      description: "这一周过得平平淡淡，什么也没发生。（AI 连接失败，请检查网络或 API Key）",
      type: "neutral",
      choices: [
        { text: "继续", resultDescription: "日子还得过。", effect: { } }
      ]
    }];
  }
};
