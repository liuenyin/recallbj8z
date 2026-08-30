import {
  AiConfig,
  AiGeneratedEvent,
  AiGeneratedEventChoice,
  GameState,
  OIStats,
  SerializableEffect,
  SubjectKey,
  SUBJECT_NAMES
} from '../types';

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: false,
  apiUrl: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  model: 'deepseek-chat'
};

const AI_CONFIG_STORAGE_KEY = 'recall_ai_config_v1';
const GENERAL_EFFECT_KEYS = ['mindset', 'health', 'money', 'efficiency', 'romance', 'experience', 'luck', 'fatigue', 'excitement'] as const;
const OI_EFFECT_KEYS = ['dp', 'ds', 'math', 'string', 'graph', 'misc'] as const;

const getEnvironmentApiKey = (): string => {
  try {
    return typeof process !== 'undefined' ? process.env.DEEPSEEK_API_KEY || '' : '';
  } catch {
    return '';
  }
};

const getEnvironmentConfig = (): AiConfig => ({
  ...DEFAULT_AI_CONFIG,
  enabled: Boolean(getEnvironmentApiKey()),
  apiKey: getEnvironmentApiKey()
});

export const loadAiConfig = (): AiConfig => {
  const fallback = getEnvironmentConfig();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return {
      enabled: Boolean(parsed.enabled),
      apiUrl: typeof parsed.apiUrl === 'string' && parsed.apiUrl.trim() ? parsed.apiUrl.trim() : fallback.apiUrl,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : fallback.apiKey,
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : fallback.model
    };
  } catch {
    return fallback;
  }
};

export const saveAiConfig = (config: AiConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify({
      enabled: Boolean(config.enabled),
      apiUrl: config.apiUrl.trim(),
      apiKey: config.apiKey,
      model: config.model.trim()
    }));
  } catch (error) {
    console.warn('Unable to persist AI configuration', error);
  }
};

export const normalizeAiEndpoint = (rawUrl: string): string => {
  const value = rawUrl.trim().replace(/\/+$/, '');
  if (!value) throw new Error('请先填写 API 地址');
  if (!/^https?:\/\//i.test(value)) throw new Error('API 地址必须以 http:// 或 https:// 开头');
  if (/\/chat\/completions$/i.test(value)) return value;
  if (/\/v\d+$/i.test(value)) return `${value}/chat/completions`;
  if (/deepseek\.com/i.test(value)) return `${value}/chat/completions`;
  return `${value}/v1/chat/completions`;
};

const readCompletionText = (data: any): string => {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(part => typeof part === 'string' ? part : part?.text || '').join('');
  }
  throw new Error('API 返回中没有可读取的 message.content');
};

const requestCompletion = async (
  config: AiConfig,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  options: { temperature?: number; maxTokens?: number; retries?: number } = {}
): Promise<string> => {
  const endpoint = normalizeAiEndpoint(config.apiUrl);
  const model = config.model.trim();
  if (!model) throw new Error('请先填写模型名称');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  const retries = Math.min(1, Math.max(0, options.retries ?? 0));

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 1,
          max_tokens: options.maxTokens ?? 1400
        })
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status >= 500 && attempt < retries) continue;
        throw new Error(`API 请求失败 (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`);
      }
      return readCompletionText(await response.json());
    } catch (error: any) {
      if (error?.name === 'AbortError') throw new Error('API 请求超时（30 秒）');
      if (error instanceof TypeError) throw new Error('无法连接 API，可能是地址错误或服务端未允许浏览器跨域访问');
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw new Error('API 请求失败，请稍后重试');
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const sanitizeEffect = (raw: any): SerializableEffect => {
  const effect: SerializableEffect = {};
  const generalLimits: Record<(typeof GENERAL_EFFECT_KEYS)[number], [number, number]> = {
    mindset: [-15, 15], health: [-20, 20], money: [-100, 100], efficiency: [-3, 3],
    romance: [-15, 15], experience: [-20, 20], luck: [-15, 15], fatigue: [-25, 25], excitement: [-25, 25]
  };
  GENERAL_EFFECT_KEYS.forEach(key => {
    const value = toFiniteNumber(raw?.[key]);
    if (value !== undefined) (effect as any)[key] = clamp(value, ...generalLimits[key]);
  });

  if (raw?.romancePartner !== undefined && raw.romancePartner !== null) {
    const partner = String(raw.romancePartner).trim().slice(0, 24);
    if (partner) effect.romancePartner = partner;
  }

  const subjects: Partial<Record<SubjectKey, number>> = {};
  if (raw?.subjects && typeof raw.subjects === 'object') {
    (Object.keys(SUBJECT_NAMES) as SubjectKey[]).forEach(key => {
      const value = toFiniteNumber(raw.subjects[key]);
      if (value !== undefined) subjects[key] = clamp(value, -5, 5);
    });
  }
  if (Object.keys(subjects).length > 0) effect.subjects = subjects;

  const oiStats: Partial<OIStats> = {};
  if (raw?.oiStats && typeof raw.oiStats === 'object') {
    OI_EFFECT_KEYS.forEach(key => {
      const value = toFiniteNumber(raw.oiStats[key]);
      if (value !== undefined) (oiStats as any)[key] = clamp(value, -5, 5);
    });
  }
  if (Object.keys(oiStats).length > 0) effect.oiStats = oiStats;
  return effect;
};

const sanitizeEvents = (rawEvents: any[]): AiGeneratedEvent[] => rawEvents
  .map((raw): AiGeneratedEvent | null => {
    if (!raw || typeof raw !== 'object') return null;
    const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 80) : '';
    const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, 1200) : '';
    if (!title || !description || !Array.isArray(raw.choices)) return null;
    const choices: AiGeneratedEventChoice[] = raw.choices
      .map((choice: any) => {
        if (!choice || typeof choice.text !== 'string') return null;
        return {
          text: choice.text.trim().slice(0, 160),
          resultDescription: typeof choice.resultDescription === 'string' ? choice.resultDescription.trim().slice(0, 500) : '事情暂时告一段落。',
          effect: sanitizeEffect(choice.effect || {})
        };
      })
      .filter((choice: AiGeneratedEventChoice | null): choice is AiGeneratedEventChoice => !!choice && !!choice.text)
      .slice(0, 4);
    const uniqueChoices = choices.filter((choice, index) => choices.findIndex(item => item.text === choice.text) === index);
    if (uniqueChoices.length < 2) return null;
    return { title, description, type: raw.type === 'positive' || raw.type === 'negative' ? raw.type : 'neutral', choices: uniqueChoices };
  })
  .filter((event): event is AiGeneratedEvent => !!event)
  .slice(0, 3);

