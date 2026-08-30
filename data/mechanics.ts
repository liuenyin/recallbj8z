
import { Talent, Item, Achievement, GameStatus, Club, WeekendActivity, GameState } from '../types';
import { modifySub, modifyOI } from './utils';

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
    { id: 'rich_kid', name: '家里有矿', description: '初始金钱+100。', rarity: 'legendary', cost: 4,
      effect: (s) => ({ general: { ...s.general, money: s.general.money + 100 } })
    },
    // --- Rare (Cost 2-3) ---
    { id: 'attractive', name: '万人迷', description: '初始魅力+20，恋爱事件概率UP。', rarity: 'rare', cost: 2,
      effect: (s) => ({ general: { ...s.general, romance: s.general.romance + 20 } })
    },
    { id: 'oi_nerd', name: '机房幽灵', description: 'OI各项能力初始+10，但魅力-10。', rarity: 'rare', cost: 3,
      effect: (s) => ({ 
          oiStats: modifyOI(s, { dp: 10, ds: 10, math: 10, string: 10, graph: 10, misc: 10 }),
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
    { id: 'poverty', name: '家徒四壁', description: '初始金钱归零，且背负100元债务。', rarity: 'cursed', cost: -2,
      effect: (s) => ({ general: { ...s.general, money: s.general.money - 120 } }) // Assuming base is ~20, this sets to -100 relative
    },
    { id: 'frail', name: '体弱多病', description: '初始健康降低，稍不注意就会生病。', rarity: 'cursed', cost: -2,
      effect: (s) => ({ general: { ...s.general, health: 20 } })
    },
    { id: 'loner', name: '孤僻', description: '初始魅力归零，很难建立人际关系。', rarity: 'cursed', cost: -1,
      effect: (s) => ({ general: { ...s.general, romance: 0 } })
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
    { id: 'red_bull', name: '兴奋剂', description: '短时间兴奋：效率+2、兴奋+25，但疲劳+8、健康-1。售价150。', price: 150, icon: 'fa-bolt',
      effect: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 2, health: s.general.health - 1, money: s.general.money - 150, excitement: Math.min(100, (s.general.excitement ?? 0) + 25) }, fatigue: Math.min(100, s.fatigue + 8) }) },
    { id: 'coffee', name: '瑞幸生椰拿铁', description: '我咖啡怎么变了？心态+3，效率+1。', price: 20, icon: 'fa-coffee',
      effect: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, efficiency: s.general.efficiency + 1, money: s.general.money - 20 } }) },
    { id: 'five_three', name: '五年高考三年模拟', description: '全科水平+0.5，心态-8。', price: 45, icon: 'fa-book',
      effect: (s) => ({ 
          subjects: modifySub(s, ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology'], 0.5), 
          general: { ...s.general, mindset: s.general.mindset - 8, money: s.general.money - 45 } 
      }) },
    { id: 'game_skin', name: '不要问为啥没有648，问就是放这里你买不了', description: '虽然不能变强，但心情变好了。心态+8。', price: 68, icon: 'fa-gamepad',
      effect: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 8, money: s.general.money - 68 } }) },
    { id: 'flowers', name: '鲜花', description: '送给心仪的人。魅力+8，若有对象则大幅提升关系。', price: 50, icon: 'fa-fan',
      effect: (s) => ({ general: { ...s.general, romance: s.general.romance + 8, money: s.general.money - 50, mindset: s.general.mindset + (s.romancePartner ? 5 : 0) } }) },
    { id: 'algo_book', name: '算法导论', description: '厚得可以当枕头。OI能力全面+2。', price: 80, icon: 'fa-code',
      effect: (s) => ({ oiStats: modifyOI(s, { dp: 2, ds: 2, math: 2, graph: 2, string: 2, misc: 2 }), general: { ...s.general, money: s.general.money - 80 } }) },
    { id: 'luogu_book', name: '深入浅出程序设计竞赛', description: 'kkk亲签？', price: 56, icon: 'fa-code',
      effect: (s) => ({ oiStats: modifyOI(s, { dp: 1, ds: 2, math: 2, graph: 1, string: 1, misc: 1 }), general: { ...s.general, money: s.general.money - 56 } }) },
    { id: 'gym_card', name: '健身卡', description: '强身健体。健康+15。', price: 100, icon: 'fa-dumbbell',
      effect: (s) => ({ general: { ...s.general, health: s.general.health + 15, money: s.general.money - 100 } }) }
];

