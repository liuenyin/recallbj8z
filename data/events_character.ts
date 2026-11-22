import { GameEvent, GameState, Phase } from '../types';
import { modifySub } from './utils';
import { RIVAL_NICKNAME } from './campus_names';

const withRivalFlags = (state: GameState, updates: Record<string, unknown>) => ({
  ...state.flags,
  rival_name: RIVAL_NICKNAME,
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
    description: `第一次周测发回卷子后，大家叫「${RIVAL_NICKNAME}」的同学把卷子放在你桌角。“我这次少两分。下次还比吗？”`,
    type: 'neutral',
    triggerType: 'FIXED',
    fixedWeek: 3,
    once: true,
    condition: (s) => s.phase === Phase.SEMESTER_1,
    choices: [
      {
        text: '记下分差，下次周测再比',
        resultDescription: '你们把这次的分差写在卷子右上角。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_introduced: true, rival_route: 'competition', rival_score: 2 }),
          general: { ...s.general, mindset: s.general.mindset + 3, experience: s.general.experience + 5 }
        })
      },
      {
        text: '先对一下最后一道题',
        resultDescription: '你们算错的步骤不一样。抢答机把错题本拉到桌子中间，翻到刚抄的那一页。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_introduced: true, rival_route: 'cooperation', rival_score: 2 }),
          general: { ...s.general, mindset: s.general.mindset + 6, experience: s.general.experience + 8 }
        })
      },
      {
        text: '收起卷子，先看看自己错在哪',
        resultDescription: '你把卷子折好。抢答机也拿回了自己的那张。',
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
    description: `${RIVAL_NICKNAME}在图书馆门口等你，手里卷着两张卷子。“上次那题我重做了。要一起看看吗？”`,
    type: 'neutral',
    triggerType: 'FIXED',
    fixedWeek: 9,
    once: true,
    condition: (s) => s.phase === Phase.SEMESTER_1 && !!s.flags.rival_introduced,
    choices: [
      {
        text: '合作复习，互相讲一道最难的题',
        resultDescription: '你们轮流讲题。你把分类讨论里重复的两种情况划在一起。',
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
        text: '各自准备，出成绩再对分数',
        resultDescription: '你们约好出成绩那天再见。你回去把卷子做完了。',
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
        resultDescription: '你说今晚排满了。抢答机收起卷子，回自习室找座位了。',
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
    description: `综合实践课上，你和${RIVAL_NICKNAME}分到同一组。老师让每组周五之前交一张展示板。`,
    type: 'neutral',
    triggerType: 'FIXED',
    fixedWeek: 5,
    once: true,
    condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.rival_introduced && !s.flags.rival_resolved,
    choices: [
      {
        text: '分工合作，把项目做完整',
        resultDescription: '你排版，抢答机补数据。周五交稿前，你们一起贴上了最后一张图。',
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
        resultDescription: '你们交了两版。老师让两个人各自讲一遍，讲完再决定用哪版。',
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
        resultDescription: '你校对并打印了附件。后来抢答机交回展示板，又指着附件说了声谢谢。',
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
    title: '还回错题本',
    description: `学年快结束了，${RIVAL_NICKNAME}把错题本还给你。“那页我抄完了。开学还比吗？”`,
    type: 'positive',
    triggerType: 'FIXED',
    fixedWeek: 19,
    once: true,
    condition: (s) => s.phase === Phase.SEMESTER_2 && !!s.flags.rival_introduced && !s.flags.rival_resolved,
    choices: [
      {
        text: '开学后接着换卷子',
        resultDescription: '你们约好开学先各带一张暑假做过的卷子。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_resolved: true, rival_route: 'cooperation', rival_score: Number(s.flags.rival_score || 0) + 3 }),
          general: { ...s.general, mindset: s.general.mindset + 15, experience: s.general.experience + 12 }
        })
      },
      {
        text: '那就继续比，下一次我一定赢',
        resultDescription: '你们干脆地在走廊拍手约定，下学期从分班后的第一场考试算起。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_resolved: true, rival_route: 'competition', rival_score: Number(s.flags.rival_score || 0) + 4 }),
          general: { ...s.general, mindset: s.general.mindset + 10, experience: s.general.experience + 18 }
        })
      },
      {
        text: '先把错题本收好，开学见',
        resultDescription: '各自把旧错题本收进书包，走到教学楼门口道了声再见。',
        action: (s) => ({
          flags: withRivalFlags(s, { rival_resolved: true, rival_route: 'independent' }),
          general: { ...s.general, mindset: s.general.mindset + 8 }
        })
      }
    ]
  }
];
