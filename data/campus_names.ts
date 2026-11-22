export const RELATIONSHIP_NICKNAMES = {
    profile_linxia: 'L同学',
    profile_shenzhiyao: 'S同学',
    profile_chenmo: 'C同学',
    profile_xujiahe: 'X同学'
} as const;

export const RIVAL_NICKNAME = 'Z同学';
export const FESTIVAL_PARTNER_NICKNAME = 'H同学';

const explicitTextNames = new Map([
    ['林夏', RELATIONSHIP_NICKNAMES.profile_linxia],
    ['沈知遥', RELATIONSHIP_NICKNAMES.profile_shenzhiyao],
    ['陈默', RELATIONSHIP_NICKNAMES.profile_chenmo],
    ['许嘉禾', RELATIONSHIP_NICKNAMES.profile_xujiahe],
    ['周竞', RIVAL_NICKNAME],
    ['陈禾', FESTIVAL_PARTNER_NICKNAME],
    ['哈基米', RELATIONSHIP_NICKNAMES.profile_linxia],
    ['抢答机', RIVAL_NICKNAME]
]);

const objectNicknames = new Map([
    ['记事本', RELATIONSHIP_NICKNAMES.profile_shenzhiyao],
    ['小键盘', RELATIONSHIP_NICKNAMES.profile_chenmo],
    ['胶带卷', RELATIONSHIP_NICKNAMES.profile_xujiahe]
]);
const previousNames = new Map([...explicitTextNames, ...objectNicknames]);

export const restoreRelationshipName = (name: unknown, profileId?: unknown): string => {
    if (typeof profileId === 'string' && Object.hasOwn(RELATIONSHIP_NICKNAMES, profileId)) {
        return RELATIONSHIP_NICKNAMES[profileId as keyof typeof RELATIONSHIP_NICKNAMES];
    }
    if (typeof name !== 'string') return '对方';
    const resolved = previousNames.get(name) ?? name;
    return Object.values(RELATIONSHIP_NICKNAMES).some(nickname => nickname === resolved) ? resolved : '对方';
};

export const formatCampusText = (text: string, relationshipName?: string, oldRelationshipName?: string): string => {
    const replaced = text.replace(/林夏|沈知遥|陈默|许嘉禾|周竞|陈禾|哈基米|抢答机/g, name => explicitTextNames.get(name) ?? name);
    const name = relationshipName ? restoreRelationshipName(relationshipName) : '对方';
    let migrated = replaced;
    if (oldRelationshipName && oldRelationshipName.length >= 2 && oldRelationshipName !== name && !explicitTextNames.has(oldRelationshipName)
        && !['TA', '对方', '同桌', '同学', '某人'].includes(oldRelationshipName)) {
        migrated = objectNicknames.has(oldRelationshipName)
            ? replaced.replace(new RegExp(`${oldRelationshipName}(?=在等|等你|朝你|向你|说话|笑着|发来|问你|对你说|向你招手)`, 'g'), name)
            : replaced.replaceAll(oldRelationshipName, name);
    }
    return migrated.replace(/(?:L|S|C|X)同学/g, 'TA');
};
