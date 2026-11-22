import { GameState, Phase, SubjectKey } from '../types';
import { CLUBS } from './mechanics';
import { isHealthFatal } from './utils';
import { getAcademicExamPhase } from './game_flow';
import { restoreRelationshipName, RIVAL_NICKNAME, FESTIVAL_PARTNER_NICKNAME } from './campus_names';

export interface EndingCatalogEntry {
    title: string;
    rank: string;
    category: 'OI' | 'MO' | '学业' | '校园' | '生活' | '挑战' | '警示';
    hint: string;
}

export const ENDING_CATALOG: EndingCatalogEntry[] = [
    { title: 'NOI 金牌选手（国集相关机会）', rank: 'SSS', category: 'OI', hint: '进入 OI 省队后，在 NOI 全国赛拿下 600 分以上。' },
    { title: '强基破格入围者', rank: 'SS', category: 'OI', hint: '进入 OI 省队并在 NOI 全国赛取得银牌线成绩（450–599）。' },
    { title: '省队巨佬', rank: 'S', category: 'OI', hint: '通过联合省选进入省队，或在 NOI 拿到铜牌及以上名次。' },
    { title: 'NOI 参赛者', rank: 'A/B', category: 'OI', hint: '走完省队与 NOI 赛程（未进奖牌线且常规路径未达省队认证）。' },
    { title: 'OI 命题与竞赛实践者', rank: 'S/A/B', category: 'OI', hint: '加入 OI 出题组并完成公开赛出题与新生赛后续邀约。' },
    { title: 'OI 出题实践者', rank: 'A/B', category: 'OI', hint: '加入 OI 出题组并起草题面（公开赛或草稿均可）。' },
    { title: 'OI 探索者', rank: 'A/B/C', category: 'OI', hint: '坚持 OI 路线并积累一定算法训练量。' },
    { title: '数学竞赛获奖者', rank: 'S/A', category: 'MO', hint: '选择 MO 路线并保持高数学水平，在决赛日中获奖。' },
    { title: '数学命题实践者', rank: 'A/B', category: 'MO', hint: '参与校内数学竞赛命题组讨论与审稿。' },
    { title: '数学竞赛探索者', rank: 'A/B/C', category: 'MO', hint: '选择 MO 路线并完成数学竞赛决赛日。' },
    { title: '年级学神', rank: 'S', category: '学业', hint: '高一下期末进入年级前 5%，综合评分达到 90。' },
    { title: '尖子生', rank: 'A', category: '学业', hint: '高一下期末进入年级前 20%，综合评分达到 75。' },
    { title: '中流砥柱', rank: 'B', category: '学业', hint: '走完高一，综合评分达到 60。' },
    { title: '芸芸众生', rank: 'C', category: '学业', hint: '顺利走完高一学年，综合评分处于 40–59 区间。' },
    { title: '学业危机', rank: 'D', category: '学业', hint: '多门功课掉队，学年末综合评分不足 40。' },
    { title: '学业待补', rank: 'Z', category: '学业', hint: '学年综合评分低于 20。' },
    { title: '平衡生活者', rank: 'A/B/C', category: '生活', hint: '确立恋爱关系的同时保持健康 >= 60、疲劳 <= 60 与合格课内成绩。' },
    { title: '社团组织者', rank: 'A/B/C', category: '校园', hint: '为社团科技节展台负责讲解和排班，完成彩排并在当天带队。' },
    { title: '项目完成者', rank: 'A/B/C', category: '校园', hint: '接下并在截止周前完成至少一项长期课题。' },
    { title: '过劳警告', rank: 'F', category: '警示', hint: '学年末处于高疲劳（>=90）且低健康（<35）的临界状态。' },
    { title: '身体透支', rank: 'F', category: '警示', hint: '在学期中途健康值跌破底线。' },
    { title: '提前离校', rank: 'F', category: '警示', hint: '在学年结束前选择离校。' },
    { title: '睡神挑战失败', rank: 'F', category: '挑战', hint: '在【嗜睡生存挑战】中连续整周未安排任何睡眠。' }
];

