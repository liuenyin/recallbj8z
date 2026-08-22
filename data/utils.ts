
import { GameState, SubjectKey, OIStats, SerializableEffect, GameEvent } from '../types';

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

    const fatiguePenalty = state.fatigue >= 90 ? 6 : state.fatigue >= 75 ? 3 : state.fatigue >= 50 ? 1 : 0;
    eff -= fatiguePenalty;
    
    return Math.max(0, eff);
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
    if (effect.efficiency) updates.general!.efficiency = Math.min(30, Math.max(1, s.general.efficiency + effect.efficiency));
    if (effect.romance) updates.general!.romance = Math.min(150, Math.max(0, s.general.romance + effect.romance));
    if (effect.experience) updates.general!.experience = Math.min(150, Math.max(0, s.general.experience + effect.experience));
    if (effect.luck) updates.general!.luck = Math.min(150, Math.max(0, s.general.luck + effect.luck));
    if (effect.fatigue) updates.fatigue = Math.min(100, Math.max(0, (s.fatigue || 0) + effect.fatigue));

    // AI Romance Logic
    if (effect.romancePartner) {
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
            const oiKey = key as keyof OIStats;
            if (oiKey !== 'history') {
                const numVal = Number(val);
                if (!isNaN(numVal)) {
                    (updates.oiStats as any)[oiKey] = Math.max(0, ((updates.oiStats as any)[oiKey] || 0) + numVal);
                }
            }
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
        triggerType: aiEvent.triggerType || 'RANDOM',
        choices: (aiEvent.choices || []).map((c: any) => ({
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
