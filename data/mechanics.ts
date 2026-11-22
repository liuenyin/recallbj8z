
import { Talent, Item, Achievement, GameStatus, Club, WeekendActivity, GameState, Phase } from '../types';
import { getLearningMultiplier, modifySub, modifyOI } from './utils';
import { PROJECT_WORK_PROGRESS } from './project_effects';
import { WEEKEND_INVITATIONS } from './weekend_invites';
import { getHomeworkSlotsNeeded, HOMEWORK_ACTIVITY_ID } from './timetable';
import { WEEKEND_STATUSES } from './balance';
import { getMoPracticeTopic, trainMo } from './mo_competition';

const MO_PROOF_FEEDBACK = {
    geometry: '你用相似把图上的两段线段联系起来，补齐了辅助线的证明。',
    algebra: '你在放缩时检查了等号成立的条件，把漏掉的一种情况补上了。',
    number_theory: '你按余数逐一排除，最后验算了剩下的整数解。',
    combinatorics: '你写出一个排法，又用反证说明更少的步数行不通。'
};

// --- Talents ---
export const TALENTS: Talent[] = [
    // --- Legendary (Cost 4) ---
    { id: 'genius', name: '天生我才', description: '全学科天赋+10，效率+5。', rarity: 'legendary', cost: 4,
      effect: (s) => {
          const newSubs = { ...s.subjects };
          (Object.keys(newSubs) as Array<keyof typeof newSubs>).forEach(k => {
              newSubs[k] = { ...newSubs[k], aptitude: newSubs[k].aptitude + 10 };
          });
          return { subjects: newSubs, general: { ...s.general, efficiency: s.general.efficiency + 5 } };
      }
    },
    { id: 'rich_kid', name: '家里有矿', description: '初始金钱+180。', rarity: 'legendary', cost: 3,
      effect: (s) => ({ general: { ...s.general, money: s.general.money + 180 } })
    },
    // --- Rare (Cost 2-3) ---
    { id: 'attractive', name: '万人迷', description: '初始魅力 +20，和同学聊起来更容易。', rarity: 'rare', cost: 2,
      effect: (s) => ({ general: { ...s.general, romance: s.general.romance + 20 } })
    },
    { id: 'oi_nerd', name: '机房幽灵', description: 'OI各项能力初始+5，但魅力-10。', rarity: 'rare', cost: 3,
      effect: (s) => ({
          oiStats: modifyOI(s, { dp: 5, ds: 5, math: 5, string: 5, graph: 5, misc: 5 }),
          general: { ...s.general, romance: Math.max(0, s.general.romance - 10) }
      })
    },
    { id: 'lucky_dog', name: '锦鲤附体', description: '初始运气+30。', rarity: 'rare', cost: 2,
        effect: (s) => ({ general: { ...s.general, luck: s.general.luck + 30 } })
    },
    // --- Common (Cost 1) ---
    { id: 'healthy', name: '体育特长', description: '初始健康+20。', rarity: 'common', cost: 1,
      effect: (s) => ({ general: { ...s.general, health: s.general.health + 20 } })
    },
    { id: 'optimist', name: '乐天派', description: '初始心态+20。', rarity: 'common', cost: 1,
        effect: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 20 } })
    },
    { id: 'poor_student', name: '寒门学子', description: '初始金钱-50，但意志坚定（心态+10，效率+2）。', rarity: 'common', cost: 1,
        effect: (s) => ({ general: { ...s.general, money: s.general.money - 50, mindset: s.general.mindset + 10, efficiency: s.general.efficiency + 2 } })
    },

    // --- Cursed (Negative Cost = Gives Points) ---
    { id: 'poverty', name: '家徒四壁', description: '初始金钱-100，需要扛着债务开局。', rarity: 'cursed', cost: -2,
      effect: (s) => ({ general: { ...s.general, money: s.general.money - 100 } })
    },
    { id: 'frail', name: '体弱多病', description: '初始健康-35，稍不注意就会生病。', rarity: 'cursed', cost: -2,
      effect: (s) => ({ general: { ...s.general, health: Math.max(10, s.general.health - 35) } })
    },
    { id: 'loner', name: '孤僻', description: '初始魅力-25、心态-5，很难建立人际关系。', rarity: 'cursed', cost: -1,
      effect: (s) => ({ general: { ...s.general, romance: Math.max(0, s.general.romance - 25), mindset: Math.max(0, s.general.mindset - 5) } })
    },
    { id: 'dumb', name: '笨鸟先飞', description: '效率-7，学习非常吃力。', rarity: 'cursed', cost: -3,
      effect: (s) => ({ general: { ...s.general, efficiency: Math.max(1, s.general.efficiency - 7) } })
    },
    { id: 'bad_luck', name: '非酋', description: '运气-20，喝凉水都塞牙。', rarity: 'cursed', cost: -1,
      effect: (s) => ({ general: { ...s.general, luck: Math.max(0, s.general.luck - 20) } })
    }
];

