import { Phase, type GameEvent, type GameState } from '../types';
import { CAMPUS_PROJECT_ID, PROJECT_WORK_PROGRESS, getProjectSessionsLeft, hydrateProject } from './project_effects';

const topics = {
    lunch: '食堂等餐时间',
    library: '图书馆空座记录'
};

const isLunch = (state: GameState) => state.flags.campus_project_topic === 'lunch';
const started = (state: GameState) => !!state.flags.campus_project_topic;
const finished = (state: GameState) => state.completedProjects.includes(CAMPUS_PROJECT_ID);
const deadlineWeek = 12;

const start = (state: GameState, topic: keyof typeof topics): Partial<GameState> => ({
    flags: { ...state.flags, campus_project_topic: topic },
    activeProjects: [...state.activeProjects, hydrateProject({
        id: CAMPUS_PROJECT_ID,
        title: topics[topic],
        description: '安排三次周末课题活动，整理记录并交表。',
        type: 'ACADEMIC',
        deadlinePhase: Phase.SEMESTER_1,
        deadlineWeek,
        progress: 0,
        requiredProgress: 3 * PROJECT_WORK_PROGRESS,
        rewardsDescription: '经验和效率提升'
    })]
});

export const CAMPUS_PROJECT_EVENTS: GameEvent[] = [
    {
        id: 'campus_project_signup',
        title: '班里的观察作业',
        description: '老师发了一张选题表，想请几位同学用一页纸写清楚一个校园里的小问题。同桌问，你午饭排队的时候愿不愿意顺手记几个时间。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 6,
        condition: state => state.competition === 'None',
        choices: [
            {
                text: '记录食堂的等餐时间',
                hint: '第 12 周截止。接下后，在周计划里安排三次「整理课题记录」。',
                resultDescription: '你和同桌各选了一个窗口。你们约好，从排进队尾的时候计时。',
                action: state => start(state, 'lunch')
            },
            {
                text: '记录图书馆的空座',
                hint: '第 12 周截止。接下后，在周计划里安排三次「整理课题记录」。',
                resultDescription: '你选了两排座位，在纸上画出位置，准备放学后去数。',
                action: state => start(state, 'library')
            },
            {
                text: '这次先不报名',
                resultDescription: '你把选题表传给了后桌。',
                action: () => ({})
            }
        ]
    },
    {
        id: 'campus_project_sample',
        title: '两份相差很大的记录',
        description: state => {
            const records = isLunch(state)
                ? '你在打铃后立刻去了食堂，同桌晚到了十分钟。你等了五分钟，对方只等了两分钟。'
                : '你周一放学去数空座，靠窗还有五个位置。周三同一时间，同学拿回来的表上一个空位也没有。';
            return finished(state) ? `老师问起你交上去的两份记录。${records}` : records;
        },
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 7,
        condition: started,
        choices: [
            {
                text: '把两个时间分开记，再补记一次',
                hint: '占用一点课余时间，之后可以比较两次记录。',
                resultDescription: '你给表格加了一列时间，把原来的两份记录都留了下来。',
                action: state => ({
                    flags: { ...state.flags, campus_project_comparison: true },
                    fatigue: state.fatigue + 4
                })
            },
            {
                text: '只留一个时间，先把这一组记全',
                resultDescription: '你在表格顶部写明了记录时间。另一张纸夹在本子后面，下回有空可以接着记。',
                action: () => ({})
            }
        ]
    },
    {
        id: 'campus_project_check',
        title: '交表前看一眼',
        description: state => {
            if (finished(state)) return '你已经交了记录。老师在纸角写了一个问题，请你想想汇报时要从哪一行讲起。';
            const project = state.activeProjects.find(item => item.id === CAMPUS_PROJECT_ID);
            return project
                ? `老师问你表格做到了哪里。你还需要安排 ${getProjectSessionsLeft(project)} 次「整理课题记录」，第 ${deadlineWeek} 周截止。`
                : '老师问你是否还留着之前的草稿。';
        },
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 10,
        condition: started,
        choices: [{
            text: '在表上标出记录的日期',
            resultDescription: '你补上了日期和起止时间。老师顺着你的表看了一遍，把有疑问的那行折了个角。',
            action: () => ({})
        }]
    },
    {
        id: 'campus_project_report',
        title: '班会上的两分钟',
        description: state => finished(state)
            ? '老师给每组留了两分钟。你站在讲台边，有同学已经举手想问表里那一栏。'
            : '老师开始请各组上去讲。你的表还没填完，同桌问你要不要把手上的记录给大家看。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_1,
        fixedWeek: 14,
        condition: started,
        choices: [
            {
                text: '把两个时段的记录摆在一起讲',
                condition: state => finished(state) && !!state.flags.campus_project_comparison,
                resultDescription: '有同学指着第二列问自己能不能照这个时间去看看。你把记过的日期念给了对方。',
                action: state => ({
                    flags: { ...state.flags, campus_project_report: 'compare' },
                    general: { ...state.general, experience: state.general.experience + 3 }
                })
            },
            {
                text: '投影记录表，把记录时间读出来',
                condition: finished,
                resultDescription: '后排同学抄下了你写的日期，问你下学期要不要在同一时间再记一回。',
                action: state => ({ flags: { ...state.flags, campus_project_report: 'table' } })
            },
            {
                text: '把已经记下的两行读给大家',
                condition: state => !finished(state),
                resultDescription: '你读到表格的空行就停了。同桌说，下学期有空可以一起再记一天。',
                action: state => ({ flags: { ...state.flags, campus_project_report: 'draft' } })
            }
        ]
    },
    {
        id: 'campus_project_return',
        title: '开学后再记一天',
        description: state => state.flags.campus_project_report === 'compare'
            ? '班会上抄过时间的同学拿来一张新表，把这学期同一天的数据写在了旧表旁边。'
            : state.flags.campus_project_report === 'draft'
                ? '同桌把那张只填了几行的表翻出来，问你今天有没有空一起补一回。'
                : '同学拿来一张新表，纸角还抄着你上学期讲过的日期。',
        type: 'neutral',
        triggerType: 'FIXED',
        fixedPhase: Phase.SEMESTER_2,
        fixedWeek: 4,
        condition: state => !!state.flags.campus_project_report,
        choices: [
            {
                text: '按上次的时间再去记一次',
                resultDescription: '你们按旧表上的时间又去了一趟，把这次的记录写在旁边。',
                action: state => ({ general: { ...state.general, experience: state.general.experience + 2 } })
            },
            {
                text: '把旧表留给同学',
                resultDescription: '你把旧表夹进对方的本子里，又指给对方看自己当时站的位置。',
                action: () => ({})
            }
        ]
    }
];
