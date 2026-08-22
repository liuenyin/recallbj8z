import fs from 'fs';
import https from 'https';

const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = "https://api.deepseek.com/chat/completions";
const TOTAL_BATCHES = 50; // Each batch generates ~10 events, totaling ~500
const OUTPUT_FILE = './data/ai_generated_events.json';

const SYSTEM_PROMPT = `
你是一个【北京八中重开模拟器】的事件生成引擎。
请生成 10 个高中日常随机事件。
包含：日常学习、课间八卦、晚自习奇遇、老师突击检查、小卖部遭遇、同学过生日、愚人节恶作剧等。
同时生成包含至少 3 步的“研学旅行”事件链，可以分拆为独立的事件。
严格返回一个 JSON 数组，格式如下：
[
  {
    "id": "evt_random_xxx",
    "title": "事件标题",
    "description": "事件描述（口语化，生动，带点黑色幽默）",
    "type": "neutral",
    "triggerType": "RANDOM",
    "choices": [
      {
        "text": "选项文本",
        "resultDescription": "结果反馈文本",
        "effect": { "mindset": 2, "health": -1 }
      }
    ]
  }
]
`;

async function callAPI() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: "请生成 10 个随机事件，直接输出 JSON 数组。" }
            ],
            temperature: 1.2,
            response_format: { type: "json_object" }
        });

        const req = https.request(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    const text = parsed.choices?.[0]?.message?.content || "[]";
                    // If it returns { "events": [...] }, extract it
                    let events = [];
                    if (text.trim().startsWith('{')) {
                        const obj = JSON.parse(text);
                        events = obj.events || Object.values(obj)[0] || [];
                    } else {
                        events = JSON.parse(text);
                    }
                    resolve(events);
                } catch (e) {
                    console.error("Parse error:", e.message, "\nBody:", body.substring(0, 200));
                    resolve([]);
                }
            });
        });

        req.on('error', (e) => resolve([]));
        req.write(data);
        req.end();
    });
}

async function run() {
    if (!API_KEY) {
        throw new Error('DEEPSEEK_API_KEY is required to generate events.');
    }
    let allEvents = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        try { allEvents = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); } catch (e) {}
    }

    console.log(`Starting generation. Currently have ${allEvents.length} events.`);

    for (let i = 0; i < TOTAL_BATCHES; i++) {
        console.log(`Batch ${i+1}/${TOTAL_BATCHES}...`);
        const events = await callAPI();
        if (Array.isArray(events) && events.length > 0) {
            allEvents = allEvents.concat(events);
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allEvents, null, 2));
            console.log(`+ ${events.length} events. Total: ${allEvents.length}`);
        } else {
            console.log(`- Failed or returned empty.`);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`Finished! Total events: ${allEvents.length}`);
}

run();