const ENDING_COLLECTION_KEY = 'recall_ending_collection_v1';
const RENAMED_ENDINGS: Record<string, string> = { '家里蹲预备役': '学业待补', '退学离场': '提前离校' };

export const getUnlockedEndings = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(ENDING_COLLECTION_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const validTitles = new Set(ENDING_CATALOG.map(entry => entry.title));
        return Array.from(new Set(parsed
            .filter((item): item is string => typeof item === 'string')
            .map(title => Object.hasOwn(RENAMED_ENDINGS, title) ? RENAMED_ENDINGS[title] : title)
            .filter(title => validTitles.has(title))));
    } catch {
        return [];
    }
};

export const recordUnlockedEnding = (title: string): string[] => {
    const existing = getUnlockedEndings();
    if (!ENDING_CATALOG.some(entry => entry.title === title) || existing.includes(title)) return existing;
    const next = [...existing, title];
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(ENDING_COLLECTION_KEY, JSON.stringify(next));
        } catch {
            // Keep UI functional even when storage quota is unavailable.
        }
    }
    return next;
};

export const getNextRunSuggestion = (state: GameState, unlockedTitles: string[]): string => {
    const unlocked = new Set(unlockedTitles);
    if (state.flags.campus_project_report === 'draft') {
        return '下局可以早点在周计划里安排「整理课题记录」，在第 12 周交表。';
    }
    if (state.competition !== 'OI' && !unlocked.has('省队巨佬')) {
        return '下局可以选信息竞赛，参加 CSP-S 和后续训练。';
    }
    if (state.competition === 'OI' && !state.flags.provincial_team) {
        return '想参加省选的话，下局可以在周末多安排几场竞赛练习。';
    }
    if (state.competition !== 'MO' && !unlocked.has('数学竞赛获奖者')) {
        return '下局可以选数学竞赛，进命题组和同学互审题目。';
    }
    if (!state.romancePartner && !unlocked.has('平衡生活者')) {
        return '下局可以多和同桌聊几次，看看对方会不会约你放学后见面。';
    }
    if (state.difficulty === 'NORMAL') {
        return '想试试每周活动随机的玩法，可以在首页选「现实」难度。';
    }
    if (!state.activeChallengeId) {
        return '首页可以选负债或嗜睡挑战。';
    }
    return `你已解锁 ${unlocked.size} / ${ENDING_CATALOG.length} 个结局。`;
};

