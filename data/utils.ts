
import { GameState, GameStatus, SubjectKey, OIStats, SerializableEffect, GameEvent, GeneralStats, EventChoice, WeekendActivity, Difficulty, SUBJECT_NAMES } from '../types';
import { getDifficultyPreset } from './constants';

export const modifySub = (s: GameState, keys: SubjectKey[], val: number) => {
  const newSubs = { ...s.subjects };
  keys.forEach(k => {
    let actualVal = val;
    // Diminishing returns to prevent infinite scaling
    if (newSubs[k].level >= 40) actualVal *= 0.25;
    else if (newSubs[k].level >= 20) actualVal *= 0.5;
    newSubs[k] = { ...newSubs[k], level: Math.max(0, newSubs[k].level + actualVal) };
  });
  return newSubs;
};

export const modifyOI = (s: GameState, changes: Partial<OIStats>) => {
    const newOI = { ...s.oiStats };
    (Object.keys(changes) as (keyof OIStats)[]).forEach(k => {
        if (k !== 'history') {
             (newOI as any)[k] = Math.max(0, ((newOI as any)[k] || 0) + ((changes as any)[k] || 0));
        }
    });
    return newOI;
};

export const getEffectiveEfficiency = (state: GameState): number => {
    let eff = state.general.efficiency;
    
    // Debt King Challenge: +1 Efficiency per 15 Debt
    if (state.activeChallengeId === 'c_debt_king' && state.general.money < 0) {
        const debt = Math.abs(state.general.money);
        eff += Math.floor(debt / 15);
    }

    const difficulty = getDifficultyPreset(state.difficulty);
    const fatiguePenalty = state.fatigue >= 90 ? 6 : state.fatigue >= 75 ? 3 : state.fatigue >= 50 ? 1 : 0;
    eff -= fatiguePenalty;

    // In HELL, classroom distractions cut the efficiency that reaches actual learning.
    return Math.max(0, eff * difficulty.lessonEfficiencyMultiplier);
};

const clampMultiplier = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Positive study gains scale with excitement, while remaining bounded. */
export const getLearningMultiplier = (state: GameState): number => {
    const excitement = Math.min(100, Math.max(0, state.general.excitement ?? 0));
    const excitementFactor = 0.8 + excitement / 250;
    return clampMultiplier(excitementFactor * getDifficultyPreset(state.difficulty).learningRewardMultiplier, 0.45, 1.6);
};

/** Rest and sleep recover less when the player is highly stimulated. */
export const getRestRecoveryMultiplier = (state: GameState): number => {
    const excitement = Math.min(100, Math.max(0, state.general.excitement ?? 0));
    const excitementFactor = clampMultiplier(1 - excitement / 250, 0.5, 1);
    return clampMultiplier(excitementFactor * getDifficultyPreset(state.difficulty).restRecoveryMultiplier, 0.3, 1.15);
};

export const isStudyBlocked = (state: Pick<GameState, 'difficulty' | 'general' | 'fatigue'>): boolean => {
    if (state.difficulty !== 'HELL') return false;
    const preset = getDifficultyPreset(state.difficulty);
    return (preset.studyMindsetThreshold !== undefined && state.general.mindset < preset.studyMindsetThreshold)
        || (preset.studyFatigueThreshold !== undefined && state.fatigue > preset.studyFatigueThreshold);
};