// --- Shop Items ---
export const SHOP_ITEMS: Item[] = [
    { id: 'red_bull', name: '功能性提神饮', description: '高强度突击：效率+5、兴奋+25，但疲劳+10、健康-2。', price: 150, icon: 'fa-bolt',
      effect: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 5, health: s.general.health - 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 25) }, fatigue: Math.min(100, s.fatigue + 10) }) },
    { id: 'coffee', name: '瑞幸生椰拿铁', description: '温和提神：心态+3，效率+0.5，疲劳+2。', price: 20, icon: 'fa-coffee',
      effect: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, efficiency: s.general.efficiency + 0.5 }, fatigue: Math.min(100, s.fatigue + 2) }) },
    { id: 'five_three', name: '五年高考三年模拟', description: '全科水平+0.5，心态-8。', price: 45, icon: 'fa-book',
      effect: (s) => ({
          subjects: modifySub(s, ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'history', 'geography', 'politics'], 0.5),
          general: { ...s.general, mindset: s.general.mindset - 8 }
      }) },
    { id: 'game_skin', name: '限定游戏皮肤', description: '虽然不能变强，但心情变好了。心态+8。', price: 68, icon: 'fa-gamepad',
      effect: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 8 } }) },
    { id: 'flowers', name: '鲜花', description: '认识TA后可以送花。', price: 50, icon: 'fa-fan',
      effect: (s) => ({
          general: { ...s.general, romance: s.general.romance + 5, mindset: s.general.mindset + (s.romancePartner ? 8 : 0) },
          flags: s.flags.romance_met || s.romancePartner ? { ...s.flags, ta_favorability: Number(s.flags.ta_favorability || 0) + 6 } : s.flags
      }) },
    { id: 'algo_book', name: '算法导论', description: '厚得可以当枕头。OI能力全面+2。', price: 80, icon: 'fa-code',
      effect: (s) => ({ oiStats: modifyOI(s, { dp: 2, ds: 2, math: 2, graph: 2, string: 2, misc: 2 }) }) },
    { id: 'luogu_book', name: '深入浅出程序设计竞赛', description: 'kkk亲签？', price: 56, icon: 'fa-code',
      effect: (s) => ({ oiStats: modifyOI(s, { dp: 1, ds: 2, math: 2, graph: 1, string: 1, misc: 1 }) }) },
    { id: 'gym_card', name: '健身卡', description: '强身健体。健康+15。', price: 100, icon: 'fa-dumbbell',
      effect: (s) => ({ general: { ...s.general, health: s.general.health + 15 } }) }
];