export const getEndingData = (state: GameState) => {
     if (state.flags.sleep_challenge_failed === true) {
          return { rank: 'F', title: '睡神挑战失败', comment: '你这周没有完成一次补觉。', score: 0 };
      }
     if (state.phase === Phase.WITHDRAWAL) {
          return { rank: 'F', title: '提前离校', comment: '你在学年结束前离开了学校。', score: 0 };
      }
      if (isHealthFatal(state, state.general.health)) {
          return { rank: 'F', title: '身体透支', comment: '你的健康降到了停课线，学年提前结束。', score: 0 };
      }

      // Calculate score from subject levels (main academic measure)
      const academicKeys: SubjectKey[] = state.selectedSubjects.length === 3
        ? ['chinese', 'math', 'english', ...state.selectedSubjects]
        : (Object.keys(state.subjects) as SubjectKey[]);
      const subjectAvg = academicKeys.reduce((sum, key) => sum + state.subjects[key].level, 0) / academicKeys.length;
      const projectCount = state.completedProjects.length;
      const latestAcademicExam = state.academicExamHistory?.at(-1);
      const finalExam = latestAcademicExam && getAcademicExamPhase(latestAcademicExam.title) === 'FINAL_EXAM_2'
        ? latestAcademicExam
        : undefined;
      const finalRankFraction = finalExam?.rank ? finalExam.rank / (finalExam.totalStudents || 633) : 1;
      const oiPower = Object.entries(state.oiStats)
        .filter(([key]) => key !== 'history' && key !== 'rating')
        .reduce((sum, [, value]) => sum + Number(value || 0), 0);
      // Academic performance remains the backbone, while completed experiences make
      // different routes matter in the final report.
      let score = subjectAvg * 1.5 + state.general.experience * 0.3 + state.general.efficiency * 0.4;
      if (state.competition === 'OI') score += Math.min(15, oiPower * 0.025);
      score += Math.min(8, projectCount * 3);
      if (state.club && state.club !== 'none') score += 3;
      if (state.flags.rival_resolved) score += 3;
      // Exam performance bonus
      if (latestAcademicExam) score += latestAcademicExam.totalScore / 20;
      // Clamp to 0-100 range
      score = Math.min(100, Math.max(0, score));

     const noiMedal = state.flags.noi_medal;
     const provincialTeam = state.flags.provincial_team;
     const moContestResult = state.flags.mo_contest_result;
     const moSetter = state.flags.mo_setter === true;
     const oiSetter = state.flags.oi_setter === true;
     const oiProblemDrafted = state.flags.oi_problem_drafted === true;
     const oiSetterFollowup = state.flags.oi_setter_followup;
     const overworked = state.general.health <= 0 || (state.fatigue >= 90 && state.general.health < 35);
     const balancedLife = !!state.romancePartner && state.general.health >= 60 && state.fatigue <= 60;
     const clubOrganizer = state.flags.science_festival_club_organizer === true;
     const projectFinisher = projectCount > 0;

     let rank = 'C';
     let title = '普通高中生';
     let comment = '你读完了高一。';

     if (noiMedal === 'GOLD') {
       rank = 'SSS';
       title = 'NOI 金牌选手（国集相关机会）';
       comment = '你在 NOI 获得了金牌。';
     } else if (noiMedal === 'SILVER') {
       rank = 'SS';
       title = '强基破格入围者';
       comment = '你在 NOI 获得了银牌。';
     } else if (noiMedal === 'BRONZE' || provincialTeam) {
       rank = 'S';
       title = '省队巨佬';
       comment = noiMedal === 'PARTICIPANT'
         ? '你代表省队参加了 NOI。回学校后，你和信息学教练一起看了提交记录。'
         : noiMedal === 'BRONZE' ? '你在 NOI 获得了铜牌。' : '你通过了省选，进入省队。';
     } else if (noiMedal === 'PARTICIPANT') {
       rank = score >= 75 ? 'A' : 'B';
       title = 'NOI 参赛者';
       comment = '你完成了省队集训和 NOI 正式比赛。比赛名次已经记入档案。';
     } else if (overworked) {
       rank = 'F';
       title = '过劳警告';
       comment = '学年结束时，你的疲劳仍然很高，健康偏低。';
     } else if (state.competition === 'OI' && oiSetterFollowup === 'accepted') {
       rank = score >= 85 ? 'S' : score >= 70 ? 'A' : 'B';
       title = 'OI 命题与竞赛实践者';
       comment = '你和高年级同学一起办了公开赛，负责写题面和对拍。';
     } else if (state.competition === 'OI' && oiSetter && oiProblemDrafted) {
       rank = score >= 75 ? 'A' : 'B';
       title = 'OI 出题实践者';
       comment = state.flags.oi_problem_published
         ? (state.flags.oi_problem_feedback === 'defended'
           ? '你写的题已经上线。赛后还有几条关于题面的留言没处理。'
           : '你把这道题放进了公开赛，赛后看了选手的提交。')
         : '你存下了题目草稿，写好了样例，还差几组边界数据。';
     } else if (state.competition === 'MO' && moContestResult === 'medal') {
       rank = score >= 85 ? 'S' : 'A';
       title = '数学竞赛获奖者';
       comment = moSetter
         ? '你在数学竞赛决赛获奖，也和命题组互审过证明。'
         : '你在数学竞赛决赛获奖。答卷上用到了训练时练过的放缩。';
     } else if (state.competition === 'MO' && moSetter) {
       rank = score >= 75 ? 'A' : 'B';
       title = '数学命题实践者';
       comment = state.flags.mo_review === 'polished'
         ? '你补全了命题草稿上的证明。审稿同学核对之后签了字。'
         : '你交了命题草稿。审稿同学用红笔圈出了证明里的几处空缺。';
     } else if (score >= 90 && finalRankFraction <= 0.05) {
       rank = 'S';
       title = '年级学神';
       comment = '你的高一下期末成绩进入年级前 5%。';
     } else if (balancedLife && score >= 40) {
       rank = score >= 75 ? 'A' : score >= 60 ? 'B' : 'C';
       title = '平衡生活者';
       comment = `你和${restoreRelationshipName(state.romancePartner, state.relationshipProfileId)}在学年结束时仍在交往。你的健康和疲劳状态也保持稳定。`;
     } else if (state.competition === 'OI' && oiPower >= 12 && !oiProblemDrafted && score >= 40) {
       rank = score >= 75 ? 'A' : score >= 60 ? 'B' : 'C';
       title = 'OI 探索者';
       comment = '你参加了线上赛，赛后也做了几次复盘。';
     } else if (state.competition === 'MO' && !!moContestResult && score >= 40) {
       rank = score >= 75 ? 'A' : score >= 60 ? 'B' : 'C';
       title = '数学竞赛探索者';
       comment = '你参加了数学竞赛训练，后来在决赛交了卷。';
     } else if (clubOrganizer && score >= 40) {
       rank = score >= 75 ? 'A' : score >= 60 ? 'B' : 'C';
       title = '社团组织者';
       comment = '科技节那天讲解员没赶回来，你按备用排班表找到了接班的同学。';
     } else if (projectFinisher && score >= 40) {
       rank = score >= 75 ? 'A' : score >= 60 ? 'B' : 'C';
       title = '项目完成者';
       comment = `你用周末的时间整理课题，在截止周前交了 ${projectCount} 份记录。`;
     } else if (score >= 75 && finalRankFraction <= 0.2) {
       rank = 'A';
       title = '尖子生';
       comment = '你的高一下期末成绩进入年级前 20%。';
     } else if (score >= 60) {
       rank = 'B';
       title = '中流砥柱';
       comment = '你完成了高一的课程和考试。';
     } else if (score >= 40) {
       rank = 'C';
       title = '芸芸众生';
       comment = '你完成了高一的课程。';
     } else if (score >= 20) {
       rank = 'D';
       title = '学业危机';
       comment = '成绩单上还有几门课需要补。';
     } else {
       rank = 'Z';
       title = '学业待补';
       comment = '本局的学年综合评分低于 20。';
     }

     return { rank, title, comment, score: Math.round(score) };
  };


