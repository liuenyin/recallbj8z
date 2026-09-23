import { PHASE_ORDER } from './game_flow';
import { GameState, RelationshipProfile } from '../types';

export const RELATIONSHIP_PROFILES: RelationshipProfile[] = [
  {
    id: 'profile_linxia',
    name: '林夏',
    role: '同桌候选人',
    personality: '外向、敏锐，喜欢音乐和热闹的校园生活。',
    routeHint: '陪伴与表达比单纯刷属性更重要。'
  },
  {
    id: 'profile_shenzhiyao',
    name: '沈知遥',
    role: '年级前列的同学',
    personality: '安静、认真，对学习和未来都有清晰计划。',
    routeHint: '一起学习能稳定提升关系，但也会消耗精力。'
  },
  {
    id: 'profile_chenmo',
    name: '陈默',
    role: '机房里的熟面孔',
    personality: '话不多，擅长算法，愿意把真正的难题讲到你听懂。',
    routeHint: 'OI 训练和真诚交流会打开这条路线。'
  },
  {
    id: 'profile_xujiahe',
    name: '许嘉禾',
    role: '社团活动中心人物',
    personality: '热心、果断，总能把一群人组织起来。',
    routeHint: '社团和周末活动是建立关系的主要场景。'
  }
];

export const getRandomRelationshipProfile = (): RelationshipProfile =>
  RELATIONSHIP_PROFILES[Math.floor(Math.random() * RELATIONSHIP_PROFILES.length)];

export const getRelationshipStage = (state: GameState): string => {
  if (state.romancePartner) return state.flags.romance_tension === 'unresolved' ? '有些话还没说开' : '恋人';
  if (state.flags.romance_resolution === 'friends') return '说开了，还是朋友';
  if (state.flags.romance_resolution === 'distance') return '给彼此一点空间';
  if (state.flags.romance_resolution === 'rejected') return '正在整理心情';
  if (state.flags.romance_resolution === 'separated') return '各自往前走';
  if (state.flags.ready_for_confession) return '有一个约定';
  const favorability = Number(state.flags.ta_favorability || 0);
  if (favorability >= 70) return '暧昧期';
  if (favorability >= 30) return '熟悉的朋友';
  if (favorability >= 8) return '正在认识';
  return '还没说上几句话';
};

export const canPursueRomance = (s: GameState): boolean => !s.romancePartner && !s.flags.romance_resolution;

// A promise survives a semester change, but never resolves in the same week.
export const afterRelationshipWeek = (s: GameState, key: string): boolean => {
  const phase = s.flags[`${key}_phase`];
  const week = Number(s.flags[`${key}_week`]);
  if (!phase || !Number.isFinite(week)) return true; // Older saves did not date promises.
  return s.phase === phase ? s.week > week : PHASE_ORDER.indexOf(s.phase) > PHASE_ORDER.indexOf(phase);
};

export const relationshipCheckpoint = (s: GameState, key: string) => ({
  [`${key}_phase`]: s.phase, [`${key}_week`]: s.week
});

export const startRelationship = (s: GameState): Partial<GameState> => ({
  romancePartner: s.flags.relationship_name || 'TA',
  flags: { ...s.flags, ready_for_confession: false, romance_resolution: 'dating',
    ...relationshipCheckpoint(s, 'romance_started') }
});

export const getRelationshipHint = (s: GameState): string => {
  if (s.flags.romance_resolution === 'rejected') return '先吃顿饭、睡一觉。过些时候，你们还有机会把话说开。';
  if (s.flags.romance_resolution === 'friends') return '做同学也有下文，不用把每次见面都当成下一轮表白。';
  if (['distance', 'separated'].includes(s.flags.romance_resolution)) return '不用急着恢复原样，把自己的日子过好也算进展。';
  if (s.flags.romance_tension === 'unresolved') return '那次没说完的话还在，找个不赶时间的时候再聊聊。';
  if (s.flags.ready_for_confession) return '你们约了下次见面。约定会保留，不必卡着某一周等。';
  if (s.romancePartner) return '在一起以后，也可以有各自的时间。';
  return s.flags.relationship_route_hint || '先从好好说话开始。';
};
