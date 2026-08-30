import { GameState, GameEvent, Project } from '../types';

interface HistoricalEventDef {
    id: string;
    region?: string;
    year: number;
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    generateEvent: (state: GameState) => GameEvent;
}

export const HISTORICAL_EVENTS: HistoricalEventDef[] = [
    {
        id: 'he_typhoon_mangkhut_2018',
        region: '广东广州',
        year: 2018,
        season: 'autumn',
        generateEvent: (state) => ({
            id: 'he_typhoon_mangkhut_2018',
            title: '超强台风“山竹”过境',
            description: '这是2018年的秋天，超强台风“山竹”在广东沿海登陆。学校发布了停课通知，窗外的狂风暴雨让人心惊胆战。',
            type: 'negative',
            once: true,
            choices: [
                {
                    text: '在家躲避，好好休息',
                    action: (s) => ({
                        general: { ...s.general, health: s.general.health + 10, mindset: s.general.mindset + 5 },
                        log: [...s.log, { message: '你在家度过了安全的一天，风声很大。', type: 'info', timestamp: Date.now() }]
                    })
                },
                {
                    text: '趁机复习（效率极低）',
                    action: (s) => ({
                        general: { ...s.general, mindset: s.general.mindset - 5, efficiency: s.general.efficiency - 2 }
                    })
                }
            ]
        })
    },
    {
        id: 'he_beijing_snow_2019',
        region: '北京',
        year: 2019,
        season: 'winter',
        generateEvent: (state) => ({
            id: 'he_beijing_snow_2019',
            title: '故宫的初雪',
            description: '2019年冬，北京迎来了一场大雪。朋友圈里被故宫的雪景刷屏了。',
            type: 'positive',
            once: true,
            choices: [
                {
                    text: '和同学去操场打雪仗！',
                    action: (s) => ({
                        general: { ...s.general, health: s.general.health + 5, romance: s.general.romance + 5, mindset: s.general.mindset + 10 }
                    })
                },
                {
                    text: '在教室安静赏雪',
                    action: (s) => ({
                        general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency + 3 }
                    })
                }
            ]
        })
    },
    {
        id: 'he_covid_start_2020',
        year: 2020,
        season: 'spring',
        generateEvent: (state) => ({
            id: 'he_covid_start_2020',
            title: '突发公共卫生事件',
            description: '2020年初，一种未知的病毒开始传播。学校宣布延期开学，全面转为线上网课教学。这对你的自律能力是一个巨大的考验。',
            type: 'negative',
            once: true,
            choices: [
                {
                    text: '适应网课生活',
                    action: (s) => {
                        const project: Project = {
                            id: 'proj_online_class',
                            title: '适应网课生活',
                            description: '在家学习诱惑太多，你需要证明自己的自律能力。',
                            type: 'ACADEMIC',
                            deadlinePhase: s.phase,
                            deadlineWeek: s.week + 4,
                            progress: 0,
                            requiredProgress: 100,
                            rewardsDescription: '自律性大幅提升，全属性增加',
                            onComplete: (st) => ({
                                general: { ...st.general, efficiency: st.general.efficiency + 5, mindset: st.general.mindset + 10 }
                            }),
                            onFail: (st) => ({
                                general: { ...st.general, efficiency: st.general.efficiency - 10, mindset: st.general.mindset - 15 }
                            })
                        };
                        return {
                            activeProjects: [...s.activeProjects, project],
                            activeStatuses: [...s.activeStatuses, { id: 's_quarantine', name: '居家隔离', description: '无法参与线下社交活动。', type: 'DEBUFF', duration: 4, icon: 'fa-house-user' }]
                        };
                    }
                }
            ]
        })
    }
];

export let loadedCityEvents: HistoricalEventDef[] = [];
let currentLoadedCityCode = '';