/** Memories describe recorded choices, independently of the main ending title. */
export const getEndingMemories = (state: GameState): string[] => {
    const memories: string[] = [];
    const festivalMemories: Record<string, string> = {
        built: `科技节上，你翻出和彩排搭档${FESTIVAL_PARTNER_NICKNAME}写下的备用方案，把卡住的演示接着做完了。`,
        guided: `科技节上，你和${FESTIVAL_PARTNER_NICKNAME}用彩排时安排的备用班次接住了观众，换班前把展台顺利顶了下来。`,
        astronomy_notes: '科技节的演示卡住时，你把南斗天文社那张观测记录摊开，带展台前的同学认了一回星。',
        improvised: `科技节上出了点岔子。你和${FESTIVAL_PARTNER_NICKNAME}把演示分成两轮，还是把能做的部分带给了观众。`,
        visited: '你去地下场馆逛了科技节，展台同学把第一次失败的版本也拿给你看。'
    };
    const festivalMemory = festivalMemories[state.flags.science_festival_outcome];
    if (typeof festivalMemory === 'string') memories.push(festivalMemory);
    if (state.flags.campus_project_report === 'compare' || state.flags.campus_project_report === 'table') {
        memories.push(state.flags.campus_project_topic === 'lunch'
            ? '你在班会上展示了食堂等餐记录。下学期有同学照着表上的时间又记了一次。'
            : '你在班会上展示了图书馆的空座记录。下学期有同学拿了新表来核对。');
    }
    const club = CLUBS.find(club => club.id === state.club);
    if (club) memories.push(state.flags.attended_club_activity
        ? `高一上加入了${club.name}，也参加过社团的月度活动。`
        : `百团大战那天，你在${club.name}的报名表上写下了名字。`);
    if (state.flags.oi_problem_published) memories.push(state.flags.oi_problem_feedback === 'defended'
        ? '你出的公开赛题上线了，讨论区里几处关于题面边界的留言还没去改完。'
        : '你自己写的算法题真正登上了公开赛，看着别人一条条提交代码，感受挺奇妙的。');
    else if (state.flags.oi_problem_drafted) memories.push('电脑里存着一套算法题草稿，虽然还差几组对拍数据，但题面框架已经写出来了。');
    else if (state.flags.mo_contest_result === 'medal') memories.push('在数学竞赛决赛场交出了一张拿奖的答卷，之前在草稿本上划掉的思路都有了着落。');
    else if (state.flags.mo_setter) memories.push(state.flags.mo_review === 'polished'
        ? '在数学命题组把几处跳步证明补严密了，算真正替自己验过一道题。'
        : '参与了数学命题草稿，漂亮结论后面还留着审稿人标的几处推导问号。');
    const partnerName = restoreRelationshipName(state.romancePartner, state.relationshipProfileId);
    if (state.romancePartner) memories.push(state.flags.romance_communication
        ? `你和${partnerName}约好，忙的时候先发条消息。`
        : state.flags.romance_date_memory === 'walk' ? `你和${partnerName}有几个傍晚沿着护城河散步。` : `放学后，你和${partnerName}常在楼道里聊一会儿再走。`);
    else if (state.flags.romance_resolution === 'friends') memories.push('你们说开以后，课间还会借笔记、对答案。');
    else if (state.flags.romance_resolution === 'separated') memories.push('你们在楼梯口说了再见。第二天，你照常去教室上早读。');
    else if (state.flags.romance_moved_on) memories.push('你又走了去食堂的近路。排到窗口时，你多要了一个煎蛋。');
    else if (state.rejectionCount > 0) memories.push('你在放学后表了白，对方当面给了答复。');
    if (state.flags.debate_stage === 1) memories.push('和队友顶着复赛乌龙一路冲进校礼堂总决赛，捧回了辩论赛冠军。');
    else if (state.flags.basketball_stage === 1) memories.push('高一篮球联赛帮班级捧回了年级冠军奖杯，终场哨响时操场边欢呼声很大。');
    else if (state.flags.drama_performed || state.history.some(entry => entry.eventTitle === '英语戏剧节 正式演出！' && entry.choiceText === '倾情演绎')) {
        memories.push(state.flags.drama_role === 'prop'
            ? '英语戏剧节那天，你一直在幕边照清单递道具。最后一幕顺利接上时，你还攥着那张被揉皱的纸。'
            : '站上了期末英语戏剧节礼堂舞台，最后一幕走完，台下的掌声很响。');
    }
    if (state.completedProjects.length && !state.flags.campus_project_topic) memories.push(`你在截止周前交了 ${state.completedProjects.length} 份课题记录。`);
    if (state.flags.class_board_finished) memories.push('放学后留下来和同学一起补完的班级黑板报，在走廊里贴了整整一个月。');
    if (state.flags.rival_resolved) memories.push(`你和${RIVAL_NICKNAME}比过几次周测，期末前互相借了错题本。`);
    if (!memories.length && state.history.length) {
        const first = state.history[0];
        memories.push(`最初翻开高一第一页是在“${first.eventTitle}”，当时选了“${first.choiceText}”。`);
    }
    return memories.slice(0, 4);
};