// --- Achievements ---
export const ACHIEVEMENTS: Record<string, Achievement> = {
    'first_blood': { id: 'first_blood', title: '初入八中', description: '成功开始你的高中生活。', icon: 'fa-school', rarity: 'common' },
    'nerd': { id: 'nerd', title: '卷王', description: '单科成绩达到满分。', icon: 'fa-book-reader', rarity: 'rare' },
    'romance_master': { id: 'romance_master', title: '告白成功', description: '成功确立一段恋爱关系。', icon: 'fa-heart', rarity: 'legendary' },
    'oi_god': { id: 'oi_god', title: 'NOIP 高分选手', description: '在 NOIP 中取得至少 195 分。', icon: 'fa-code', rarity: 'legendary' },
    'survival': { id: 'survival', title: '极限生存', description: '在高一上半学期后半段健康低于10仍继续游戏。', icon: 'fa-notes-medical', rarity: 'rare' },
    'rich': { id: 'rich', title: '小金库', description: '持有金钱超过200。', icon: 'fa-coins', rarity: 'common' },
    'in_debt': { id: 'in_debt', title: '负债累累', description: '负债超过250。', icon: 'fa-file-invoice-dollar', rarity: 'common' },
    'top_rank': { id: 'top_rank', title: '一览众山小', description: '年级第一！（真的能实现！LA群里有人成功了！）', icon: 'fa-crown', rarity: 'legendary' },
    'bottom_rank': { id: 'bottom_rank', title: '旷世奇才', description: '倒数第一，也是神人。', icon: 'fa-poop', rarity: 'rare' },
    'sleep_god': { id: 'sleep_god', title: '睡神', description: '天天睡觉还考这么高，羡慕了。', icon: 'fa-bed', rarity: 'legendary' },
    'nice_person': { id: 'nice_person', title: '体面边界', description: '认真面对感情与边界（收到好人卡或体面约定做朋友）。', icon: 'fa-heart-broken', rarity: 'rare' },
    'sports_star': { id: 'sports_star', title: '运动健将', description: '健康值达到100。', icon: 'fa-running', rarity: 'common' },
    'emotional_damage': { id: 'emotional_damage', title: '情绪崩溃', description: '心态降至0，你急需心理辅导。', icon: 'fa-sad-tear', rarity: 'common' },
    'popular': { id: 'popular', title: '万人迷', description: '魅力达到80以上，走到哪里都是焦点。', icon: 'fa-star', rarity: 'rare' },
};

// --- Statuses ---
export const STATUSES: Record<string, Omit<GameStatus, 'duration'>> = {
    ...WEEKEND_STATUSES,
    'focused': { id: 'focused', name: '心流', description: '你进入了极度专注的状态。', type: 'BUFF', icon: 'fa-bolt', effectDescription: '全学科效率大幅提升' },
    'anxious': { id: 'anxious', name: '焦虑', description: '对未来的担忧让你无法平静。', type: 'DEBUFF', icon: 'fa-cloud-rain', effectDescription: '每回合心态 -2' },
    'crush': { id: 'crush', name: '暗恋', description: '上课时，你偶尔会想到TA。', type: 'NEUTRAL', icon: 'fa-heart', effectDescription: '效率 -2，魅力 +2' },
    'in_love': { id: 'in_love', name: '恋爱', description: '放学后有人等你一起走。', type: 'BUFF', icon: 'fa-heartbeat', effectDescription: '每周心态 +5' },
    'heartbroken': { id: 'heartbroken', name: '失恋', description: '心如刀绞，这就是青春的代价吗？', type: 'DEBUFF', icon: 'fa-heart-broken', effectDescription: '每周心态 -3, 效率 -1' },
    'exhausted': { id: 'exhausted', name: '透支', description: '你需要休息。', type: 'DEBUFF', icon: 'fa-bed', effectDescription: '健康无法自然恢复' },
    'crush_pending': { id: 'crush_pending', name: '恋人未满', description: '你们最近常在课间聊天。', type: 'BUFF', icon: 'fa-comments', effectDescription: '每周运气 +2，经验 +2' },
    'sleep_compulsion': { id: 'sleep_compulsion', name: '让我睡觉！', description: '每周不睡觉就会死。', type: 'DEBUFF', icon: 'fa-dizzy', effectDescription: '每周必须进行一次睡觉事件' },
    'fatigued': { id: 'fatigued', name: '疲惫', description: '身体开始向你索要休息，硬撑会越来越难。', type: 'DEBUFF', icon: 'fa-battery-quarter', effectDescription: '每周心态-1，效率-1' },
    'overstimulated': { id: 'overstimulated', name: '过度兴奋', description: '脑子停不下来，短期很有冲劲，睡眠却变浅了。', type: 'DEBUFF', icon: 'fa-fire-alt', effectDescription: '每周效率-1，休息恢复降低' },
    'low_morale': { id: 'low_morale', name: '低落', description: '做什么都像隔着一层雾，先找回一点掌控感。', type: 'DEBUFF', icon: 'fa-cloud', effectDescription: '每周效率-1' },
    // --- Graded Debt Statuses ---
    'debt_1': { id: 'debt_1', name: '负债 I', description: '这点钱下个月就能还上……吧？', type: 'DEBUFF', icon: 'fa-file-invoice', effectDescription: '心态-5, 魅力-3 /周' },
    'debt_2': { id: 'debt_2', name: '负债 II', description: '债务像滚雪球一样变大了。', type: 'DEBUFF', icon: 'fa-file-invoice-dollar', effectDescription: '心态-10, 魅力-6 /周' },
    'debt_3': { id: 'debt_3', name: '负债 III', description: '你开始躲避任何敲门声。', type: 'DEBUFF', icon: 'fa-sack-dollar', effectDescription: '心态-20, 魅力-12 /周' },
    'debt_4': { id: 'debt_4', name: '负债 IV', description: '能欠下来这么多也是有实力的……', type: 'DEBUFF', icon: 'fa-skull', effectDescription: '心态-40, 魅力-24 /周' },
    'debt_5': { id: 'debt_5', name: '负债 V', description: '还有高手？', type: 'DEBUFF', icon: 'fa-skull', effectDescription: '心态-80, 魅力-48 /周' }
};

