export const RELATIONSHIP_NICKNAMES = {
    profile_linxia: '哈基米',
    profile_shenzhiyao: '记事本',
    profile_chenmo: '小键盘',
    profile_xujiahe: '胶带卷'
} as const;

export const RIVAL_NICKNAME = '抢答机';

const previousNames = new Map([
    ['林夏', RELATIONSHIP_NICKNAMES.profile_linxia],
    ['沈知遥', RELATIONSHIP_NICKNAMES.profile_shenzhiyao],
    ['陈默', RELATIONSHIP_NICKNAMES.profile_chenmo],
    ['许嘉禾', RELATIONSHIP_NICKNAMES.profile_xujiahe],
    ['周竞', RIVAL_NICKNAME]
]);

export const restoreRelationshipName = (name: unknown, profileId?: unknown): string => {
    if (typeof profileId === 'string' && Object.hasOwn(RELATIONSHIP_NICKNAMES, profileId)) {
        return RELATIONSHIP_NICKNAMES[profileId as keyof typeof RELATIONSHIP_NICKNAMES];
    }
    if (typeof name !== 'string') return '对方';
    const resolved = previousNames.get(name) ?? name;
    return Object.values(RELATIONSHIP_NICKNAMES).some(nickname => nickname === resolved) ? resolved : '对方';
};

export const formatCampusText = (text: string, relationshipName?: string, oldRelationshipName?: string): string => {
    const replaced = text.replace(/林夏|沈知遥|陈默|许嘉禾|周竞/g, name => previousNames.get(name) ?? name);
    const name = relationshipName ? restoreRelationshipName(relationshipName) : '对方';
    const migrated = oldRelationshipName && oldRelationshipName.length >= 2 && oldRelationshipName !== name && !previousNames.has(oldRelationshipName)
        && !['TA', '对方', '同桌', '同学', '某人'].includes(oldRelationshipName)
        ? replaced.replaceAll(oldRelationshipName, name)
        : replaced;
    return migrated.replace(/\bTA\b/g, name);
};