// --- Achievements ---
export const ACHIEVEMENTS: Record<string, Achievement> = {
    'first_blood': { id: 'first_blood', title: '初入八中', description: '成功开始你的高中生活。', icon: 'fa-school', rarity: 'common' },
    'nerd': { id: 'nerd', title: '卷王', description: '单科成绩达到满分。', icon: 'fa-book-reader', rarity: 'rare' },
    'romance_master': { id: 'romance_master', title: '海王', description: '虽然学校不允许……', icon: 'fa-heart', rarity: 'legendary' },
    'oi_god': { id: 'oi_god', title: '???', description: '获得五大竞赛省一。', icon: 'fa-code', rarity: 'legendary' },
    'survival': { id: 'survival', title: '极限生存', description: '在健康低于10的情况下完成一个学期。', icon: 'fa-notes-medical', rarity: 'rare' },
    'rich': { id: 'rich', title: '小金库', description: '持有金钱超过200。', icon: 'fa-coins', rarity: 'common' },
    'in_debt': { id: 'in_debt', title: '负债累累', description: '负债超过250。', icon: 'fa-file-invoice-dollar', rarity: 'common' },
    'top_rank': { id: 'top_rank', title: '一览众山小', description: '年级第一！（真的能实现！LA群里有人成功了！）', icon: 'fa-crown', rarity: 'legendary' },
    'bottom_rank': { id: 'bottom_rank', title: '旷世奇才', description: '倒数第一，也是神人。', icon: 'fa-poop', rarity: 'rare' },
    'sleep_god': { id: 'sleep_god', title: '睡神', description: '天天睡觉还考这么高，羡慕了。', icon: 'fa-bed', rarity: 'legendary' },
    'nice_person': { id: 'nice_person', title: '大好人', description: '对不起，但你人真的挺好（单局内收到5次好人卡）。', icon: 'fa-heart-broken', rarity: 'rare' },
    'sports_star': { id: 'sports_star', title: '运动健将', description: '健康值达到100。', icon: 'fa-running', rarity: 'common' },
    'emotional_damage': { id: 'emotional_damage', title: '情绪崩溃', description: '心态降至0，你急需心理辅导。', icon: 'fa-sad-tear', rarity: 'common' },
    'popular': { id: 'popular', title: '万人迷', description: '魅力达到80以上，走到哪里都是焦点。', icon: 'fa-star', rarity: 'rare' },
};