// --- Clubs ---
export const CLUBS: Club[] = [
    {
        id: 'rap', name: '说唱社', icon: 'fa-microphone', description: 'Real Talk, Real Life.', effectDescription: '魅力++, 英语+, 经验+',
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 3, experience: s.general.experience + 2 }, subjects: modifySub(s, ['english'], 1) })
    },
    {
        id: 'dance', name: '街舞社', icon: 'fa-child', description: '挥洒汗水，舞动青春。', effectDescription: '健康++, 魅力++, 心态+',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 3, romance: s.general.romance + 3, mindset: s.general.mindset + 2 } })
    },
    {
        id: 'volleyball', name: '排球社', icon: 'fa-volleyball-ball', description: '每次扣杀和救球，都是场边最响亮的呐喊。', effectDescription: '健康++, 魅力+, 心态+',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 3, romance: s.general.romance + 2, mindset: s.general.mindset + 2 } })
    },
    {
        id: 'vocaloid', name: '天籁V家', icon: 'fa-music', description: 'Miku！', effectDescription: '魅力++, 心态+, 经验+',
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 3, mindset: s.general.mindset + 2, experience: s.general.experience + 1 } })
    },
    {
        id: 'poetry', name: '一方诗社', icon: 'fa-pen-nib', description: '诗意栖居，文采飞扬。', effectDescription: '语文++, 心态+, 历史+',
        action: (s) => ({ subjects: modifySub(s, ['chinese', 'history'], 2), general: { ...s.general, mindset: s.general.mindset + 2 } })
    },
    {
        id: 'social_science', name: '社会科学研学社', icon: 'fa-globe', description: '研究社会问题，关注人类命运。', effectDescription: '政治++, 历史++, 经验+',
        action: (s) => ({ subjects: modifySub(s, ['politics', 'history'], 2), general: { ...s.general, experience: s.general.experience + 2 } })
    },
    {
        id: 'mun', name: '模拟联合国', icon: 'fa-handshake', description: '西装革履，纵横捭阖。', effectDescription: '英语++, 政治+, 魅力+',
        action: (s) => ({ subjects: modifySub(s, ['english', 'politics'], 2), general: { ...s.general, romance: s.general.romance + 2 } })
    },
    {
        id: 'touhou', name: '东方Project社', icon: 'fa-torii-gate', description: '此生无悔入东方，来世愿生幻想乡。', effectDescription: '心态++, 运气+, 认识同好',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 4, luck: s.general.luck + 1 } })
    },
    {
        id: 'astronomy', name: '南斗天文社', icon: 'fa-star', description: '一起架起望远镜，在操场夜空寻找星座。', effectDescription: '物理++, 地理+, 心态+',
        action: (s) => ({ subjects: modifySub(s, ['physics', 'geography'], 2), general: { ...s.general, mindset: s.general.mindset + 2 } })
    },
    {
        id: 'math_research', name: '大数研究社', icon: 'fa-calculator', description: 'G(64)?', effectDescription: '数学+++, 逻辑+',
        action: (s) => ({ subjects: modifySub(s, ['math'], 4) })
    },
    {
        id: 'ttrpg', name: '跑团社', icon: 'fa-dice-d20', description: '虽然但是，我们真的约跑欸（？', effectDescription: '运气++, 心态++, 经验+',
        action: (s) => ({ general: { ...s.general, luck: s.general.luck + 3, mindset: s.general.mindset + 3, experience: s.general.experience + 1 } })
    },
    {
        id: 'literature', name: '文学社', icon: 'fa-feather-alt', description: '以文会友，激扬文字。', effectDescription: '语文++, 历史+, 心态+',
        action: (s) => ({ subjects: modifySub(s, ['chinese', 'history'], 2), general: { ...s.general, mindset: s.general.mindset + 2 } })
    },
    {
        id: 'otaku', name: '御宅社', icon: 'fa-gamepad', description: '和社员一起聊动画和游戏。', effectDescription: '心态+++、健康-',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health - 1 } })
    },
    {
        id: 'anime', name: '动漫社', icon: 'fa-tv', description: '一起补番，一起吐槽。', effectDescription: '心态++, 魅力+',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 4, romance: s.general.romance + 1 } })
    },
    {
        id: 'human_behavior', name: '人类行为研究社', icon: 'fa-user-secret', description: '拓宽人类行为的边界。', effectDescription: '心态+++, 健康++, 魅力-',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health + 3, romance: s.general.romance - 2 } })
    }
];

