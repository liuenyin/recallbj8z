import { GameState, Phase, SubjectKey } from '../types';
import { isHealthFatal } from './utils';

export const getEndingData = (state: GameState) => {
     if (state.flags.sleep_challenge_failed === true) {
          return { rank: 'F', title: '睡神挑战失败', comment: '这周一觉没睡，阿卡西记录先把你踢下线了。下次记得在事件里睡觉，或者给周末留一格补觉。', score: 0 };
      }
     if (state.phase === Phase.WITHDRAWAL) {
          return { rank: "F", title: "退学离场", comment: "遗憾离场...", score: 0 };
      }
      if (isHealthFatal(state, state.general.health)) {
          return { rank: "F", title: "身体透支", comment: "健康先于成绩按下了停止键。这一局没有继续下去，但你至少看见了需要给自己留下恢复空间的边界。", score: 0 };
      }

      // Calculate score from subject levels (main academic measure)
      const academicKeys: SubjectKey[] = state.selectedSubjects.length === 3
        ? ['chinese', 'math', 'english', ...state.selectedSubjects]
        : (Object.keys(state.subjects) as SubjectKey[]);
      const subjectAvg = academicKeys.reduce((sum, key) => sum + state.subjects[key].level, 0) / academicKeys.length;
      const projectCount = state.completedProjects.length;
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
      if (state.examResult?.totalScore) score += state.examResult.totalScore / 20;
      // Clamp to 0-100 range
      score = Math.min(100, Math.max(0, score));

     let noiMedal = state.flags.noi_medal;
     let provincialTeam = state.flags.provincial_team;
     const moContestResult = state.flags.mo_contest_result;
     const moSetter = state.flags.mo_setter === true;
     const oiSetter = state.flags.oi_setter === true;
     const oiProblemDrafted = state.flags.oi_problem_drafted === true;
     const oiSetterFollowup = state.flags.oi_setter_followup;
     const overworked = state.general.health <= 0 || (state.fatigue >= 90 && state.general.health < 35);
     const balancedLife = !!state.romancePartner && state.general.health >= 60 && state.fatigue <= 60;
     const clubOrganizer = !!state.club && state.club !== 'none' && state.general.experience >= 50;
     const projectFinisher = projectCount > 0;
     const rivalGrowth = !!state.flags.rival_resolved;

     let rank = 'C';
     let title = '普通高中生';
     let comment = '高一学年结束了。前面的路，以后再来探索吧。';

     if (noiMedal === 'GOLD') {
       rank = 'SSS';
       title = 'NOI 金牌选手（国集相关机会）';
       comment = '你在 NOI 中斩获金牌，成绩进入国家集训队选拔和相关升学政策的讨论范围。具体机会仍要以当年正式政策、名额和后续选拔为准。';
     } else if (noiMedal === 'SILVER') {
       rank = 'SS';
       title = '强基破格入围者';
       comment = '你在 NOI 中拿到银牌，获得了申请相关强基计划的竞争机会。前面的路，以后再来探索吧。';
     } else if (noiMedal === 'BRONZE' || (!noiMedal && provincialTeam)) {
       rank = 'S';
       title = '省队巨佬';
       comment = '你在校内资源有限的情况下冲入省队，留下了一笔少见而扎实的成绩。前面的路，以后再来探索吧。';
     } else if (noiMedal === 'PARTICIPANT') {
       rank = score >= 75 ? 'A' : 'B';
       title = 'NOI 参赛者';
       comment = '你走完了省队到 NOI 的赛程，但这次没有拿到奖牌。分数和名次都记下了，之后是否继续由你决定。';
     } else if (overworked) {
       rank = 'F';
       title = '过劳警告';
       comment = '你把太多时间交给了成绩，却没有给身体留下恢复的余地。学年结束时，健康和疲劳一起亮起了红灯。';
     } else if (balancedLife) {
       rank = score >= 75 ? 'A' : 'B';
       title = '平衡生活者';
       comment = `你在${state.romancePartner}的陪伴、学业和健康之间找到了自己的节奏。成绩不是唯一答案，但你确实把这一年过得很完整。`;
     } else if (state.competition === 'OI' && oiPower >= 12 && !oiProblemDrafted) {
       rank = score >= 75 ? 'A' : 'B';
       title = 'OI 探索者';
       comment = '你参加了训练、线上赛和复盘。暂时没有奖牌，但已经知道下一步要补哪些题。';
     } else if (state.competition === 'OI' && oiSetterFollowup === 'accepted') {
       rank = score >= 75 ? 'A' : 'B';
       title = 'OI 命题与竞赛实践者';
       comment = '你一边准备比赛，一边把题目交给别人验。你已经走过题面、数据和赛后讨论这一整套流程。';
     } else if (state.competition === 'OI' && oiSetter && oiProblemDrafted) {
       rank = score >= 75 ? 'A' : 'B';
       title = 'OI 出题实践者';
       comment = state.flags.oi_problem_published
         ? (state.flags.oi_problem_feedback === 'defended'
           ? '题目确实上线了，争议也确实留下了。出题不是交完就下班：参赛者还在评论区等一个解释。'
           : '你把一个算法想法写成了题面、样例和数据，别人真的拿它参加了比赛。')
         : '你留下了一份题目草稿。样例和数据还得接着验，离正式比赛只差的那一点，往往最费工夫。';
     } else if (state.competition === 'MO' && moContestResult === 'medal') {
       rank = score >= 75 ? 'A' : 'B';
       title = '数学竞赛获奖者';
       comment = moSetter
         ? '你在数学竞赛中拿到奖项，也参与过命题和证明审稿。会解题，也会把严谨的想法交给别人检验。'
         : '你在数学竞赛中拿到奖项，把一张张草稿纸上的尝试变成了稳定的解题能力。下一道题还在等你。';
     } else if (state.competition === 'MO' && moSetter) {
       rank = score >= 75 ? 'A' : 'B';
       title = '数学命题实践者';
       comment = state.flags.mo_review === 'polished'
         ? '你把证明补完整，也学会了把思路讲给别人听。草稿纸写满了，这次没有把关键步骤交给“显然”。'
         : '你参与了命题，证明却还有空缺。结论很漂亮，审稿同学的问号也很整齐：这里真的显然吗？';
     } else if (state.competition === 'MO' && !!moContestResult) {
       rank = score >= 75 ? 'A' : 'B';
       title = '数学竞赛探索者';
       comment = '你沿着训练课、解题小组和正式赛场走了一遍。结果并不完美，但你已经知道自己想继续追哪一类问题。';
     } else if (clubOrganizer) {
       rank = score >= 75 ? 'A' : 'B';
       title = '社团组织者';
       comment = '你把时间投入到一群人和一件具体的事里，学会了组织、沟通，也留下了课堂分数之外的作品和记忆。';
     } else if (projectFinisher) {
       rank = score >= 75 ? 'A' : 'B';
       title = '项目完成者';
       comment = `你完成了${projectCount}个长期项目。真正的成长不是“想做什么”，而是把它推进到可以交付的那一天。`;
     } else if (rivalGrowth) {
       rank = score >= 75 ? 'A' : 'B';
       title = '竞争与成长';
       comment = '你没有把对手变成敌人，而是在一次次较量和和解里看见了自己的边界。有人同行，成长会更清晰。';
     } else if (score >= 90) {
       rank = 'S';
       title = '年级学神';
       comment = '凭借不可思议的学识与思维，你制霸了年级榜单。前面的路，以后再来探索吧。';
     } else if (score >= 75) {
       rank = 'A';
       title = '尖子生';
       comment = '这一年你把基础打得很扎实。高二的难题还在排队，但至少现在，你有底气翻开下一页。';
     } else if (score >= 60) {
       rank = 'B';
       title = '中流砥柱';
       comment = '你稳扎稳打，学业渐渐有了自己的节奏。接下来还有两年，这份成绩单是起点，不是录取通知书。';
     } else if (score >= 40) {
       rank = 'C';
       title = '芸芸众生';
       comment = '你的成绩中规中矩，不过青春不只有分数。前面的路，以后再来探索吧。';
     } else if (score >= 20) {
       rank = 'D';
       title = '学业危机';
       comment = '你的学业似乎遇到了麻烦。如果不加倍努力，前路坎坷。前面的路，以后再来探索吧。';
     } else {
       rank = 'Z';
       title = '家里蹲预备役';
       comment = '这一年你彻底放飞了自我。前面的路，以后再来探索吧，或者现在就重开。';
     }

     return { rank, title, comment, score: Math.round(score) };
  };

