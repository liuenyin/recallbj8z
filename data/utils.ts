
import { GameState, SubjectKey, OIStats, SerializableEffect, GameEvent } from '../types';

export const modifySub = (s: GameState, keys: SubjectKey[], val: number) => {
  const newSubs = { ...s.subjects };
  keys.forEach(k => {
    newSubs[k] = { ...newSubs[k], level: Math.max(0, newSubs[k].level + val) };
  });
  return newSubs;
};

export const modifyOI = (s: GameState, changes: Partial<OIStats>) => {
    const newOI = { ...s.oiStats };
    (Object.keys(changes) as (keyof OIStats)[]).forEach(k => {
        newOI[k] = Math.max(0, newOI[k] + (changes[k] || 0));
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
    
    return eff;
};

// --- Helper for AI Event Effects ---
export const applyAiEffect = (s: GameState, effect: SerializableEffect): Partial<GameState> => {
    const updates: Partial<GameState> = {
        general: { ...s.general },
        subjects: { ...s.subjects },
        oiStats: { ...s.oiStats }
    };

    if (effect.mindset) updates.general!.mindset = Math.max(0, s.general.mindset + effect.mindset);
    if (effect.health) updates.general!.health = Math.max(0, s.general.health + effect.health);
    if (effect.money) updates.general!.money = s.general.money + effect.money; // Money can be negative
    if (effect.efficiency) updates.general!.efficiency = Math.max(1, s.general.efficiency + effect.efficiency);
    if (effect.romance) updates.general!.romance = Math.max(0, s.general.romance + effect.romance);
    if (effect.experience) updates.general!.experience = Math.max(0, s.general.experience + effect.experience);
    if (effect.luck) updates.general!.luck = Math.max(0, s.general.luck + effect.luck);

    if (effect.subjects) {
        Object.entries(effect.subjects).forEach(([key, val]) => {
            const subKey = key as SubjectKey;
            updates.subjects![subKey] = { 
                ...updates.subjects![subKey], 
                level: Math.max(0, updates.subjects![subKey].level + (val as number)) 
            };
        });
    }

    if (effect.oiStats) {
        Object.entries(effect.oiStats).forEach(([key, val]) => {
            const oiKey = key as keyof OIStats;
            updates.oiStats![oiKey] = Math.max(0, updates.oiStats![oiKey] + (val as number));
        });
    }

    return updates;
};

export const mapAiEventToGameEvent = (aiEvent: any): GameEvent => {
    return {
        id: `ai_${Date.now()}_${Math.random()}`,
        title: aiEvent.title,
        description: aiEvent.description,
        type: aiEvent.type || 'neutral',
        triggerType: 'RANDOM',
        choices: aiEvent.choices.map((c: any) => ({
            text: c.text,
            resultDescription: c.resultDescription,
            action: (s: GameState) => {
                const stateUpdates = applyAiEffect(s, c.effect || {});
                return {
                    ...stateUpdates,
                    log: [...s.log, { 
                        message: c.resultDescription || `AI 事件: 你选择了 "${c.text}"`, 
                        type: aiEvent.type === 'negative' ? 'warning' : 'success', 
                        timestamp: Date.now() 
                    }]
                };
            }
        }))
    };
};