// --- Weekend Activities ---
export const WEEKEND_ACTIVITIES: WeekendActivity[] = [
    ...WEEKEND_INVITATIONS,

    {
        id: HOMEWORK_ACTIVITY_ID, name: '写作业', icon: 'fa-pen', type: 'STUDY',
        description: '写完一个时段的作业，复习这周上过的内容。',
        condition: state => getHomeworkSlotsNeeded(state) > 0,
        resultText: '你按作业清单写完了一部分。',
        action: state => ({
            subjects: modifySub(state, ['chinese', 'math', 'english', ...state.selectedSubjects], 0.7)
        })
    },
    {
        id: 'act_music', name: '听音乐放松', icon: 'fa-headphones', type: 'REST',
        description: '花 2 元听歌，恢复心态。',
        resultText: '你放完了一张专辑。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health + 2, money: s.general.money - 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 8) } })
    },
    {
        id: 'act_movie', name: '看电影', icon: 'fa-film', type: 'REST',
        description: '去电影院或者在家看一部好电影。',
        resultText: '你留到片尾字幕播完才走。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 8, experience: s.general.experience + 5, money: s.general.money - 10, excitement: Math.min(100, (s.general.excitement ?? 0) + 12) } })
    },
    {
        id: 'act_sport', name: '体育锻炼', icon: 'fa-running', type: 'REST',
        description: '去操场跑步或者打球。',
        resultText: '你绕操场跑了几圈，在看台边喝了口水。',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 10, mindset: s.general.mindset + 3, efficiency: s.general.efficiency + 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 10) } })
    },

    {
        id: 'w_project_work', name: '整理课题记录', icon: 'fa-tasks', type: 'PROJECT',
        condition: (s) => s.activeProjects.length > 0,
        description: '整理排在首位的课题，加一格进度。',
        resultText: (s) => {
             const project = s.activeProjects[0];
             const progress = Math.min(project.progress + PROJECT_WORK_PROGRESS, project.requiredProgress);
             return `《${project.title}》进度 ${progress}/${project.requiredProgress}`;
        },
        action: (s) => {
             if (s.activeProjects.length === 0) return {};
             const projects = [...s.activeProjects];
             const proj = { ...projects[0] };
             proj.progress = Math.min(proj.progress + PROJECT_WORK_PROGRESS, proj.requiredProgress);

             let updates: Partial<GameState> = { activeProjects: [proj, ...projects.slice(1)] };

             if (proj.progress >= proj.requiredProgress) {
                 // Complete
                 updates.completedProjects = [...s.completedProjects, proj.id];
                 updates.activeProjects = projects.slice(1);
                 if (proj.onComplete) {
                     const completionEffects = proj.onComplete(s);
                     updates = { ...updates, ...completionEffects };
                     if (completionEffects.general) updates.general = { ...s.general, ...completionEffects.general };
                     if (completionEffects.subjects) updates.subjects = { ...s.subjects, ...completionEffects.subjects };
                 }
                 // Inject a log message
                 updates.log = [...s.log, { message: `课题《${proj.title}》已完成。`, type: 'success', timestamp: Date.now() }];
             }
             return updates;
        }
    },
    {
        id: 'w_club_activity', name: '社团活动', icon: 'fa-users', type: 'SOCIAL',
        condition: (s) => (s.phase === Phase.SEMESTER_1 || s.phase === Phase.SEMESTER_2)
            && CLUBS.some(club => club.id === s.club) && s.week % 4 === 0,
        description: '参加社团组织的月度活动。',
        resultText: state => {
             if (state.club === 'astronomy') return '你和社员轮流调焦、找星，最后在记录纸上认出了今晚最亮的几颗星。';
             if (state.club === 'math_research') return '一张草稿纸沿桌传了一圈，大家把最短的证明和没讲明白的反例都留了下来。';
             if (state.club === 'anime') return '投影打开前你帮着对了字幕，放完后几个人还留在教室聊另外两个版本。';
             const club = CLUBS.find(candidate => candidate.id === state.club);
             return club ? `你参加了${club.name}的月度活动。` : '你参加了月度活动。';
        },
        action: (s) => {
             const club = CLUBS.find(c => c.id === s.club);
             return club ? { ...club.action(s), flags: { ...s.flags, attended_club_activity: true } } : {};
        }
    },
    {
        id: 'w_shop', name: '约朋友逛街', icon: 'fa-shopping-bag', type: 'SOCIAL',
        description: '消费30元，大幅提升心情和魅力。',
        resultText: '你和朋友在西单逛了一下午，虽然钱包瘪了，但心情好多了。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 3, money: s.general.money - 30 } })
    },
    {
        id: 'w_library', name: '上图书馆', icon: 'fa-book', type: 'STUDY',
        description: '复习语数外，提高效率。',
        resultText: '你在阅览室写完了一套练习。',
        action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 1 }, subjects: modifySub(s, ['chinese', 'english', 'math'], 0.5) })
    },
    {
        id: 'w_read', name: '看课外书', icon: 'fa-book-open', type: 'REST',
        description: '读闲书，恢复心态。',
        resultText: '你看完两章，把书签夹进下一页。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, experience: s.general.experience + 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 4) } })
    },
    {
        id: 'w_review', name: '复习功课', icon: 'fa-pencil-alt', type: 'STUDY',
        description: '针对选科进行复习，但会消耗心态。',
        resultText: '你把上周的错题重做了一遍。',
        action: (s) => ({ subjects: modifySub(s, s.selectedSubjects.length > 0 ? s.selectedSubjects : ['math', 'physics'], 0.5), general: { ...s.general, mindset: s.general.mindset - 2 } })
    },
    {
        id: 'w_sleep', name: '补觉', icon: 'fa-bed', type: 'REST',
        description: '恢复健康，降低疲劳和兴奋。',
        resultText: '你关了闹钟，睡到自然醒。',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 8, mindset: s.general.mindset + 2, excitement: Math.max(0, (s.general.excitement ?? 0) - 18) }, sleepCount: (s.sleepCount || 0) + 1 })
    },
    {
        id: 'w_game_late', name: '熬夜打游戏', icon: 'fa-moon', type: 'REST',
        description: '恢复心态，降低健康和效率。',
        resultText: '你打到凌晨才关电脑，起床时头有点疼。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 8, health: s.general.health - 5, efficiency: s.general.efficiency - 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 25) } })
    },
    {
        id: 'w_game', name: '打游戏', icon: 'fa-gamepad', type: 'REST',
        description: '恢复心态，略降效率。',
        resultText: '你打了几局，收好手柄去吃饭。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency - 1, excitement: Math.min(100, (s.general.excitement ?? 0) + 15) } })
    },
    {
        id: 'w_video', name: '刷视频', icon: 'fa-play-circle', type: 'REST',
        description: '略微恢复心态，降低效率。',
        resultText: '刷视频停不下来，回过神来已经过去两个小时了。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, efficiency: s.general.efficiency - 3, excitement: Math.min(100, (s.general.excitement ?? 0) + 10) } })
    },
    {
        id: 'w_chat', name: '和朋友聊天', icon: 'fa-comments', type: 'SOCIAL',
        description: '提升心态和魅力。',
        resultText: '和朋友聊了很多八卦，心情变好了。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 4, romance: s.general.romance + 2 } })
    },
    {
        id: 'w_zhihu', name: '刷知乎', icon: 'fa-question-circle', type: 'REST',
        description: '浏览回答，增加经验。',
        resultText: '你看完两篇回答，收藏了一篇。',
        action: (s) => ({ general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 1 } })
    },
    {
        id: 'w_park', name: '去公园/爬山', icon: 'fa-tree', type: 'REST',
        description: '出门走走，恢复健康和心态。',
        resultText: '你沿公园的小路走了一圈。',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset + 5 } })
    },
    {
        id: 'w_cook', name: '在家做顿饭', icon: 'fa-utensils', type: 'REST',
        description: '花 6 元买菜，给自己做顿饭。',
        condition: state => state.general.money >= 6,
        resultText: '你炒了一盘菜，把剩下的装进饭盒。',
        action: state => ({ general: { ...state.general, money: state.general.money - 6, mindset: state.general.mindset + 4, experience: state.general.experience + 2 } })
    },
    {
        id: 'w_cycle', name: '骑车出门', icon: 'fa-bicycle', type: 'REST',
        description: '骑车去附近转转，动一动。',
        resultText: '你骑到了平时放学会经过的河边，停了一会儿。',
        action: state => ({ general: { ...state.general, health: state.general.health + 4, mindset: state.general.mindset + 3 }, fatigue: state.fatigue + 2 })
    },
    {
        id: 'w_book_stall', name: '逛二手书摊', icon: 'fa-book-open', type: 'REST',
        description: '翻几本平时碰不到的书。',
        resultText: '你翻到一本旧地图册，记下了几个熟悉的地名。',
        action: state => ({ general: { ...state.general, experience: state.general.experience + 3, mindset: state.general.mindset + 2 } })
    },
    {
        id: 'w_photo_walk', name: '和同学出去拍照', icon: 'fa-camera', type: 'SOCIAL',
        description: '带手机出去走走，看看能拍到什么。',
        resultText: '你们在快关门的文具店外拍了张照片，回去后从中挑了一张发到群里。',
        action: state => ({ general: { ...state.general, mindset: state.general.mindset + 4, romance: state.general.romance + 2, experience: state.general.experience + 1 } })
    },
    // Romance Exclusive (Visible only when has partner)
    {
        id: 'w_date_call', name: '打电话', icon: 'fa-phone-alt', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '和对方聊聊这周的事。',
        resultText: '你和TA通了半小时电话，聊起班上刚换的座位。',
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 4, mindset: s.general.mindset + 5 } })
    },
    {
        id: 'w_date_game', name: '一起打游戏', icon: 'fa-gamepad', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '和对方打几局游戏。',
        resultText: '你和TA组队打了三局，约好下次换张地图。',
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 3, experience: s.general.experience + 3 } })
    },
    {
        id: 'w_date_flex', name: '发朋友圈', icon: 'fa-camera', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '发一张合照。',
        resultText: '你发了一张合照。有人留言问照片在哪儿拍的。',
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 6, luck: s.general.luck - 1 } })
    },
    // OI Exclusive
    {
        id: 'w_luogu', name: '刷洛谷', icon: 'fa-code', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '提升OI基础能力。',
        resultText: '你做了几道基础题，最后一题改了两次。',
        action: (s) => ({ oiStats: modifyOI(s, { dp: 0.2, ds: 0.2, misc: 0.2 }), general: { ...s.general, experience: s.general.experience + 1 } })
    },
    {
        id: 'w_cf', name: '虚拟赛VP', icon: 'fa-laptop-code', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '打虚拟赛练手，不影响Rating。',
        resultText: '虚拟赛结束后，你看了两道没做出来的题。',
        action: (s) => ({ oiStats: modifyOI(s, { math: 0.3, misc: 0.3, dp: 0.2 }), general: { ...s.general, mindset: s.general.mindset - 2 } })
    },
    {
        id: 'w_atc', name: '打 AtCoder', icon: 'fa-keyboard', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '提升数学和思维能力。',
        resultText: '你打了一场 AtCoder，赛后把卡住的题重新推了一遍。',
        action: (s) => ({ oiStats: modifyOI(s, { math: 0.8, misc: 0.2 }), general: { ...s.general, mindset: s.general.mindset - 2 } })
    },
    {
        id: 'w_oi_wiki', name: '看 OI-Wiki', icon: 'fa-book-atlas', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '全面补习OI基础知识。',
        resultText: '你学习了几个新的算法模板，但还需要练习。',
        action: (s) => ({ oiStats: modifyOI(s, { string: 0.2, graph: 0.2, math: 0.2, dp: 0.2, ds: 0.2 }), general: { ...s.general, experience: s.general.experience + 1 } })
    },
    {
        id: 'w_water_oi', name: '水OI群', icon: 'fa-water', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '恢复心态，了解OI圈八卦。',
        resultText: '你在群里看大家聊刚结束的比赛。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, experience: s.general.experience + 1 } })
    },
    // MO Exclusive
    {
        id: 'w_mo_training', name: '数竞一试限时练习', icon: 'fa-stopwatch', type: 'STUDY',
        condition: s => s.competition === 'MO',
        description: '限时做函数、数列和不等式题，交卷前验算填空。',
        resultText: '你给填空题留了验算时间，订正了一道数列题。',
        action: s => ({
            flags: trainMo(s, { speed: 2.3, algebra: 0.7 }, getLearningMultiplier(s)),
            subjects: modifySub(s, ['math'], 0.5),
            general: { ...s.general, experience: s.general.experience + 2, mindset: s.general.mindset - 2 }
        })
    },
    {
        id: 'w_mo_proof', name: '数竞二试专题练习', icon: 'fa-square-root-alt', type: 'STUDY',
        condition: s => s.competition === 'MO',
        description: '每周轮换平面几何、代数、数论和组合，写出完整证明再看讲义。',
        resultText: s => MO_PROOF_FEEDBACK[getMoPracticeTopic(s)],
        action: s => ({
            flags: trainMo(s, { [getMoPracticeTopic(s)]: 3.6 }, getLearningMultiplier(s)),
            general: { ...s.general, experience: s.general.experience + 2, mindset: s.general.mindset - 2 }
        })
    }
];