/** Classify all study-like choices consistently, including OI practice text. */
export const isStudyChoice = (choice: Pick<EventChoice, 'text' | 'tags'>): boolean => {
    if (choice.tags?.includes('study')) return true;
    if (choice.tags?.some(tag => tag === 'sleep' || tag === 'rest' || tag === 'social')) return false;
    // Choosing a competition route is a life-direction decision, not a study
    // action that should be blocked by HELL's momentary fatigue gate.
    if (/信息竞赛\s*\(OI\)|数学竞赛\s*\(MO\)/.test(choice.text)) return false;
    // A few authored events predate the tag convention. Keep the text
    // fallback broad enough to cover obvious academic actions, while the
    // explicit rest/social tags above prevent ordinary leisure choices from
    // being classified as study.
    return /学习|刷题|做题|难题|复习|预习|自习|自修|自学|网课|训练|集训|算法|动态规划|题解|模拟赛|竞赛|出题|验题|对拍|认真听|听讲|背单词|补课|衔接班|晚自习|配置环境|写代码|代码|课题|项目|全神贯注|死磕|练习|温故|错题|讲题|证明|查资料|写稿|肝！|(?:通宵|熬夜).*(?:刷|题|CF|赛|代码|算法)/.test(choice.text);
};

export const isLearningActivity = (activity: Pick<WeekendActivity, 'type'>): boolean =>
    activity.type === 'STUDY' || activity.type === 'OI' || activity.type === 'PROJECT';

const REMOTE_SOCIAL_ACTIVITY_IDS = new Set(['w_date_call', 'w_date_game', 'w_water_oi']);

export const getActivityBlockReason = (
    state: Pick<GameState, 'isGrounded' | 'activeStatuses'>,
    activity: Pick<WeekendActivity, 'id' | 'type'>
): string | null => {
    const isSocial = activity.type === 'SOCIAL' || activity.type === 'LOVE';
    if (!isSocial || REMOTE_SOCIAL_ACTIVITY_IDS.has(activity.id)) return null;
    if (state.isGrounded) return '当前处于禁足状态';
    if (state.activeStatuses.some(status => status.id === 's_quarantine')) return '居家隔离期间不能参加线下社交';
    return null;
};

export const getShopPriceMultiplier = (state: Pick<GameState, 'difficulty'>): number =>
    getDifficultyPreset(state.difficulty).shopPriceMultiplier || 1;

/** Health at or below zero is fatal in all modes; Hell has an earlier threshold. */
export const isHealthFatal = (state: Pick<GameState, 'difficulty'> | Difficulty, health: number): boolean => {
    const difficulty = typeof state === 'string' ? state : state.difficulty;
    const threshold = getDifficultyPreset(difficulty).healthDeathThreshold;
    return threshold === undefined ? health <= 0 : (threshold <= 0 ? health <= 0 : health < threshold);
};

const finiteOr = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Keep one entry per status so repeated events refresh rather than stack it. */
export const normalizeActiveStatuses = (statuses: unknown): GameStatus[] => {
    if (!Array.isArray(statuses)) return [];
    const byId = new Map<string, GameStatus>();
    statuses.forEach(raw => {
        if (!raw || typeof raw !== 'object' || typeof (raw as any).id !== 'string') return;
        const id = (raw as any).id.trim();
        if (!id) return;
        const rawDuration = finiteOr((raw as any).duration, 1);
        const duration = rawDuration === 999
            ? 999
            : Math.min(998, Math.max(1, Math.floor(rawDuration)));
        const status = { ...(raw as object), id, duration } as GameStatus;
        const existing = byId.get(id);
        if (!existing || duration > existing.duration) byId.set(id, status);
    });
    return Array.from(byId.values());
};