const parseEvents = (text: string): AiGeneratedEvent[] => {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const indexes = [cleaned.indexOf('['), cleaned.indexOf('{')].filter(index => index >= 0);
    const start = indexes.length > 0 ? Math.min(...indexes) : -1;
    const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    if (start < 0 || end <= start) throw new Error('AI 返回的内容不是有效 JSON');
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }
  const candidates = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.events) ? parsed.events : Object.values(parsed || {}).find(value => Array.isArray(value));
  if (!Array.isArray(candidates)) throw new Error('AI 返回中没有事件数组');
  const events = sanitizeEvents(candidates);
  if (events.length === 0) throw new Error('AI 返回的事件格式不完整');
  return events;
};

const buildPrompt = (state: GameState): string => {
  const subjects = (Object.entries(state.subjects) as [SubjectKey, { level: number }][]).map(([key, value]) => `${SUBJECT_NAMES[key]}:${Math.floor(value.level)}`).join('、');
  const recentHistory = state.history.slice(-5).map(entry => `[第${entry.week}周] ${entry.eventTitle}: ${entry.resultSummary}`).join('\n');
  const relationshipName = state.flags.relationship_name || '重要同学';
  const region = state.worldContext?.region || '未知城市';
  const year = state.worldContext?.yearStart || '当代';
  const statuses = state.activeStatuses.map(status => status.name).join('、') || '无';
  return `你是一个高中生活模拟游戏的事件编剧。玩家来自${region}，在八中背景学校就读，入学年份约为${year}。
当前阶段：${state.phase}，第${state.week}周；路线：${state.competition === 'OI' ? 'OI竞赛' : state.competition === 'MO' ? '数学竞赛（MO）' : '课内综合'}。
当前属性：心态${Math.round(state.general.mindset)}、健康${Math.round(state.general.health)}、疲劳${Math.round(state.fatigue)}、兴奋${Math.round(state.general.excitement ?? 0)}、金钱${Math.round(state.general.money)}、效率${Math.round(state.general.efficiency)}、桃花${Math.round(state.general.romance)}、经验${Math.round(state.general.experience)}。
学科水平：${subjects}。
当前状态：${statuses}。
重要同学：${relationshipName}；关系状态：${state.romancePartner ? '已确立关系' : '尚未确立关系'}。
天赋：${state.talents.map(talent => talent.name).join('、') || '无'}。
最近剧情：\n${recentHistory || '暂无，这是新的学期。'}

请生成 2-3 个彼此主题不同、贴近中国高中校园的事件。事件要让玩家在学习、健康、关系、金钱、社团或竞赛之间做取舍，避免空泛鸡汤和重复最近剧情。
每个事件必须有 2-4 个有效选项，其中至少一个选项风险较低但收益也较小。每个选项必须有 resultDescription 和 effect。effect 只能使用 mindset、health、money、efficiency、romance、experience、luck、fatigue、excitement、romancePartner、subjects、oiStats；数值应克制，单个普通属性变化通常在 -10 到 +10，efficiency 在 -2 到 +2，fatigue 和 excitement 在 -15 到 +15。不要让单个选项直接造成死亡、满值或不可逆的大幅惩罚。
只在确实确立恋爱关系时填写 romancePartner；不要返回 flags、代码、Markdown 或解释文字。

严格返回 JSON 数组，格式：
[{"title":"事件标题","description":"事件描述","type":"positive|negative|neutral","choices":[{"text":"选项文本","resultDescription":"选择后的结果反馈","effect":{"mindset":0,"health":0,"fatigue":0}}]}]`;
};

export const generateBatchGameEvents = async (state: GameState, config: AiConfig = getEnvironmentConfig()): Promise<AiGeneratedEvent[]> => {
  if (!config.enabled) throw new Error('AI 模式未开启');
  const content = await requestCompletion(config, [
    { role: 'system', content: buildPrompt(state) },
    { role: 'user', content: '请根据当前状态生成本周事件。' }
  ], { temperature: 1.05, maxTokens: 2200, retries: 1 });
  return parseEvents(content);
};

export const testAiConnection = async (config: AiConfig): Promise<void> => {
  if (!config.apiUrl.trim()) throw new Error('请先填写 API 地址');
  await requestCompletion({ ...config, enabled: true }, [{ role: 'user', content: '只回复 OK，不要输出其他内容。' }], { temperature: 0, maxTokens: 8 });
};
