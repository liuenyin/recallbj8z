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
  if (state.romancePartner) return '恋人';
  const favorability = Number(state.flags.ta_favorability || 0);
  if (favorability >= 70) return '暧昧期';
  if (favorability >= 30) return '熟悉的朋友';
  if (favorability >= 8) return '正在认识';
  return '还没说上几句话';
};