export const clampGameStateMetrics = <T extends GameState>(state: T): T => {
    const general = {
        ...state.general,
        mindset: Math.min(150, Math.max(0, finiteOr(state.general.mindset, 0))),
        experience: Math.min(999, Math.max(0, finiteOr(state.general.experience, 0))),
        luck: Math.min(150, Math.max(0, finiteOr(state.general.luck, 0))),
        romance: Math.min(150, Math.max(0, finiteOr(state.general.romance, 0))),
        health: Math.min(150, Math.max(0, finiteOr(state.general.health, 0))),
        money: finiteOr(state.general.money, 0),
        efficiency: Math.min(30, Math.max(0, finiteOr(state.general.efficiency, 0))),
        excitement: Math.min(100, Math.max(0, finiteOr(state.general.excitement, 0)))
    };
    const subjects = { ...state.subjects };
    (Object.keys(subjects) as SubjectKey[]).forEach(key => {
        subjects[key] = {
            aptitude: Math.min(150, Math.max(0, finiteOr(subjects[key]?.aptitude, 0))),
            level: Math.min(100, Math.max(0, finiteOr(subjects[key]?.level, 0)))
        };
    });
    const oiStats = { ...state.oiStats };
    (['dp', 'ds', 'math', 'string', 'graph', 'misc'] as const).forEach(key => {
        oiStats[key] = Math.min(100, Math.max(0, finiteOr(oiStats[key], 0)));
    });
    if (oiStats.rating !== undefined) oiStats.rating = Math.min(5000, Math.max(0, finiteOr(oiStats.rating, 1200)));
    if (oiStats.history !== undefined && !Array.isArray(oiStats.history)) oiStats.history = [];
    return {
        ...state,
        general,
        subjects,
        oiStats,
        activeStatuses: normalizeActiveStatuses(state.activeStatuses),
        fatigue: Math.min(100, Math.max(0, finiteOr(state.fatigue, 20)))
    };
};

const SUPPORTED_EVENT_TRIGGERS = new Set(['RANDOM', 'CONDITIONAL', 'FIXED', 'CHAINED']);

export const normalizeEventTriggerType = (value: unknown): GameEvent['triggerType'] => {
    const trigger = typeof value === 'string' ? value.toUpperCase() : '';
    return SUPPORTED_EVENT_TRIGGERS.has(trigger) ? trigger as GameEvent['triggerType'] : 'RANDOM';
};

const LEGACY_AI_EFFECT_ALIASES: Record<string, keyof GeneralStats> = {
  enjoyment: 'mindset',
  hunger: 'health',
  intellect: 'experience',
  knowledge: 'experience',
  knowlege: 'experience',
  wealth: 'money',
  social: 'romance',
  study: 'experience'
};

/** Convert the original offline event vocabulary into the current schema. */
export const normalizeAiEffect = (raw: unknown): SerializableEffect => {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const nested = source.effect && typeof source.effect === 'object'
    ? source.effect as Record<string, unknown>
    : source;
  const effect: SerializableEffect = {};
  const generalKeys: Array<keyof GeneralStats> = [
    'mindset', 'health', 'money', 'efficiency', 'romance',
    'experience', 'luck', 'excitement'
  ];
  const addNumber = (key: keyof GeneralStats, value: unknown) => {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return;
    (effect as Record<string, number>)[key] = ((effect as Record<string, number>)[key] || 0) + number;
  };

  generalKeys.forEach(key => addNumber(key, nested[key]));
  const fatigue = typeof nested.fatigue === 'number' ? nested.fatigue : Number(nested.fatigue);
  if (Number.isFinite(fatigue)) effect.fatigue = fatigue;
  Object.entries(LEGACY_AI_EFFECT_ALIASES).forEach(([legacyKey, target]) => {
    // Legacy packs sometimes put social/study beside `effect` on the choice.
    addNumber(target, nested[legacyKey] ?? source[legacyKey]);
  });

  if (nested.romancePartner !== undefined && nested.romancePartner !== null) {
    const partner = String(nested.romancePartner).trim().slice(0, 24);
    if (partner) effect.romancePartner = partner;
  }

  const subjects: Partial<Record<SubjectKey, number>> = {};
  if (nested.subjects && typeof nested.subjects === 'object') {
    (Object.keys(SUBJECT_NAMES) as SubjectKey[]).forEach(key => {
      const value = Number((nested.subjects as Record<string, unknown>)[key]);
      if (Number.isFinite(value)) subjects[key] = value;
    });
  }
  if (Object.keys(subjects).length > 0) effect.subjects = subjects;

  const oiStats: Partial<OIStats> = {};
  if (nested.oiStats && typeof nested.oiStats === 'object') {
    (['dp', 'ds', 'math', 'string', 'graph', 'misc'] as const).forEach(key => {
      const value = Number((nested.oiStats as Record<string, unknown>)[key]);
      if (Number.isFinite(value)) oiStats[key] = value;
    });
  }
  if (Object.keys(oiStats).length > 0) effect.oiStats = oiStats;
  return effect;
};