export const loadCityEvents = async (code: string, regionName: string) => {
    if (currentLoadedCityCode === code) return;
    loadedCityEvents = [];
    currentLoadedCityCode = '';
    try {
        const res = await fetch(new URL(`cities/${code}.json`, document.baseURI).toString());
        if (!res.ok) throw new Error(`City event request failed: ${res.status}`);
        const data = await res.json();
        
        const mapped: HistoricalEventDef[] = data.events.map((e: any) => ({
            id: e.id,
            region: regionName,
            year: e.year,
            season: e.season,
            generateEvent: (state: GameState) => ({
                id: e.id,
                title: e.title,
                description: e.description,
                type: e.type,
                once: true,
                choices: e.choices.map((c: any) => ({
                    text: c.text,
                    resultDescription: c.resultDescription,
                    action: (s: GameState) => {
                       let nextGen = { ...s.general };
                       if (c.effect) {
                           if (c.effect.efficiency) nextGen.efficiency = Math.min(100, Math.max(0, nextGen.efficiency + c.effect.efficiency));
                           if (c.effect.health) nextGen.health = Math.min(100, Math.max(0, nextGen.health + c.effect.health));
                           if (c.effect.mindset) nextGen.mindset = Math.min(100, Math.max(0, nextGen.mindset + c.effect.mindset));
                           if (c.effect.experience) nextGen.experience = Math.min(999, Math.max(0, nextGen.experience + c.effect.experience));
                           if (c.effect.luck) nextGen.luck = Math.min(100, Math.max(0, nextGen.luck + c.effect.luck));
                           if (c.effect.romance) nextGen.romance = Math.min(100, Math.max(0, nextGen.romance + c.effect.romance));
                           if (c.effect.excitement) nextGen.excitement = Math.min(100, Math.max(0, (nextGen.excitement ?? 0) + c.effect.excitement));
                           if (c.effect.money) nextGen.money = nextGen.money + c.effect.money; // Allow negative (debt system)
                       }
                       return {
                           general: nextGen,
                           log: c.resultDescription ? [...s.log, { message: c.resultDescription, type: 'info', timestamp: Date.now() }] : s.log
                       };
                    }
                }))
            })
        }));
        loadedCityEvents = mapped;
        currentLoadedCityCode = code;
        console.log(`Loaded ${mapped.length} events for ${regionName} (${code})`);
    } catch (e) {
        console.error("Failed to load city events", e);
        loadedCityEvents = [];
    }
};

export const getHistoricalEventsForWeek = (state: GameState): GameEvent[] => {
    if (!state.worldContext) return [];
    
    // --- Accurate season calculation based on phase and week ---
    let currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'autumn';
    let yearOffset = 0; // How many years past yearStart
    
    const phase = state.phase;
    if (phase === 'SUMMER' || phase === 'SUMMER_BREAK') {
        currentSeason = 'summer';
    } else if (phase === 'MILITARY') {
        currentSeason = 'autumn';
    } else if (phase === 'SEMESTER_1' || phase === 'CSP_EXAM' || phase === 'NOIP_EXAM' || phase === 'MIDTERM_EXAM' || phase === 'SUBJECT_RESELECTION') {
        // SEMESTER_1 is ~21 weeks spanning Sep to Jan
        // weeks 1-8: autumn (Sep-Oct), weeks 9+: winter (Nov-Jan)
        if (state.week <= 8) {
            currentSeason = 'autumn';
        } else {
            currentSeason = 'winter';
        }
    } else if (phase === 'FINAL_EXAM' || phase === 'WINTER_BREAK') {
        currentSeason = 'winter';
        yearOffset = 1; // Crosses into new calendar year (Jan-Feb)
    } else if (phase === 'SEMESTER_2' || phase === 'MIDTERM_EXAM_2') {
        // SEMESTER_2 is ~21 weeks spanning Feb to Jun
        // weeks 1-10: spring (Feb-May), weeks 11+: summer (May-Jun)
        yearOffset = 1;
        if (state.week <= 10) {
            currentSeason = 'spring';
        } else {
            currentSeason = 'summer';
        }
    } else if (phase === 'FINAL_EXAM_2') {
        currentSeason = 'summer';
        yearOffset = 1;
    }
    
    const currentYear = state.worldContext.yearStart + yearOffset;
    
    const allDefs = [...HISTORICAL_EVENTS, ...loadedCityEvents];
    const matchedDefs = allDefs.filter(def => {
        if (def.year !== currentYear) return false;
        if (def.region && def.region !== state.worldContext!.region) return false;
        if (def.season !== currentSeason) return false;
        if (state.triggeredEvents.includes(def.id)) return false;
        return true;
    });

    return matchedDefs.map(def => def.generateEvent(state));
};