// --- Statuses ---
export const STATUSES: Record<string, Omit<GameStatus, 'duration'>> = {
    'focused': { id: 'focused', name: '心流', description: '你进入了极度专注的状态。', type: 'BUFF', icon: 'fa-bolt', effectDescription: '全学科效率大幅提升' },
    'anxious': { id: 'anxious', name: '焦虑', description: '对未来的担忧让你无法平静。', type: 'DEBUFF', icon: 'fa-cloud-rain', effectDescription: '每回合心态 -2' },
    'crush': { id: 'crush', name: '暗恋', description: '那个人的身影总是在脑海挥之不去。', type: 'NEUTRAL', icon: 'fa-heart', effectDescription: '效率 -2，魅力 +2' },
    'in_love': { id: 'in_love', name: '恋爱', description: '甜，太甜了。', type: 'BUFF', icon: 'fa-heartbeat', effectDescription: '每周心态 +5' },
    'heartbroken': { id: 'heartbroken', name: '失恋', description: '心如刀绞，这就是青春的代价吗？', type: 'DEBUFF', icon: 'fa-heart-broken', effectDescription: '每周心态 -3, 效率 -1' },
    'exhausted': { id: 'exhausted', name: '透支', description: '你需要休息。', type: 'DEBUFF', icon: 'fa-bed', effectDescription: '健康无法自然恢复' },
    'crush_pending': { id: 'crush_pending', name: '恋人未满', description: '虽然还没捅破窗户纸，但这种暧昧的感觉真好。', type: 'BUFF', icon: 'fa-comments', effectDescription: '每周运气 +2，经验 +2' },
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
        id: 'volleyball', name: '排球社', icon: 'fa-volleyball-ball', description: '我实在编不出来词了', effectDescription: '健康++, 魅力+, 心态+',
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
        id: 'astronomy', name: '南斗天文社', icon: 'fa-star', description: 'whd:欢迎加入【数据删除】！', effectDescription: '物理++, 地理+, 心态+',
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
        id: 'otaku', name: '御宅社', icon: 'fa-gamepad', description: '二次元的避风港。', effectDescription: '心态+++, 宅属性+',
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

    {
        id: 'act_music', name: '听音乐放松', icon: 'fa-headphones', type: 'REST',
        description: '沉浸在音乐的世界里，放松心情。',
        resultText: '听了一下午的歌，感觉心情平静了许多。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, health: s.general.health + 2, money: s.general.money - 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 8) } })
    },
    {
        id: 'act_movie', name: '看电影', icon: 'fa-film', type: 'REST',
        description: '去电影院或者在家看一部好电影。',
        resultText: '一部好电影能让人体验不同的人生。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 8, experience: s.general.experience + 5, money: s.general.money - 10, excitement: Math.min(100, (s.general.excitement ?? 0) + 12) } })
    },
    {
        id: 'act_sport', name: '体育锻炼', icon: 'fa-running', type: 'REST',
        description: '去操场跑步或者打球。',
        resultText: '大汗淋漓之后，感觉身体更加充满活力了。',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 10, mindset: s.general.mindset + 3, efficiency: s.general.efficiency + 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 10) } })
    },
    {
        id: 'act_library', name: '泡图书馆', icon: 'fa-book-reader', type: 'STUDY',
        description: '在安静的图书馆里看书自习。',
        resultText: '在知识的海洋中遨游，感觉自己变聪明了。',
        action: (s) => ({ general: { ...s.general, experience: s.general.experience + 10, efficiency: s.general.efficiency + 3, mindset: s.general.mindset - 2 } })
    },

    {
        id: 'w_project_work', name: '推进主攻课题', icon: 'fa-tasks', type: 'PROJECT',
        condition: (s) => s.activeProjects.length > 0,
        description: '在手账中规划的课题上投入精力。',
        resultText: (s) => {
             return '你花时间推进了手账上的首要课题，进度增加了。';
        },
        action: (s) => {
             if (s.activeProjects.length === 0) return {};
             // Progress the first project in the list for now
             const projects = [...s.activeProjects];
             const proj = { ...projects[0] };
             proj.progress += 25; // Base progress per weekend action
             
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
                 updates.log = [...s.log, { message: `【课题完成】${proj.title}！获得了奖励：${proj.rewardsDescription}`, type: 'success', timestamp: Date.now() }];
             }
             return updates;
        }
    },
    {
        id: 'w_club_activity', name: '社团活动', icon: 'fa-users', type: 'SOCIAL',
        condition: (s) => !!s.club && s.week % 4 === 0,
        description: '参加社团组织的月度活动。',
        resultText: '你参加了社团活动，大家玩得很开心。(根据社团不同提升属性)',
        action: (s) => {
             const club = CLUBS.find(c => c.id === s.club);
             return club ? club.action(s) : {};
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
        description: '提升学习效率，巩固语数外基础。',
        resultText: '图书馆的氛围很好，你感觉学习效率提升了(效率+1)。',
        action: (s) => ({ general: { ...s.general, efficiency: s.general.efficiency + 1 }, subjects: modifySub(s, ['chinese', 'english', 'math'], 0.5) })
    },
    {
        id: 'w_read', name: '看课外书', icon: 'fa-book-open', type: 'REST',
        description: '阅读是心灵的避风港。提升心态和经验。',
        resultText: '你沉浸在书中的世界，暂时忘却了烦恼。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, experience: s.general.experience + 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 4) } })
    },
    {
        id: 'w_review', name: '复习功课', icon: 'fa-pencil-alt', type: 'STUDY',
        description: '针对选科进行复习，但会消耗心态。',
        resultText: '你复习了一下午功课，感觉掌握得更扎实了，就是有点累。',
        action: (s) => ({ subjects: modifySub(s, s.selectedSubjects.length > 0 ? s.selectedSubjects : ['math', 'physics'], 0.5), general: { ...s.general, mindset: s.general.mindset - 2 } })
    },
    {
        id: 'w_sleep', name: '补觉', icon: 'fa-bed', type: 'REST',
        description: 'S属性大爆发，Sleep!',
        resultText: '这一觉睡得天昏地暗，醒来时已经是黄昏了。',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 8, mindset: s.general.mindset + 2, excitement: Math.max(0, (s.general.excitement ?? 0) - 18) }, sleepCount: (s.sleepCount || 0) + 1 })
    },
    {
        id: 'w_game_late', name: '熬夜打游戏', icon: 'fa-moon', type: 'REST',
        description: '爽爽爽！',
        resultText: '赢了一晚上，爽！但是第二天早上头痛欲裂。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 8, health: s.general.health - 5, efficiency: s.general.efficiency - 2, excitement: Math.min(100, (s.general.excitement ?? 0) + 25) } })
    },
    {
        id: 'w_game', name: '打游戏', icon: 'fa-gamepad', type: 'REST',
        description: '适度游戏益脑。提升心态，微降效率。',
        resultText: '玩了几把游戏，放松了一下紧绷的神经。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 5, efficiency: s.general.efficiency - 1, excitement: Math.min(100, (s.general.excitement ?? 0) + 15) } })
    },
    {
        id: 'w_video', name: '刷视频', icon: 'fa-play-circle', type: 'REST',
        description: '杀时间利器。提升少量心态，大幅降低效率。',
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
        description: '谢邀，人在美国，刚下飞机。提升经验。',
        resultText: '你在知乎上学到了很多奇怪的知识。',
        action: (s) => ({ general: { ...s.general, experience: s.general.experience + 3, mindset: s.general.mindset + 1 } })
    },
    {
        id: 'w_park', name: '去公园/爬山', icon: 'fa-tree', type: 'REST',
        description: '拥抱大自然。平衡提升健康和心态。',
        resultText: '呼吸着新鲜空气，你感觉身心舒畅。',
        action: (s) => ({ general: { ...s.general, health: s.general.health + 5, mindset: s.general.mindset + 5 } })
    },
    // Romance Exclusive (Visible only when has partner)
    {
        id: 'w_date_call', name: '煲电话粥', icon: 'fa-phone-alt', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '听听TA的声音。提升魅力和心态。',
        resultText: (s) => `你和${s.romancePartner}聊了很久，感觉彼此的心更近了。`,
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 4, mindset: s.general.mindset + 5 } })
    },
    {
        id: 'w_date_game', name: '一起打游戏', icon: 'fa-gamepad', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '带TA上分（或者掉分）。提升魅力和经验。',
        resultText: (s) => `虽然配合有些失误，但你和${s.romancePartner}玩得很开心。`,
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 3, experience: s.general.experience + 3 } })
    },
    {
        id: 'w_date_flex', name: '发朋友圈', icon: 'fa-camera', type: 'LOVE',
        condition: (s) => !!s.romancePartner,
        description: '秀恩爱。大幅提升魅力，可能招来嫉妒。',
        resultText: '你的朋友圈收获了大量的点赞和柠檬。',
        action: (s) => ({ general: { ...s.general, romance: s.general.romance + 6, luck: s.general.luck - 1 } })
    },
    // OI Exclusive
    {
        id: 'w_luogu', name: '刷洛谷', icon: 'fa-code', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '提升OI基础能力。',
        resultText: '刷了几道水题，感觉还可以。',
        action: (s) => ({ oiStats: modifyOI(s, { dp: 0.2, ds: 0.2, misc: 0.2 }), general: { ...s.general, experience: s.general.experience + 1 } })
    },
    {
        id: 'w_cf', name: '虚拟赛VP', icon: 'fa-laptop-code', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '打虚拟赛练手，不影响Rating。',
        resultText: '打了一场VP，总结了不少经验。',
        action: (s) => ({ oiStats: modifyOI(s, { math: 0.3, misc: 0.3, dp: 0.2 }), general: { ...s.general, mindset: s.general.mindset - 2 } })
    },
    {
        id: 'w_atc', name: '打 AtCoder', icon: 'fa-keyboard', type: 'OI',
        condition: (s) => s.competition === 'OI',
        description: '提升数学和思维能力。',
        resultText: '小清新ARC。',
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
        resultText: '群友个个都是人才，说话又好听。',
        action: (s) => ({ general: { ...s.general, mindset: s.general.mindset + 3, experience: s.general.experience + 1 } })
    },
    // MO Exclusive
    {
        id: 'w_mo_training', name: '数学竞赛训练', icon: 'fa-square-root-alt', type: 'STUDY',
        condition: (s) => s.competition === 'MO',
        description: '用一个周末把一道题从猜想推到完整证明。',
        resultText: '你把训练题拆成几个小引理，终于看见了完整证明的形状。',
        action: (s) => ({
            subjects: modifySub(s, ['math'], 0.7),
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
    action: (s) => {
        const baseRating = s.oiStats?.rating || 1200;
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
                history: [...(s.oiStats.history || []), historyRecord]
            } : s.oiStats,
            log: [...s.log, { message: `打了一场Codeforces，Perf: ${perf}，Rating: ${baseRating} -> ${newRating} (${ratingChange > 0 ? '+' : ''}${ratingChange})。${rankStr}`, type: ratingChange > 0 ? 'success' : 'warning', timestamp: Date.now() }]
        };
    }
});