const RECOVERY_STATS: Array<keyof GeneralStats> = ['mindset', 'health', 'efficiency', 'experience', 'romance', 'luck'];

export const scalePositiveGeneralDeltas = (
    state: GameState,
    nextGeneral: GeneralStats | undefined,
    multiplier: number
): GeneralStats | undefined => {
    if (!nextGeneral) return undefined;
    const scaled = { ...nextGeneral };
    RECOVERY_STATS.forEach(key => {
        const current = state.general[key];
        const next = nextGeneral[key];
        if (typeof current === 'number' && typeof next === 'number' && next > current) {
            scaled[key] = current + (next - current) * multiplier;
        }
    });
    return scaled;
};

export const scalePositiveSubjectDeltas = (
  state: GameState,
  nextSubjects: GameState['subjects'] | undefined,
  multiplier: number
): GameState['subjects'] | undefined => {
    if (!nextSubjects) return undefined;
    const scaled = { ...nextSubjects };
    (Object.keys(nextSubjects) as SubjectKey[]).forEach(key => {
        const current = state.subjects[key]?.level;
        const next = nextSubjects[key]?.level;
        if (typeof current === 'number' && typeof next === 'number' && next > current) {
            scaled[key] = { ...nextSubjects[key], level: current + (next - current) * multiplier };
        }
    });
  return scaled;
};

/** Scale only positive OI skill gains. Rating and history are outcomes, not practice gains. */
export const scalePositiveOIStatDeltas = (
  state: GameState,
  nextOI: OIStats | undefined,
  multiplier: number
): OIStats | undefined => {
  if (!nextOI) return undefined;
  const scaled = { ...nextOI };
  (['dp', 'ds', 'math', 'string', 'graph', 'misc'] as const).forEach(key => {
    const current = state.oiStats?.[key];
    const next = nextOI[key];
    if (typeof current === 'number' && typeof next === 'number' && next > current) {
      scaled[key] = current + (next - current) * multiplier;
    }
  });
  return scaled;
};

// --- Helper for AI Event Effects ---
export const applyAiEffect = (s: GameState, effect: SerializableEffect): Partial<GameState> => {
    const updates: Partial<GameState> = {
        general: { ...s.general },
        subjects: { ...s.subjects },
        oiStats: { ...s.oiStats }
    };

    if (effect.mindset) updates.general!.mindset = Math.min(150, Math.max(0, s.general.mindset + effect.mindset));
    if (effect.health) updates.general!.health = Math.min(150, Math.max(0, s.general.health + effect.health));
    if (effect.money) updates.general!.money = s.general.money + effect.money; // Money can be negative
    if (effect.efficiency) updates.general!.efficiency = Math.min(30, Math.max(0, s.general.efficiency + effect.efficiency));
    if (effect.romance) updates.general!.romance = Math.min(150, Math.max(0, s.general.romance + effect.romance));
    if (effect.experience) updates.general!.experience = Math.min(999, Math.max(0, s.general.experience + effect.experience));
    if (effect.luck) updates.general!.luck = Math.min(150, Math.max(0, s.general.luck + effect.luck));
    if (effect.excitement) updates.general!.excitement = Math.min(100, Math.max(0, (s.general.excitement ?? 0) + effect.excitement));
    if (effect.fatigue) updates.fatigue = Math.min(100, Math.max(0, (s.fatigue || 0) + effect.fatigue));

    // AI may describe a confession, but it cannot bypass the authored
    // relationship route. Existing relationships are never replaced by a
    // generated name, and a new one requires the route's readiness flag or
    // sufficient favorability.
    const favorability = Number(s.flags.ta_favorability || 0);
    const canEstablishRelationship = !s.romancePartner
        && s.flags.ready_for_confession === true
        && favorability >= 70;
    if (effect.romancePartner && canEstablishRelationship) {
        updates.romancePartner = effect.romancePartner;
        updates.flags = { ...s.flags, relationship_name: effect.romancePartner };
    }

    if (effect.subjects) {
        Object.entries(effect.subjects).forEach(([key, val]) => {
            const subKey = key as SubjectKey;
            if (updates.subjects![subKey]) {
                const numVal = Number(val);
                if (!isNaN(numVal)) {
                    updates.subjects![subKey] = { 
                        ...updates.subjects![subKey], 
                        level: Math.max(0, updates.subjects![subKey].level + numVal) 
                    };
                }
            }
        });
    }

    if (effect.oiStats) {
        Object.entries(effect.oiStats).forEach(([key, val]) => {
            if ((['dp', 'ds', 'math', 'string', 'graph', 'misc'] as string[]).includes(key)) {
                const numVal = Number(val);
                if (!isNaN(numVal)) {
                    (updates.oiStats as any)[key] = Math.max(0, ((updates.oiStats as any)[key] || 0) + numVal);
                }
            }
        });
    }

    return updates;
};