// Inject Codeforces activity
// CF only available on weekends (isWeekend is always true in weekend activities context)
WEEKEND_ACTIVITIES.push({
    id: 'act_cf', name: '打Codeforces (周末赛)', icon: 'fa-code', type: 'OI',
    condition: (s) => s.competition === 'OI' && s.isWeekend,
    description: '周六晚上22:35准时开打Div.2。熬夜打CF，周日上午注定要睡过去了。',
    resultText: (s) => '你熬夜打了一场CF，收获颇丰！（由于熬夜，周日上午都在补觉。详情见历史记录）',
    previewAction: (s) => ({
        general: { ...s.general, health: s.general.health - 8, mindset: s.general.mindset - 3 },
        oiStats: s.oiStats ? {
            ...s.oiStats,
            dp: s.oiStats.dp + 1,
            graph: s.oiStats.graph + 1
        } : s.oiStats
    }),
    action: (s) => {
        const baseRating = s.oiStats?.rating ?? 1200;
        const totalAptitude = s.oiStats ? (s.oiStats.dp + s.oiStats.ds + s.oiStats.math + s.oiStats.string + s.oiStats.graph + s.oiStats.misc) : 0;

        // Rating formula: slower growth, higher variance
        // totalAptitude ranges 0-600, maps to perf 1200-2100 (was 1200-2700)
        const expectedPerf = 1200 + (totalAptitude * 1.5);
        const perf = Math.floor(expectedPerf + (Math.random() * 500 - 250));

        // Slower rating change (divisor 6 instead of 4)
        const ratingChange = Math.floor((perf - baseRating) / 6);
        const newRating = Math.max(0, baseRating + ratingChange);

        const historyRecord = {
            name: 'Codeforces Round #' + (s.week + 800),
            date: s.week,
            perf: perf,
            ratingChange: ratingChange,
            newRating: newRating
        };

        let rankStr = "掉分了...";
        if (ratingChange > 50) rankStr = "大上分！";
        else if (ratingChange > 0) rankStr = "小上分。";

        return {
            general: { ...s.general, health: s.general.health - 8, mindset: s.general.mindset - 3 },
            oiStats: s.oiStats ? {
                ...s.oiStats,
                dp: s.oiStats.dp + 1, graph: s.oiStats.graph + 1,
                rating: newRating,
                history: [...(s.oiStats.history || []), historyRecord].slice(-100)
            } : s.oiStats,
            log: [...s.log, { message: `打了一场Codeforces，Perf: ${perf}，Rating: ${baseRating} -> ${newRating} (${ratingChange > 0 ? '+' : ''}${ratingChange})。${rankStr}`, type: ratingChange > 0 ? 'success' : 'warning', timestamp: Date.now() }]
        };
    }
});
