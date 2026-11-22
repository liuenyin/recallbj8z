import { PHASE_ORDER } from './game_flow';
import { GameState, RelationshipProfile } from '../types';
import { RELATIONSHIP_NICKNAMES, restoreRelationshipName } from './campus_names';

export const RELATIONSHIP_PROFILES: RelationshipProfile[] = [
  {
    id: 'profile_linxia',
    name: RELATIONSHIP_NICKNAMES.profile_linxia,
    role: '常分享歌单的同学',
    personality: '喜欢听歌。课间碰面时会聊最近听到了什么。',
    routeHint: '课间可以聊歌。'
  },
  {
    id: 'profile_shenzhiyao',
    name: RELATIONSHIP_NICKNAMES.profile_shenzhiyao,
    role: '年级前列的同学',
    personality: '经常拿本子记作业和周测错题。',
    routeHint: '有不懂的题，可以一起看。'
  },
  {
    id: 'profile_chenmo',
    name: RELATIONSHIP_NICKNAMES.profile_chenmo,
    role: '机房里的熟面孔',
    personality: '常在机房调程序，讲题时习惯先举个例子。',
    routeHint: '下次在机房碰见，可以带一道题去问。'
  },
  {
    id: 'profile_xujiahe',
    name: RELATIONSHIP_NICKNAMES.profile_xujiahe,
    role: '负责社团宣传的同学',
    personality: '负责贴海报和借活动室，经常带着胶带。',
    routeHint: '社团忙的时候可以搭把手。'
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
  romancePartner: restoreRelationshipName(s.flags.relationship_name, s.relationshipProfileId),
  flags: { ...s.flags, ready_for_confession: false, romance_resolution: 'dating',
    ...relationshipCheckpoint(s, 'romance_started') }
});

export const getRelationshipHint = (s: GameState): string => {
  if (s.flags.romance_resolution === 'rejected') return '下次在学校遇见，可以打个招呼。';
  if (s.flags.romance_resolution === 'friends') return '你们约好继续做朋友。';
  if (['distance', 'separated'].includes(s.flags.romance_resolution)) return '你们暂时各自安排课余时间。';
  if (s.flags.romance_tension === 'unresolved') return '找个空当说说上次那条消息。';
  if (s.flags.ready_for_confession) return '你们约过一次放学后单独走。';
  if (s.romancePartner) return '周末有空可以约一次活动。';
  return s.flags.relationship_route_hint || '课间有机会时，可以聊几句。';
};
