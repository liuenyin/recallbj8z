
import { GameEvent, GameState, Phase, SUBJECT_NAMES, SubjectKey } from '../types';
import { RIVAL_NICKNAME, restoreRelationshipName } from './campus_names';
import { modifySub } from './utils';
import { hasRomanticInterest } from './relationships';

const PROFICIENCY_SUBJECTS = ['chemistry', 'biology', 'history', 'geography'] as const;
const hasTripCompanion = (state: GameState) =>
    !!state.romancePartner || (!state.flags.romance_resolution && Number(state.flags.ta_favorability || 0) >= 8);

const finishProficiencyExam = (state: GameState, intensivePrep: boolean): Partial<GameState> => {
    const prepBonus = intensivePrep ? 3 : 0;
    const results = PROFICIENCY_SUBJECTS.map(subject => ({
        subject,
        passed: state.subjects[subject].level + prepBonus >= 15
    }));
    const allPassed = results.every(result => result.passed);
    const summary = results.map(({ subject, passed }) => `${SUBJECT_NAMES[subject]}${passed ? '合格' : '不合格'}`).join('，');
    return {
        general: {
            ...state.general,
            health: state.general.health - (intensivePrep ? 10 : 5),
            mindset: state.general.mindset + (allPassed ? (intensivePrep ? 18 : 8) : (intensivePrep ? -10 : -5)),
            efficiency: state.general.efficiency + (intensivePrep ? 0 : 1)
        },
        log: [...state.log, {
            message: `合格考成绩出来了。${summary}。${allPassed ? '这一轮报考的科目都通过了。' : '没通过的科目还可以参加以后学期的合格考。'}`,
            type: allPassed ? 'success' : 'warning',
            timestamp: Date.now()
        }]
    };
};

