import { GameEvent, GameState, Phase } from '../types';
import { modifySub } from './utils';

const withRivalFlags = (state: GameState, updates: Record<string, unknown>) => ({
  ...state.flags,
  rival_name: state.flags.rival_name || '周竞',
  ...updates
});

/**
 * A small, stateful rival arc. The events are deliberately phase-gated so the
 * same registry can be mounted in both semester pools without cross-triggering.
 */
export const RIVAL_EVENTS: GameEvent[] = [
  {
    id: 'rival_introduction',
    title: '有人把你当成对手',
    description: '新学期第一次周测后，一个叫周竞的同学把卷子放到你桌边：“下次，我会超过你。”这句话不像挑衅，更像一份正式邀请。',
    type: 'neutral',
    triggerType: 'FIXED',
    fixedWeek: 3,
    once: true,
    condition: (s) => s.phase === Phase.SEMESTER_1,
    choices: [
      {
        text: '正面迎战，约定下次见分晓',
        resultDescription: '你们把每次周测都当成一场小型决赛。竞争让你更专注，也让校园生活第一次有了明确的坐标。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_introduced: true, rival_route: 'competition', rival_score: 2 }),
          general: { ...s.general, mindset: s.general.mindset + 3, experience: s.general.experience + 5 }
        })
      },
      {
        text: '先一起讨论错题，再决定谁更快',
        resultDescription: '你们发现彼此的解题思路刚好互补。周竞把自己的错题本推过来，竞争暂时变成了合作。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_introduced: true, rival_route: 'cooperation', rival_score: 2 }),
          general: { ...s.general, mindset: s.general.mindset + 6, experience: s.general.experience + 8 }
        })
      },
      {
        text: '笑一笑，先把自己的节奏走稳',
        resultDescription: '你没有接受这场较量，但也没有把话说死。周竞点点头，临走前留下了一句：“那就期中见。”',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_introduced: true, rival_route: 'undecided', rival_score: 0 }),
          general: { ...s.general, mindset: s.general.mindset + 2 }
        })
      }
    ]
  },
  {
    id: 'rival_midterm_prep',
    title: '期中考前的约定',
    description: (s: GameState) => `${s.flags.rival_name || '周竞'}在图书馆门口等你：“这次要不要一起把最难的几道题啃下来？当然，考场上我不会让你。”`,
    type: 'neutral',
    triggerType: 'FIXED',
    fixedWeek: 9,
    once: true,
    condition: (s) => s.phase === Phase.SEMESTER_1 && !!s.flags.rival_introduced,
    choices: [
      {
        text: '合作复习，互相讲一道最难的题',
        resultDescription: '你们轮流讲题，直到晚自习铃响。你学会了新的解法，也确认了这段关系不必只靠输赢维持。',
        action: (s) => ({
          flags: withRivalFlags(s, {
            rival_route: 'cooperation',
            rival_score: Number(s.flags.rival_score || 0) + 2
          }),
          subjects: modifySub(s, ['math', 'physics'], 2),
          general: { ...s.general, experience: s.general.experience + 12, mindset: s.general.mindset + 3 }
        })
      },
      {
        text: '各自准备，考场上堂堂正正比一次',
        resultDescription: '你们约好不交换答案，只在考场上用结果说话。那种清晰的压力让你重新找回了学习的兴奋感。',
        action: (s) => ({
          flags: withRivalFlags(s, {
            rival_route: 'competition',
            rival_score: Number(s.flags.rival_score || 0) + 2
          }),
          subjects: modifySub(s, ['math'], 3),
          general: { ...s.general, experience: s.general.experience + 10, mindset: s.general.mindset + 2 }
        })
      },
      {
        text: '婉拒，保持自己的复习计划',
        resultDescription: '你礼貌地拒绝了邀请。周竞没有介意，只说下次周测再见。你也意识到，边界感同样是一种成熟。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_score: Number(s.flags.rival_score || 0) - 1 }),
          general: { ...s.general, mindset: s.general.mindset + 1 }
        })
      }
    ]
  },
  {
    id: 'rival_team_project',
    title: '同一张展示板',
    description: (s: GameState) => `高一下的综合实践课把你和${s.flags.rival_name || '周竞'}分到了同一组。截止日前，你们必须完成一份真正能拿出手的展示。`,
    type: 'neutral',
    triggerType: 'FIXED',
    fixedWeek: 5,
    once: true,
    condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.rival_introduced && !s.flags.rival_resolved,
    choices: [
      {
        text: '分工合作，把项目做完整',
        resultDescription: '你负责框架，周竞负责验证，最后一晚你们把展示板上的最后一个空格填满。作品比你们任何一个人的草稿都好。',
        action: (s) => ({
          flags: withRivalFlags(s, {
            rival_route: 'cooperation',
            rival_project_done: true,
            rival_score: Number(s.flags.rival_score || 0) + 3
          }),
          general: { ...s.general, experience: s.general.experience + 20, mindset: s.general.mindset + 8 }
        })
      },
      {
        text: '争主导权，各自做一版再比较',
        resultDescription: '你们都不愿意让步，最后呈上了两套方案。老师说各有亮点，但你知道这场较量也留下了一点裂痕。',
        action: (s) => ({
          flags: withRivalFlags(s, {
            rival_route: 'competition',
            rival_project_done: true,
            rival_score: Number(s.flags.rival_score || 0) + 1
          }),
          general: { ...s.general, experience: s.general.experience + 15, mindset: s.general.mindset - 5 }
        })
      },
      {
        text: '把决定权交给对方，自己完成收尾',
        resultDescription: '你没有争抢署名，却默默补完了最麻烦的收尾工作。周竞第一次认真地向你道谢。',
        action: (s) => ({
          flags: withRivalFlags(s, {
            rival_route: 'cooperation',
            rival_project_done: true,
            rival_score: Number(s.flags.rival_score || 0) + 2
          }),
          general: { ...s.general, experience: s.general.experience + 16, mindset: s.general.mindset + 5 }
        })
      }
    ]
  },
  {
    id: 'rival_resolution',
    title: '各自奔向下一站',
    description: (s: GameState) => `学年最后一次见面，${s.flags.rival_name || '周竞'}把那本旧错题本还给你：“明年还会继续比吗？”你们都知道，答案不只在分数里。`,
    type: 'positive',
    triggerType: 'FIXED',
    fixedWeek: 19,
    once: true,
    condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.rival_introduced && !s.flags.rival_resolved,
    choices: [
      {
        text: '约好继续并肩，把竞争变成合作',
        resultDescription: '你们约定下学年继续交换错题和灵感。真正的对手不是要击败的人，而是让你持续变好的人。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_resolved: true, rival_route: 'cooperation', rival_score: Number(s.flags.rival_score || 0) + 3 }),
          general: { ...s.general, mindset: s.general.mindset + 15, experience: s.general.experience + 12 }
        })
      },
      {
        text: '那就继续比，下一次我一定赢',
        resultDescription: '你们击掌告别，约定把下一次排名当成新的起点。竞争没有消失，但它不再让你感到孤单。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_resolved: true, rival_route: 'competition', rival_score: Number(s.flags.rival_score || 0) + 4 }),
          general: { ...s.general, mindset: s.general.mindset + 10, experience: s.general.experience + 18 }
        })
      },
      {
        text: '各自努力，到了更远的地方再见',
        resultDescription: '你们没有给这段关系贴上标签，只把错题本各自收好。那句“再见”听起来不像结束，更像一种祝福。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_resolved: true, rival_route: 'independent' }),
          general: { ...s.general, mindset: s.general.mindset + 8 }
        })
      }
    ]
  }
];
