import { GameEvent, Phase } from '../types';
import { modifySub } from './utils';
import { CHAINED_EVENTS } from './event_defs';
import { canPursueRomance, afterRelationshipWeek, relationshipCheckpoint } from './relationships';
import { restoreRelationshipName } from './campus_names';

export const ROMANCE_EVENTS: GameEvent[] = [
    // --- 阶段1：初识与萌芽 (好感度 < 30) ---
    {
        id: 'romance_first_encounter',
        title: '走廊的转角',
        description: '你抱着一摞作业本匆匆走过拐角，不小心撞到了TA。几本书掉在了地上。',
        type: 'neutral',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) < 30 && Math.random() < (0.20 + s.general.romance * 0.006),
        choices: [
            {
                text: '捡起掉在地上的书，道个歉',
                resultDescription: '你递过去两本书。TA把剩下的一本捡起来，说了声谢谢。',
                action: (s) => ({
                    general: { ...s.general, romance: s.general.romance + 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 10 }
                })
            },
            {
                text: '赶紧让路，补一句不好意思',
                resultDescription: '你让到墙边，说了句对不起。TA点点头，把书抱了起来。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset - 5, romance: s.general.romance - 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 8 }
                })
            },
            {
                text: '把书递过去，问问是不是隔壁班的',
                condition: (s) => s.general.romance > 20,
                resultDescription: 'TA指了指隔壁教室的门。你们站在走廊里聊到预备铃响。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 15 }
                })
            }
        ]
    },
    {
        id: 'romance_same_song',
        title: '午休听的歌',
        description: '午休时间，你在座位上听歌，TA碰巧路过，看到了你手机屏幕上的播放界面。',
        type: 'positive',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 5 && (s.flags.ta_favorability || 0) < 30 && Math.random() < (0.20 + s.general.romance * 0.006),
        choices: [
            {
                text: '递一只耳机过去',
                resultDescription: 'TA接过耳机。播完以后，TA让你把歌名发过去。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 10, romance: s.general.romance + 3 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 12 }
                })
            },
            {
                text: '"你也喜欢这首歌？"',
                resultDescription: '你们聊了会儿歌手。TA推荐了另一首歌，你把歌名记在了手机上。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 10 }
                })
            }
        ]
    },
    {
        id: 'romance_borrow_notes',
        title: '借笔记',
        description: '这节课的知识点很难，TA似乎没有完全听懂，正皱着眉头翻看课本。',
        type: 'neutral',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 8 && (s.flags.ta_favorability || 0) < 30 && Math.random() < (0.20 + s.general.romance * 0.006),
        choices: [
            {
                text: '摊开笔记，一起看标了问号的地方',
                condition: (s) => s.subjects.math.level >= 2 || s.subjects.physics.level >= 2 || s.subjects.chemistry.level >= 2,
                resultDescription: 'TA接过笔记，在同一个算式旁指了指。“我也卡在这一步。”',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 12 }
                })
            },
            {
                text: '问问卡在哪一步',
                resultDescription: '你在草稿纸上补了两行。TA看完后，拿一本空白作业本重算了一遍。',
                action: (s) => ({
                    general: { ...s.general, health: s.general.health - 5, efficiency: s.general.efficiency - 1, romance: s.general.romance + 3, experience: s.general.experience + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 14 }
                })
            }
        ]
    },

    // --- 阶段2：暧昧与日常 (好感度 20 - 70) ---
    {
        id: 'romance_study_together',
        title: '图书馆的偶遇',
        description: '放学后在图书馆，你正准备找个座位，抬头发现TA也在这里，正向你招手。',
        type: 'positive',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 20 && (s.flags.ta_favorability || 0) < 70 && Math.random() < (0.30 + s.general.romance * 0.006),
        choices: [
            {
                text: '走过去坐在TA旁边',
                resultDescription: '你们各写各的，遇到难题就把草稿纸推过去。合上书前，你们把最后一道题也对完了。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 10, efficiency: s.general.efficiency + 2, romance: s.general.romance + 2, experience: s.general.experience + 10 },
                    subjects: modifySub(s, ['math', 'physics', 'english'], 2),
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 10 }
                })
            },
            {
                text: '去买两杯热奶茶（30 元）',
                condition: (s) => s.general.money > 30,
                resultDescription: 'TA接过杯子，问了你口味，下次出门也给你带一杯。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 15, health: s.general.health + 5, money: s.general.money - 30, efficiency: s.general.efficiency + 1, romance: s.general.romance + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 15 }
                })
            }
        ]
    },
    {
        id: 'romance_sports_meet',
        title: '运动会送水',
        description: '秋季运动会，你刚跑完1000米，气喘吁吁。TA拿着一瓶矿泉水在终点等你。',
        type: 'positive',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 20 && (s.flags.ta_favorability || 0) < 70 && s.phase === Phase.SEMESTER_1 && s.week > 4 && s.week < 8,
        choices: [
            {
                text: '接过水，说声谢谢',
                resultDescription: '你喝了几口水。TA递来一张纸巾，和你一起走回看台。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 20, health: s.general.health + 10, romance: s.general.romance + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 10 }
                })
            },
            {
                text: '先在终点旁站一会儿',
                resultDescription: 'TA帮你拧松瓶盖，把水递了过来。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 10, health: s.general.health + 5, romance: s.general.romance + 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 8 }
                })
            }
        ]
    },
    {
        id: 'romance_late_chat',
        title: '深夜的聊天',
        description: '已经过了零点，你正准备睡觉，手机屏幕亮了，是TA发来的消息："睡了吗？有点睡不着。"',
        type: 'neutral',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 35 && (s.flags.ta_favorability || 0) < 70 && Math.random() < (0.25 + s.general.romance * 0.006),
        choices: [
            {
                text: '陪TA聊天直到深夜',
                resultDescription: '你们聊到一点多。第二天第一节课，你打了好几个哈欠。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 15, health: s.general.health - 15, efficiency: s.general.efficiency - 2, romance: s.general.romance + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 15 }
                })
            },
            {
                text: '"早点休息吧，明天还要早起呢。"',
                resultDescription: '你约TA明天午休接着聊。TA回了个盖被子的猫表情。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 3, health: s.general.health + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 6 }
                })
            }
        ]
    },

    {
        id: 'romance_personal_moment', title: '放学后碰面', type: 'positive', triggerType: 'CONDITIONAL', once: true,
        condition: s => (canPursueRomance(s) && Number(s.flags.ta_favorability || 0) >= 20) || !!s.romancePartner,
        description: s => {
            const name = restoreRelationshipName(s.flags.relationship_name, s.relationshipProfileId);
            const scene = {
                profile_linxia: '在楼梯口摘下一只耳机，问你有没有听过刚放的那首歌。',
                profile_shenzhiyao: '把计划本合上，问你晚自习前能不能一起出去走十分钟。',
                profile_chenmo: '把机房旁边那把椅子上的打印纸搬走，叫你坐下看一眼刚跑过的样例。',
                profile_xujiahe: '抱着两卷海报站在活动室门口，请你帮忙贴住纸的另一头。'
            }[s.relationshipProfileId || ''] || '把旁边的椅子拉开，问你能否再坐会儿。';
            return name + scene;
        },
        choices: [
            {text:'留下来聊几句', resultDescription:'你把书包放回桌上。TA讲起下午交作业时拿错练习册的事。',
             action:s=>({general:{...s.general,mindset:s.general.mindset+6},flags:{...s.flags,romance_shared_moment:true,ta_favorability:Number(s.flags.ta_favorability||0)+12}})},
            {text:'说一声下次见，先回家', resultDescription:'TA点点头，接着收拾东西。',
             action:s=>({general:{...s.general,mindset:s.general.mindset+2},flags:{...s.flags,romance_personal_deferred:true}})}
        ]
    },
    {
        id:'romance_confession_prep', title:'放学一起走吗',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>canPursueRomance(s)&&!s.flags.ready_for_confession&&Number(s.flags.ta_favorability||0)>=50,
        description:'快到天桥时，TA问你下次放学能不能单独走一段。',
        choices:[
            {text:'约个放学后都有空的日子',resultDescription:'你们约好，下次有空时在校门口等一下。',
             action:s=>({flags:{...s.flags,ready_for_confession:true,...relationshipCheckpoint(s,'romance_invite')},general:{...s.general,mindset:s.general.mindset+5}})},
            {text:'我更想做朋友，先说清楚',resultDescription:'TA愣了一下，随即点点头：“谢谢你跟我直说。那明天课间问作业还是照旧。”',
             action:s=>({flags:{...s.flags,romance_resolution:'friends',ready_for_confession:false,...relationshipCheckpoint(s,'romance_rejected')}})}
        ]
    },
    {
        id:'romance_confession',title:'有句话想认真说',type:'neutral',triggerType:'CONDITIONAL',once:true,
        condition:s=>canPursueRomance(s)&&!!s.flags.ready_for_confession&&afterRelationshipWeek(s,'romance_invite'),
        description:'你们走到林荫道拐角的路灯下，两个人脚步都慢了下来。TA侧过头看你：“你一路怎么忽然不说话了。”先前在心里准备了半天的话，到嘴边反而有些词穷。',
        choices:[
            {text:'我喜欢你，想认真试着在一起',
             action:s=>({chainedEvent:(Number(s.flags.ta_favorability||0)>=70 || (Number(s.flags.ta_favorability||0)>=60 && !!s.flags.romance_shared_moment))
                ? CHAINED_EVENTS.sum_confess_success : CHAINED_EVENTS.sum_confess_fail})},
            {text:'今天先一起走回家',resultDescription:'你们沿着街道走到下一个路口，聊了几页周末要写的讲义。',
             action:s=>({flags:{...s.flags,ready_for_confession:false},general:{...s.general,mindset:s.general.mindset+5}})},
            {text:'告诉对方，我想继续做朋友',resultDescription:'TA点点头，问你明天早读要背哪一篇。',
             action:s=>({flags:{...s.flags,ready_for_confession:false,romance_resolution:'friends',...relationshipCheckpoint(s,'romance_rejected')}})}
        ]
    },
    {
        id:'romance_after_rejection',title:'在食堂碰面',type:'neutral',triggerType:'CONDITIONAL',once:true,
        condition:s=>!s.romancePartner&&s.flags.romance_resolution==='rejected'&&afterRelationshipWeek(s,'romance_rejected'),
        description:'中午在食堂排队时，TA端着餐盘站到了你后面，抬手跟你打招呼。',
        choices:[
            {text:'打个招呼，问对方要点什么',resultDescription:'TA指了指窗口的菜单。你们聊了两句，各自找了座位。',
             action:s=>({flags:{...s.flags,romance_resolution:'friends',...relationshipCheckpoint(s,'romance_rejected')},general:{...s.general,mindset:s.general.mindset+8}})},
            {text:'点点头，找个位置自己吃',resultDescription:'你端着餐盘去了靠窗的空桌。',
             action:s=>({flags:{...s.flags,romance_resolution:'distance',...relationshipCheckpoint(s,'romance_rejected')},general:{...s.general,mindset:s.general.mindset+6}})}
        ]
    },
    {
        id:'romance_friend_callback',title:'课间对答案',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>!s.romancePartner&&s.flags.romance_resolution==='friends'&&afterRelationshipWeek(s,'romance_rejected'),
        description:'课间，TA拿着数学周测卷走过来。“你上次问过最后一题吧？我刚看懂一种解法。”',
        choices:[
            {text:'接过卷子，一起看解法',tags:['study'],resultDescription:'你们在草稿纸上补了条辅助线。预备铃响时，最后两步正好算完。',action:s=>({subjects:modifySub(s,['math'],1),flags:{...s.flags,romance_friend_memory:true}})},
            {text:'先借一下卷子，回头再看',resultDescription:'你说了声谢谢，把卷子夹进笔记本。',action:s=>({general:{...s.general,mindset:s.general.mindset+4},flags:{...s.flags,romance_friend_memory:true}})}
        ]
    },
    {
        id:'romance_space_callback',title:'今天没有绕路',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>!s.romancePartner&&s.flags.romance_resolution==='distance'&&afterRelationshipWeek(s,'romance_rejected'),
        description:'前阵子去交作业经过那排教室门口，你总会下意识换楼梯上楼。今天你抱着练习册直接沿着原本最近的走廊走过去了，走到楼梯口才发觉这件事。',
        choices:[{text:'照常走去食堂',resultDescription:'你照旧到了常去的窗口，今天多要了一个煎蛋。',action:s=>({flags:{...s.flags,romance_moved_on:true},general:{...s.general,mindset:s.general.mindset+6}})}]
    },
    {
        id:'romance_dating_park',title:'第一次单独出去',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>!!s.romancePartner&&afterRelationshipWeek(s,'romance_started'),
        description:'周末约好放假碰面，TA问想去哪。你看了看手里这周剩的零花钱，心里默默盘算了一遍开销。',
        choices:[
            {text:'拿出三十块，去旁边小店吃点爱吃的',condition:s=>s.general.money>=30,resultDescription:'你们各点了一样小吃换着吃，聊了一下午班上的琐事，回家时天色刚好暗下来。',action:s=>({general:{...s.general,money:s.general.money-30,mindset:s.general.mindset+8},flags:{...s.flags,romance_date_memory:'snack',...relationshipCheckpoint(s,'romance_date')}})},
            {text:'沿着护城河边和公园慢走聊聊近况',resultDescription:'沿着河边树荫走了两站路，聊起各自选科后的进度和打算，简单待了一下午也很自在。',action:s=>({general:{...s.general,mindset:s.general.mindset+7},flags:{...s.flags,romance_date_memory:'walk',...relationshipCheckpoint(s,'romance_date')}})}
        ]
    },
    {
        id:'romance_missed_message',title:'那条没回的消息',type:'neutral',triggerType:'CONDITIONAL',once:true,
        condition:s=>!!s.romancePartner&&!!s.flags.romance_date_memory&&afterRelationshipWeek(s,'romance_date'),
        description:'写完压轴卷拿起手机时才看见两个小时前TA发来的消息：“今天本来有件事想跟你说。”这周两头忙着作业，你们确实好几天没正经说话了。',
        choices:[
            {text:'回个语音，问问是什么事',resultDescription:'TA说等了很久。你们约好，没空时先发一条消息。',action:s=>({flags:{...s.flags,romance_tension:'resolved',romance_communication:true},general:{...s.general,mindset:s.general.mindset+5}})},
            {text:'回一句「明天聊」，先睡觉',resultDescription:'你关了灯。TA过了一会儿回了个「好」。',action:s=>({flags:{...s.flags,romance_tension:'unresolved',...relationshipCheckpoint(s,'romance_tension')},general:{...s.general,health:s.general.health+3}})}
        ]
    },
    {
        id:'romance_repair',title:'把没说完的话说完',type:'neutral',triggerType:'CONDITIONAL',once:true,
        condition:s=>!!s.romancePartner&&s.flags.romance_tension==='unresolved'&&afterRelationshipWeek(s,'romance_tension'),
        description:'晚自习前，TA在楼道叫住你。“上次那条消息还没聊完。现在有空吗？”',
        choices:[
            {text:'坐下来聊，约好忙时打个招呼',resultDescription:'你们在楼梯口坐了几分钟，约好以后没空就提前说一声。',action:s=>({flags:{...s.flags,romance_tension:'resolved',romance_communication:true},general:{...s.general,mindset:s.general.mindset+6}})},
            {text:'告诉对方，我想先分开',resultDescription:'TA听完后点了点头。晚自习铃响，你们各自回了教室。',action:s=>({romancePartner:null,flags:{...s.flags,romance_resolution:'separated',romance_tension:'resolved',ready_for_confession:false},general:{...s.general,mindset:s.general.mindset-8},activeStatuses:s.activeStatuses.filter(st=>st.id!=='in_love')})}
        ]
    },
    {
        id:'romance_year_note',title:'夹在书里的纸条',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>!!s.romancePartner&&s.phase===Phase.SUMMER_BREAK,
        description:s=>`${s.romancePartner}还你的参考书封面下夹着张便签：“高二开学前先各自歇阵子，下学期放学还一起走吗？暑假作业不准抄我的。”`,
        choices:[{text:'在纸条背面写个「好」',resultDescription:'你把纸条夹回书里，打算开学时还给TA。',action:s=>({flags:{...s.flags,romance_year_memory:true},general:{...s.general,mindset:s.general.mindset+6}})}]
    }
];