const stableEventHash = (value: string): string => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

export const mapAiEventToGameEvent = (aiEvent: any): GameEvent => {
    const fallbackKey = [aiEvent.title, aiEvent.description, ...(Array.isArray(aiEvent.choices) ? aiEvent.choices.map((choice: any) => choice?.text) : [])]
        .map(value => String(value || '').trim())
        .join('|');
    const id = typeof aiEvent.id === 'string' && aiEvent.id.trim()
        ? aiEvent.id
        : `ai_${stableEventHash(fallbackKey || 'temporary-event')}`;
    const type = aiEvent.type === 'positive' || aiEvent.type === 'negative' ? aiEvent.type : 'neutral';
    const choices = (Array.isArray(aiEvent.choices) ? aiEvent.choices : [])
        .filter((choice: any) => choice && typeof choice.text === 'string' && choice.text.trim());
    if (choices.length === 0) {
        // Older offline rows used a top-level `effect` and omitted choices.
        // Keep those events playable instead of silently turning their effect
        // into a no-op fallback.
        choices.push({
            text: '面对这件事',
            resultDescription: '这件事很快过去了，但你记住了这次经历。',
            effect: aiEvent && typeof aiEvent.effect === 'object' ? aiEvent.effect : {}
        });
    }
    return {
        id,
        title: String(aiEvent.title || '临时事件'),
        description: String(aiEvent.description || ''),
        type,
        // Older offline packs contain custom trigger names unsupported by the
        // main loop. Treat them as random events instead of unreachable data.
        triggerType: normalizeEventTriggerType(aiEvent.triggerType),
        choices: choices.map((c: any) => ({
            text: c.text,
            resultDescription: c.resultDescription,
            tags: Array.isArray(c.tags) ? c.tags : undefined,
            action: (s: GameState) => {
                const stateUpdates = applyAiEffect(s, normalizeAiEffect(c));
                return {
                    ...stateUpdates,
                    log: [...s.log, { 
                        message: c.resultDescription || `AI 事件: 你选择了 "${c.text}"`, 
                        type: type === 'negative' ? 'warning' : 'success',
                        timestamp: Date.now() 
                    }]
                };
            }
        })),
        serialized: {
            id,
            title: String(aiEvent.title || '临时事件'),
            description: String(aiEvent.description || ''),
            type,
            triggerType: normalizeEventTriggerType(aiEvent.triggerType),
            source: 'ai',
            choices: choices.map((c: any) => ({
                text: String(c.text || '继续'),
                resultDescription: typeof c.resultDescription === 'string' ? c.resultDescription : undefined,
                tags: Array.isArray(c.tags) ? c.tags : undefined,
                effect: normalizeAiEffect(c)
            }))
        }
    };
};