export const SEMESTER_2_EVENTS: GameEvent[] = [
    {
        id: 's2_april_fools',
        title: '愚人节的假消息',
        description: '4 月 1 日大课间，班群里突然有人发了张截了一半的通知图，说今晚晚自习临时取消，消息一分钟刷了几十条。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedWeek: 5,
        choices: [
            {
                text: '先去跟班长或课代表核对一下',
                hint: '帮大家及时刹住节奏，能涨点经验，但手里的题得晚点写。',
                resultDescription: '班长把原图年份指出来，大家哄笑一阵后很快散开，你也把课桌上散落的卷子理齐了。',
                action: (s) => ({
                    general: { ...s.general, experience: s.general.experience + 5, mindset: s.general.mindset + 4, efficiency: s.general.efficiency + 1 }
                })
            },
            {
                text: '跟同桌调侃两句，然后把手机收进书包',
                hint: '心情轻松些，不会耽误接下来的课内节奏。',
                resultDescription: '你们互相拆穿了截图标红的漏洞，上课铃一响就顺势翻开了下一张练习卷。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 6, romance: s.general.romance + 2 }
                })
            },
            {
                text: '直接免打扰，先把眼前的题做完',
                hint: '效率微涨，专心把这一页收尾。',
                resultDescription: '等旁边安静下来，你已经把最后一道大题的辅助线画好了。',
                action: (s) => ({
                    general: { ...s.general, efficiency: s.general.efficiency + 2 },
                    subjects: modifySub(s, ['math'], 1)
                })
            },
            {
                text: '【乐天派】顺手在群里接句玩笑话，把尴尬圆过去',
                condition: (s) => s.talents.some(t => t.id === 'optimist'),
                resultDescription: '发消息的同学原本有点慌，被你一句玩笑顺下来，班群里气氛很快恢复了轻松。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 10, romance: s.general.romance + 4 }
                })
            }
        ]
    },
    {
        id: 's2_classmate_birthday',
        title: '同桌的生日',
        description: '今天是你同桌的生日，大家都准备了小礼物，你打算怎么表示？',
        type: 'neutral',
        triggerType: 'RANDOM',
        condition: (s) => s.phase === Phase.SEMESTER_2 && Math.random() < 0.1, // 10% chance any week in Sem 2
        once: true,
        choices: [
            {
                text: '买一份精致的礼物 (花费 ¥50)',
                condition: (s) => s.general.money >= 50,
                action: (s) => ({
                    general: { ...s.general, money: s.general.money - 50, romance: s.general.romance + 15 },
                    log: [...s.log, { message: '同桌收到礼物非常开心，你们的关系更进了一步！', type: 'success', timestamp: Date.now() }]
                })
            },
            {
                text: '送上一句真诚的祝福',
                action: (s) => ({
                    general: { ...s.general, romance: s.general.romance + 2 },
                    log: [...s.log, { message: '一句“生日快乐”，礼轻情意重。', type: 'info', timestamp: Date.now() }]
                })
            }
        ]
    },
    {
        id: 's2_spring_trip',
        title: '春游',
        description: '高一春游安排在公园里。大巴刚停稳，春风里混着泥土和树叶的味道，各班散开前大家正商量上午怎么走。',
        type: 'positive',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 12,
        choices: [
            {
                text: '跟着班里大部队沿主步道逛一圈',
                hint: '气氛热闹，心情明显回暖，但走一天会多耗一点体力。',
                resultDescription: '一路拍了不少合照，回程车上有人把零食袋传了一圈，大家靠在椅背上几乎都睡着了。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 22, romance: s.general.romance + 4, health: s.general.health + 2 },
                    fatigue: s.fatigue + 5,
                    flags: { ...s.flags, went_spring_trip: true }
                })
            },
            {
                text: '和三两个熟人走人少的湖边小路',
                condition: (s) => !hasTripCompanion(s),
                hint: '更从容地聊会儿天，缓解积攒下来的疲惫。',
                resultDescription: '你们避开了人群，沿湖走走停停，连平时没机会细聊的话题也讲了半路。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 24, romance: s.general.romance + 6 },
                    fatigue: Math.max(0, s.fatigue - 6),
                    flags: { ...s.flags, went_spring_trip: true }
                })
            },
            {
                text: '叫上TA一起走人少的湖边小路',
                condition: hasTripCompanion,
                hint: '趁着春游多单独走一段，也能把疲劳歇一歇。',
                resultDescription: '你们避开大部队，沿湖边走了半个上午，难得没有作业和周测的催促。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 26, romance: s.general.romance + 8 },
                    fatigue: Math.max(0, s.fatigue - 6),
                    flags: {
                        ...s.flags,
                        went_spring_trip: true,
                        ta_favorability: Number(s.flags.ta_favorability || 0) + 5
                    }
                })
            },
            {
                text: '找张湖边长椅戴上耳机发会儿呆',
                tags: ['sleep'],
                hint: '几乎不费体力，能把持续偏高的疲劳往下压一截。',
                resultDescription: '湖面被风吹得起皱，你靠在长椅上眯了一小觉，醒来时只觉得肩膀松了不少。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 18, health: s.general.health + 6 },
                    fatigue: Math.max(0, s.fatigue - 12),
                    sleepCount: (s.sleepCount || 0) + 1,
                    flags: { ...s.flags, went_spring_trip: true }
                })
            },
            {
                text: '【体育特长】带头走完东侧山坡长线',
                condition: (s) => s.talents.some(t => t.id === 'healthy'),
                resultDescription: '别人走到一半就开始找水喝，你稳着配速一路领到山亭，吹风时心态舒畅不少。',
                action: (s) => ({
                    general: { ...s.general, health: s.general.health + 8, mindset: s.general.mindset + 25, experience: s.general.experience + 4 },
                    flags: { ...s.flags, went_spring_trip: true }
                })
            }
        ]
    },
    {
        id: 's2_debate_start',
        title: '辩论赛报名',
        description: '学校将举办辩论赛，每个班派队伍参加，16个班抽签对决。你要报名吗？',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 9,
        choices: [
            { text: '报名参加！', action: (s) => ({ flags: { ...s.flags, debate_joined: true, debate_stage: 16 } }) },
            { text: '没兴趣，去学习', action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 5 } }) }
        ]
    },
    {
        id: 's2_basketball_start',
        title: '篮球赛报名',
        description: '高一篮球联赛开始报名了，赛程和辩论赛类似，也是班级对抗。',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 5,
        choices: [
            { text: '上场比赛！', action: (s) => ({ flags: { ...s.flags, basketball_joined: true, basketball_stage: 16 } }) },
            { text: '做拉拉队', action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5 } }) }
        ]
    },
    {
        id: 's2_drama_start',
        title: '英语戏剧节报名',
        description: '英语戏剧节开始筹备了。要在期末考完后表演，这是一个展示自我的好机会！',
        type: 'neutral',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 13,
        choices: [
            { text: '参与演出', action: (s) => ({ flags: { ...s.flags, drama_joined: true, drama_progress: 0 } }) },
            { text: '当个观众就好', action: (s) => ({}) }
        ]
    },
    
    // Changing Selection Conditional Event
    {
        id: 's2_change_subject_selection',
        title: '班主任的谈话',
        description: '期中考试结束了。班主任把你叫到办公室：“我看你这次期中考试有些选科成绩不太理想，你要不要考虑换一下选科？”',
        type: 'negative',
        once: true,
        triggerType: 'CONDITIONAL',
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.week >= 11 && s.selectedSubjects.some(sub => s.subjects[sub].level < 10 && s.subjects[sub].aptitude < 30),
        choices: [
            { 
                text: '坚持原本的选择', 
                action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5 } }) 
            },
            {
                text: '重新考虑选科',
                action: (s) => ({
                    phase: Phase.SUBJECT_RESELECTION,
                    subjectReselectionReturnPhase: Phase.SEMESTER_2,
                    log: [...s.log, { message: "你决定重新考虑你的选科方向。", type: 'info', timestamp: Date.now() }]
                })
            }
        ]
    },

    // 6 Related events for Debate, Basketball, Spring Trip
    {
        id: 's2_debate_prep',
        title: '辩论赛准备',
        description: '下周就要打辩论赛了。晚上留校顺立论时，队友拿出一叠还没拆分的案例资料。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.debate_joined && s.week === 10,
        choices: [
            {
                text: '熬夜把一辩稿和反驳预案理透',
                hint: '会明显多累一点，比赛临场更有底气。',
                resultDescription: '你们把对方可能抛出的三个核心反问拆到天明前才散，笔记本写了满满四页。',
                action: (s) => ({
                    flags: { ...s.flags, debate_prepared: true },
                    general: { ...s.general, health: s.general.health - 5, experience: s.general.experience + 12 },
                    fatigue: s.fatigue + 6
                })
            },
            {
                text: '先分好每人负责的两条主线，准点回去休息',
                hint: '保住精力，靠现场反应补细节。',
                resultDescription: '大家约好先睡足再去想细节，至少明天早读不会睁不开眼。',
                action: (s) => ({
                    general: { ...s.general, experience: s.general.experience + 6, mindset: s.general.mindset + 4 }
                })
            }
        ]
    },
    {
        id: 's2_debate_match',
        title: '辩论赛比赛日',
        description: '首轮淘汰赛开始！对方攻势很急，一直追问一个边角定义。你握着话筒准备回应。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.debate_joined && s.week >= 12 && s.week <= 13,
        choices: [
            { 
                text: '正面拆解对方的定义漏洞',
                hint: '胜率吃赛前准备和临场经验，打成了非常提气。',
                resultDescription: '你顺着对方的例子反推回去，台下几排同学同时点头。',
                action: (s) => {
                    const bonus = s.flags.debate_prepared ? 0.16 : 0;
                    const win = Math.random() < Math.min(0.85, 0.54 + bonus + s.general.experience / 250);
                    return {
                        flags: { ...s.flags, debate_stage: win ? 8 : 0 },
                        general: { ...s.general, mindset: s.general.mindset + (win ? 15 : -5), experience: s.general.experience + 6 },
                        log: [...s.log, { message: win ? '你们赢得了比赛，晋级8强！' : '你们遗憾落败，止步16强。', type: win ? 'success' : 'warning', timestamp: Date.now() }]
                    };
                }
            },
            {
                text: '稳住立论节奏，把话题拉回己方核心论点',
                hint: '更稳妥的打法，即使惜败也能积累发言经验。',
                resultDescription: '你没有跟对方在细节里缠斗，而是重新把时间分配和价值衡量说清楚。',
                action: (s) => {
                    const win = Math.random() < (s.flags.debate_prepared ? 0.68 : 0.56);
                    return {
                        flags: { ...s.flags, debate_stage: win ? 8 : 0 },
                        general: { ...s.general, mindset: s.general.mindset + (win ? 12 : 2), experience: s.general.experience + 8 },
                        log: [...s.log, { message: win ? '评委认可你们的框架节奏，成功晋级8强！' : '虽然遗憾止步16强，但整场立论非常稳。', type: win ? 'success' : 'info', timestamp: Date.now() }]
                    };
                }
            }
        ]
    },
    {
        id: 's2_basketball_training',
        title: '篮球赛训练',
        description: '联赛开打前几天，放学后操场上半场灯亮到六点半。体委问今天怎么练。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.basketball_joined && s.week >= 6 && s.week <= 7,
        choices: [
            {
                text: '咬牙加练全场折返与对抗',
                hint: '体力上升，疲劳也会跟着涨。',
                resultDescription: '半小时对抗下来背心全湿透了，但最后几回合传球比上周果断了不少。',
                action: (s) => ({
                    flags: { ...s.flags, basketball_trained: true },
                    general: { ...s.general, health: s.general.health + 7, experience: s.general.experience + 6 },
                    fatigue: s.fatigue + 5
                })
            },
            {
                text: '重点练罚球和半场战术配合',
                hint: '没那么透支，团队默契更稳。',
                resultDescription: '大家轮流罚完两组十中七才下场，回去写作业手也不算抖。',
                action: (s) => ({
                    general: { ...s.general, health: s.general.health + 3, experience: s.general.experience + 5, mindset: s.general.mindset + 4 }
                })
            }
        ]
    },
    {
        id: 's2_basketball_match',
        title: '篮球联赛进行中',
        description: '淘汰赛最后一节还剩两分钟，双方只差两分。场上喘气声和场边的加油声混成一片。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.basketball_joined && s.week >= 7 && s.week <= 8,
        choices: [
            { 
                text: '自己强杀内线造犯规！',
                hint: '看当前健康与体能储备，赌最后一波突破。',
                tags: ['risky'],
                resultDescription: '你接球一步过掉第一个协防，迎着补防把球抛了出去。',
                action: (s) => {
                    const bonus = s.flags.basketball_trained ? 0.1 : 0;
                    const win = Math.random() < Math.min(0.85, 0.5 + bonus + (s.general.health - 50) / 200);
                    return {
                        flags: { ...s.flags, basketball_stage: win ? 8 : 0 },
                        general: { ...s.general, health: s.general.health - 6, mindset: s.general.mindset + (win ? 20 : -10), experience: s.general.experience + 4 },
                        log: [...s.log, { message: win ? '你顶住对抗上篮打进，球队晋级8强！' : '最后一步起跳慢了半拍，球队遗憾止步。', type: win ? 'success' : 'error', timestamp: Date.now() }]
                    };
                }
            },
            {
                text: '吸引包夹后分球给底角空位队友',
                hint: '不硬拼体能，靠配合和运气搏一搏。',
                resultDescription: '两个防守队员扑向你时，你手腕一抖把球甩向了底线空位。',
                action: (s) => {
                    const bonus = s.flags.basketball_trained ? 0.08 : 0;
                    const win = Math.random() < Math.min(0.82, 0.48 + bonus + s.general.luck / 300);
                    return {
                        flags: { ...s.flags, basketball_stage: win ? 8 : 0 },
                        general: { ...s.general, health: s.general.health - 3, mindset: s.general.mindset + (win ? 18 : -4), romance: s.general.romance + (win ? 4 : 1) },
                        log: [...s.log, { message: win ? '队友手起刀落命中三分，球队晋级8强！' : '球砸在前沿弹了出来，差一点就改写结局。', type: win ? 'success' : 'warning', timestamp: Date.now() }]
                    };
                }
            }
        ]
    },
    {
        id: 's2_basketball_final',
        title: '篮球联赛争冠战',
        description: '经过前面几轮拼杀，你们班杀进了四强后的决赛舞台，操场边站满了来加油的同学。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.basketball_stage === 8 && s.week >= 10 && s.week <= 11,
        choices: [
            {
                text: '拼到最后一秒',
                action: (s) => {
                    const win = Math.random() < 0.45 + (s.general.health - 50) / 200;
                    return {
                        flags: { ...s.flags, basketball_stage: win ? 1 : 0 },
                        general: { ...s.general, health: s.general.health - 6, mindset: s.general.mindset + (win ? 30 : 5), romance: s.general.romance + (win ? 6 : 2) },
                        log: [...s.log, { message: win ? '终场哨响，你们班捧起了年级篮球冠军！' : '惜败夺亚，全场依然为你们的拼劲鼓掌。', type: win ? 'success' : 'info', timestamp: Date.now() }]
                    };
                }
            },
            {
                text: '稳扎稳打打团队配合',
                action: (s) => {
                    const win = Math.random() < 0.4 + s.general.experience / 250;
                    return {
                        flags: { ...s.flags, basketball_stage: win ? 1 : 0 },
                        general: { ...s.general, experience: s.general.experience + 8, mindset: s.general.mindset + (win ? 25 : 8) },
                        log: [...s.log, { message: win ? '默契传切打穿防线，你们拿下了冠军！' : '虽然遗憾错失冠军，但这次配合默契十足。', type: win ? 'success' : 'info', timestamp: Date.now() }]
                    };
                }
            }
        ]
    },
    {
        id: 's2_spring_trip_photo',
        title: '春游合照',
        description: '逛到中午，大家在公园草坪前喊着要拍一张全班大合照。前面已经蹲了一排。',
        type: 'positive',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.went_spring_trip && s.week === 14,
        choices: [
            {
                text: '挤到熟人旁边比个手势',
                resultDescription: '快门按下那一刻后面忽然有人起了个哄，成片里一半人都在笑。',
                action: (s) => ({ general: { ...s.general, romance: s.general.romance + 5, mindset: s.general.mindset + 6 } })
            },
            {
                text: '帮忙架好手机倒计时，退到后排角落',
                resultDescription: '你跑回去时差点压上三秒倒计时，顺手扶了一下歪掉的班旗。',
                action: (s) => ({ general: { ...s.general, experience: s.general.experience + 4, mindset: s.general.mindset + 5 } })
            }
        ]
    },
    {
        id: 's2_spring_trip_lost',
        title: '春游小插曲',
        description: '自由活动结束前，你绕去另一头买水，回头时发现班里的集合点已经换了方向。',
        type: 'neutral',
        triggerType: 'CONDITIONAL',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.went_spring_trip && s.week === 14,
        choices: [
            {
                text: '立刻给班长发消息问位置',
                resultDescription: '班长把共享位置发过来，你在大部队上车前三分钟赶回来了。',
                action: (s) => ({ general: { ...s.general, experience: s.general.experience + 5, mindset: s.general.mindset + 2 } })
            },
            {
                text: '自己对照园区地图抄近道走回门口',
                resultDescription: '顺着湖岸多走了一段路，反而赶在不少同学前面到了集合点。',
                action: (s) => ({ general: { ...s.general, experience: s.general.experience + 6, efficiency: s.general.efficiency + 1 } })
            }
        ]
    },
    // --- DEBATE PROGRESSION ---
    {
        id: 's2_debate_quarter',
        title: '辩论赛 8进4',
        description: '你们队杀入八强！半场暂停时，对方刚抛出一个你们没预料到的数据角度。',
        type: 'positive', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.debate_stage === 8 && s.week >= 13 && s.week <= 14,
        choices: [
            { 
                text: '临场抓住对方数据的统计口径漏洞反击',
                hint: '看心态和现场魄力，成功就能挺进四强。',
                resultDescription: '你低头在草稿纸上圈出样本范围那一行，接过下一轮质询。',
                action: (s) => {
                    const win = Math.random() < Math.min(0.85, 0.5 + (s.general.mindset - 50) / 200);
                    return {
                        flags: { ...s.flags, debate_stage: win ? 4 : 0 },
                        general: { ...s.general, mindset: s.general.mindset + (win ? 20 : -10), experience: s.general.experience + 6 },
                        log: [...s.log, { message: win ? '惊险取胜，挺进半决赛！' : '发挥失常，遗憾淘汰。', type: win ? 'success' : 'warning', timestamp: Date.now() }]
                    };
                }
            },
            {
                text: '果断让出那个细枝末节，把时间压到价值总结上',
                hint: '靠积累过的辩论经验稳步推进。',
                resultDescription: '你示意二辩不要恋战，直接把讨论收回到立论最核心的标准对比。',
                action: (s) => {
                    const win = Math.random() < Math.min(0.85, 0.45 + s.general.experience / 180);
                    return {
                        flags: { ...s.flags, debate_stage: win ? 4 : 0 },
                        general: { ...s.general, mindset: s.general.mindset + (win ? 16 : -6), experience: s.general.experience + 8 },
                        log: [...s.log, { message: win ? '总结陈词稳住了评委，你们挺进四强！' : '虽然节奏稳重，但仍以微弱票差惜败。', type: win ? 'success' : 'info', timestamp: Date.now() }]
                    };
                }
            }
        ]
    },
    {
        id: 's2_debate_semi',
        title: '辩论赛 半决赛的黑幕',
        description: '四强赛！全校都在关注这场比赛。但就在上场前，你们突然发现一个致命问题：组委会通知双方抽签竟然都抽到了正方，然而你们队伍辛辛苦苦准备了一周的实际上是反方的稿子！',
        type: 'negative', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.debate_stage === 4 && s.week === 15,
        choices: [
            { 
                text: '当场声明并留存经验，不打不公平的局', 
                action: (s) => {
                    return {
                        flags: { ...s.flags, debate_stage: 0 },
                        general: { ...s.general, experience: s.general.experience + 12, romance: s.general.romance + 4, mindset: s.general.mindset - 8 },
                        log: [...s.log, { message: '你们体面申诉后退赛，在场同学都认可你们坚持原则的态度。', type: 'warning', timestamp: Date.now() }]
                    }
                }
            },
            { 
                text: '不管了，全部脱稿硬刚！', 
                action: (s) => {
                    const win = Math.random() < 0.15 + (s.general.mindset - 50)/300;
                    return {
                        flags: { ...s.flags, debate_stage: win ? 2 : 0 },
                        general: { ...s.general, experience: s.general.experience + 20, mindset: s.general.mindset + (win ? 40 : -20) },
                        log: [...s.log, { message: win ? '奇迹发生！凭借强大的临场应变能力逆天改命，杀入总决赛！' : '准备完全作废，临场发挥不佳，遗憾落败。', type: win ? 'success' : 'warning', timestamp: Date.now() }]
                    }
                }
            }
        ]
    },
    {
        id: 's2_debate_final',
        title: '辩论赛 总决赛',
        description: '站在大礼堂的聚光灯下，你们离冠军只有一步之遥！',
        type: 'positive', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.debate_stage === 2 && s.week === 17,
        choices: [
            { 
                text: '为了冠军！', 
                action: (s) => {
                    const win = Math.random() < 0.3 + (s.general.experience)/200;
                    return {
                        flags: { ...s.flags, debate_stage: win ? 1 : 0, achievement_debater: win ? true : undefined },
                        general: { ...s.general, experience: s.general.experience + 20, mindset: s.general.mindset + (win ? 50 : 10) },
                        log: [...s.log, { message: win ? '我们是冠军！！！' : '获得亚军，已经很棒了。', type: win ? 'success' : 'info', timestamp: Date.now() }]
                    }
                }
            }
        ]
    },
    // --- DRAMA PROGRESSION ---
    {
        id: 's2_drama_audition',
        title: '英语戏剧节 选角',
        description: '戏剧节马上开始排练了，你决定竞选什么角色？',
        type: 'neutral', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.drama_joined && s.week === 14,
        choices: [
            { text: '竞选主角 (英语水平≥15 或 天赋≥75)', condition: (s) => s.subjects.english.level >= 15 || s.subjects.english.aptitude >= 75, action: (s) => ({ flags: { ...s.flags, drama_progress: 1, drama_role: 'main' }, general: { ...s.general, mindset: s.general.mindset - 5 } }) },
            { text: '当个配角/旁白', action: (s) => ({ flags: { ...s.flags, drama_progress: 1, drama_role: 'sub' } }) },
            { text: '负责幕后道具与统筹', action: (s) => ({ flags: { ...s.flags, drama_progress: 1, drama_role: 'prop' } }) }
        ]
    },
    {
        id: 's2_drama_rehearsal',
        title: '戏剧节 排练',
        description: state => state.flags.drama_role === 'prop'
            ? '放学后，剧组借了间空教室走一遍。两件道具看起来差不多，上场顺序却刚好相反。'
            : '放学后，剧组借了间空教室走一遍。台词背熟了，换场时还是有人走错边。',
        type: 'neutral', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.drama_progress === 1 && s.week === 16,
        choices: [
            {
                text: '把换场和接台词再过一遍',
                condition: state => state.flags.drama_role !== 'prop',
                resultDescription: '你们把走错的一段重来了一遍，约好听见上一句台词再从幕边往前走。',
                action: state => ({ flags: { ...state.flags, drama_progress: 2 }, general: { ...state.general, health: state.general.health - 5, experience: state.general.experience + 10 } })
            },
            {
                text: '给道具贴上出场顺序',
                condition: state => state.flags.drama_role === 'prop',
                resultDescription: '你把两件道具分开摆，又写了张能在昏暗里看清的清单，让接手的人也能马上找到。',
                action: state => ({ flags: { ...state.flags, drama_progress: 2 }, general: { ...state.general, health: state.general.health - 5, experience: state.general.experience + 10 } })
            }
        ]
    },
    {
        id: 's2_drama_performance',
        title: '英语戏剧节 正式演出！',
        description: state => state.flags.drama_role === 'prop'
            ? '轮到你们班了。灯一暗，前台有人伸手催下一件道具。你认出了彩排时贴的标记。'
            : '轮到你们班了。台下渐渐安静下来，幕边的同学正等你接上第一句。',
        type: 'positive', triggerType: 'CONDITIONAL', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.flags.drama_progress === 2 && s.week === 18,
        choices: [
            {
                text: '听准提示，把自己的戏接上',
                condition: state => state.flags.drama_role !== 'prop',
                resultDescription: '短短几分钟比彩排过得快。最后一幕走完，你才听见台下开始鼓掌。',
                action: state => ({
                    flags: { ...state.flags, drama_performed: true },
                    general: {
                        ...state.general,
                        mindset: state.general.mindset + (state.flags.drama_role === 'main' ? 28 : 18),
                        romance: state.general.romance + (state.flags.drama_role === 'main' ? 8 : 4),
                        experience: state.general.experience + 8
                    }
                })
            },
            {
                text: '照清单递道具，确认下一幕也摆好了',
                condition: state => state.flags.drama_role === 'prop',
                resultDescription: '幕布合上前，台上同学回头跟你比了个手势。你这才发现手里还攥着那张被揉皱的清单。',
                action: state => ({
                    flags: { ...state.flags, drama_performed: true },
                    general: {
                        ...state.general,
                        mindset: state.general.mindset + 12,
                        romance: state.general.romance + 2,
                        experience: state.general.experience + 14,
                        efficiency: state.general.efficiency + 1
                    }
                })
            }
        ]
    },
    // --- ACADEMIC PROFICIENCY EXAM (学考) ---
    {
        id: 's2_academic_exam',
        title: '高中学业水平合格考',
        description: '这次报名表上是化学、生物、历史和地理。每门各判一次合格，你准备用多少时间过一遍没弄懂的内容？',
        type: 'negative', triggerType: 'FIXED', once: true, fixedWeek: 19,
        choices: [
            { 
                text: '集中补一补薄弱的科目',
                hint: '各科过关更稳，会多消耗一些体力。',
                action: state => finishProficiencyExam(state, true)
            },
            {
                text: '按平常的节奏准备，给期末留点精力',
                action: state => finishProficiencyExam(state, false)
            }
        ]
    },
    // --- RANDOM FILLERS ---
    {
        id: 's2_daily_lost_card',
        title: '饭卡去哪了',
        description: '排到食堂窗口时，你摸了两次口袋都没找到饭卡。身后的同班同学说可以先帮你刷。',
        type: 'neutral', triggerType: 'RANDOM', once: true,
        condition: s => s.week >= 2 && s.week <= 11,
        choices: [
            {
                text: '请同学先刷，吃完一起回去找',
                tags: ['social'],
                resultDescription: '你吃完饭回教室翻了翻书包，饭卡夹在今天早上用过的那本练习册里。',
                action: s => ({ general: { ...s.general, mindset: s.general.mindset + 3 } })
            },
            {
                text: '回教室找找饭卡',
                resultDescription: '你从练习册里抽出饭卡。再到食堂时，你想点的那道菜已经卖完了。',
                action: s => ({ general: { ...s.general, experience: s.general.experience + 2 } })
            }
        ]
    },
    {
        id: 's2_daily_pendulums',
        title: '一长一短两根线',
        description: '物理老师收拾演示器材时，你发现两个摆锤长得一样，挂在长线上的那个摆得慢些。',
        type: 'neutral', triggerType: 'RANDOM', once: true,
        condition: s => s.week >= 3 && s.week <= 16,
        choices: [
            {
                text: '问老师能不能自己换一次线',
                tags: ['study'],
                resultDescription: '你把同一个摆锤换到短线上，数完十次摆动，再回去和刚才记的时间对照。',
                action: s => ({ subjects: modifySub(s, ['physics'], 0.8) })
            },
            {
                text: '把两个摆的区别记在本上',
                resultDescription: '你把线长和摆动时间记在同一页，下节课能接着看。',
                action: s => ({ general: { ...s.general, experience: s.general.experience + 2 } })
            }
        ]
    },
    {
        id: 's2_daily_wet_track',
        title: '雨后的体育课',
        description: '雨停了，跑道内侧还有积水。体育老师取消了今天的计时跑，让大家在干燥的地方活动。',
        type: 'neutral', triggerType: 'RANDOM', once: true,
        condition: s => s.week >= 5 && s.week <= 18,
        choices: [
            {
                text: '跟同学做一组拉伸',
                tags: ['sport'],
                resultDescription: '你们轮着数拍子。下课前，腿已经不像早上那么僵了。',
                action: s => ({ general: { ...s.general, health: s.general.health + 2, mindset: s.general.mindset + 2 } })
            },
            {
                text: '帮体育委员把球收回去',
                tags: ['social'],
                resultDescription: '你们数出少了一只球，在看台边找了回来。',
                action: s => ({ general: { ...s.general, experience: s.general.experience + 3 } })
            }
        ]
    },
    {
        id: 's2_daily_duplicate_page',
        title: '印重的一页',
        description: '英语卷发下来，第三页和第四页一模一样。后排已经有人做完了前两页。',
        type: 'neutral', triggerType: 'RANDOM', once: true,
        condition: s => s.week >= 7 && s.week <= 19,
        choices: [
            {
                text: '告诉老师，先给全班补发第四页',
                tags: ['social'],
                resultDescription: '老师把最后一页投在屏幕上。课代表去补印的时候，大家先接着看题。',
                action: s => ({ general: { ...s.general, experience: s.general.experience + 3 } })
            },
            {
                text: '先把前两页写完',
                tags: ['study'],
                resultDescription: '你刚写完第二页，课代表就拿来了补印的卷子。',
                action: s => ({ subjects: modifySub(s, ['english'], 0.7) })
            }
        ]
    },
    {
        id: 's2_daily_book_corner',
        title: '清点图书角',
        description: '午休前，班长摊开图书角的登记本。书架上有几本书插错了格子，还有一本在你课桌里。',
        type: 'neutral', triggerType: 'RANDOM', once: true,
        condition: s => s.week >= 12,
        choices: [
            {
                text: '还书，顺手帮忙清点',
                tags: ['social'],
                resultDescription: '你和班长按书脊上的编号排好书，总算对上了登记本。',
                action: s => ({ general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 1 } })
            },
            {
                text: '问问能不能借到周五',
                resultDescription: '你在登记本上改了归还日期。晚上有空，可以把最后几页看完。',
                action: s => ({ general: { ...s.general, mindset: s.general.mindset + 3 } })
            }
        ]
    },
    {
        id: 's2_spring_fatigue',
        title: '春困秋乏',
        description: '外面的阳光暖洋洋的，微风吹过，你坐在教室里上物理课，眼皮疯狂打架。',
        type: 'negative', triggerType: 'RANDOM', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.week >= 6 && s.week <= 14,
        choices: [
            { text: '死撑着听课', action: (s) => ({ general: { ...s.general, health: s.general.health - 5, efficiency: s.general.efficiency - 2 } }) },
            { text: '偷偷睡一觉', action: (s) => ({ general: { ...s.general, health: s.general.health + 5, efficiency: s.general.efficiency + 2 }, sleepCount: (s.sleepCount || 0) + 1 }) }
        ]
    },
    {
        id: 's2_seat_change',
        title: '换座位',
        description: '班主任把新的座位表贴到了黑板上。下课后要搬桌子，你收书时先往黑板上看了一眼。',
        type: 'neutral', triggerType: 'RANDOM', once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2,
        choices: [
            { text: '看看离 TA 的座位有多远', condition: s => !!s.romancePartner || hasRomanticInterest(s), action: (s) => {
                const luck = Math.random() > 0.5;
                return {
                    general: { ...s.general, mindset: s.general.mindset + (luck ? 10 : -5), romance: s.general.romance + (luck ? 5 : -2) },
                    log: [...s.log, { message: luck ? '竟然真的坐在了附近！' : '离得很远，有点失落。', type: luck ? 'success' : 'info', timestamp: Date.now() }]
                };
            } },
            {
                text: '看看自己能不能坐到窗边',
                resultDescription: '你被调到了靠近过道的位置，至少抬头能看到一点树梢。',
                action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 1, mindset: s.general.mindset + 3 } })
            }
        ]
    },
    {
        id: 's2_late_night_homework',
        title: '十一点半的两张卷子',
        description: '书桌上还摊着两张明天早读前要交的练习卷。台灯旁的表已经走过十一点半。',
        type: 'negative',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.week >= 3 && s.week <= 13,
        choices: [
            {
                text: '硬扛到一点全部写完',
                hint: '选考科目明显涨一截，但疲劳会陡增、健康也会掉。',
                tags: ['study', 'risky'],
                resultDescription: '最后一题算完的时候手心都有点凉，你把书包拉链合上倒头就睡。',
                action: (s) => {
                    const targets: SubjectKey[] = s.selectedSubjects.length ? s.selectedSubjects : ['chinese', 'math', 'english'];
                    return {
                        subjects: modifySub(s, targets, 3),
                        fatigue: s.fatigue + 14,
                        general: { ...s.general, health: s.general.health - 6, mindset: s.general.mindset - 3 }
                    };
                }
            },
            {
                text: '先写完几道主要题，其余明早补',
                hint: '稳住作息与心态，功课只浅浅过一遍。',
                tags: ['study'],
                resultDescription: '把会考的核心题写完、生疏的标上问号，明早提前十分钟再来补。',
                action: (s) => {
                    const targets: SubjectKey[] = s.selectedSubjects.length ? s.selectedSubjects : ['chinese', 'math', 'english'];
                    return {
                        subjects: modifySub(s, targets, 1.5),
                        fatigue: Math.max(0, s.fatigue - 4),
                        general: { ...s.general, mindset: s.general.mindset + 5 }
                    };
                }
            },
            {
                text: '【天赋】找出两张卷子里用同一种解法的题',
                condition: (s) => s.talents.some(t => t.id === 'genius' || t.id === 'oi_nerd'),
                tags: ['study'],
                resultDescription: '你看清后面四道题用的都是同一种转化套路，赶在零点前把两张卷子都收进书包。',
                action: (s) => {
                    const targets: SubjectKey[] = s.selectedSubjects.length ? s.selectedSubjects : ['chinese', 'math', 'english'];
                    return {
                        subjects: modifySub(s, targets, 3.5),
                        fatigue: s.fatigue + 3,
                        general: { ...s.general, efficiency: s.general.efficiency + 1, mindset: s.general.mindset + 4 }
                    };
                }
            },
            {
                text: '收起卷子，先睡觉',
                tags: ['sleep'],
                resultDescription: '你把没写完的卷子夹进书包，定好闹钟后关了灯。',
                action: (s) => ({ fatigue: Math.max(0, s.fatigue - 10), sleepCount: (s.sleepCount || 0) + 1 })
            }
        ]
    },
    {
        id: 's2_mock_rank_shock',
        title: '后墙贴出的周测统计表',
        description: '下课铃刚响，后墙白板新贴了一张周测小题分统计。这周压轴题全年级卡了一大半，你的名字比上回掉了一截。',
        type: 'negative',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => s.phase === Phase.SEMESTER_2 && s.week >= 8 && s.week <= 15,
        choices: [
            {
                text: '今晚留在自习室把错题每一步拆透',
                hint: '学科与效率会往上抬，但心里多少有点憋闷。',
                tags: ['study'],
                resultDescription: '你一条一条对着步骤排查，最后发现真正丢分的是第二问那个漏掉的分类讨论。',
                action: (s) => {
                    const targets: SubjectKey[] = s.selectedSubjects.length ? s.selectedSubjects : ['chinese', 'math', 'english'];
                    return {
                        subjects: modifySub(s, targets, 2.5),
                        fatigue: s.fatigue + 8,
                        general: { ...s.general, efficiency: s.general.efficiency + 1, mindset: s.general.mindset - 6 }
                    };
                }
            },
            {
                text: `找${RIVAL_NICKNAME}借一份解题思路互相核对`,
                hint: '既能顺完最难的一问，也能稳住心态。',
                tags: ['study'],
                resultDescription: `${RIVAL_NICKNAME}直接把草稿纸翻过来看你的第一步：“你这步其实快到了，后面换元换错了个符号。”`,
                action: (s) => {
                    const targets: SubjectKey[] = s.selectedSubjects.length ? s.selectedSubjects : ['chinese', 'math', 'english'];
                    return {
                        subjects: modifySub(s, targets, 1.5),
                        general: { ...s.general, experience: s.general.experience + 8, mindset: s.general.mindset + 6 }
                    };
                }
            },
            {
                text: '【天赋】收好卷子，挑一道题留到下周',
                condition: (s) => s.talents.some(t => t.id === 'poor_student' || t.id === 'optimist'),
                resultDescription: '一次小题没拿稳说明还有空间。你在目录页贴了一张小便利贴，心里反而踏实下来。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 12, efficiency: s.general.efficiency + 1.5 }
                })
            }
        ]
    }
];

export const WINTER_BREAK_EVENTS: GameEvent[] = [
    {
        id: 'wb_new_year',
        title: '除夕夜',
        description: '今天是除夕，外面鞭炮齐鸣，家里热热闹闹的。',
        type: 'positive',
        once: true,
        triggerType: 'FIXED',
        fixedWeek: 3,
        choices: [
            {
                text: '吃年夜饭，收压岁钱！',
                resultDescription: '一家人热热闹闹吃过年夜饭，你把长辈塞来的压岁钱收进小金库。',
                action: (s) => ({ general: { ...s.general, money: s.general.money + 200, mindset: s.general.mindset + 20 } })
            }
        ]
    }
];
