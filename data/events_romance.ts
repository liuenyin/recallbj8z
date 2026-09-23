import { GameEvent, Phase } from '../types';
import { modifySub } from './utils';
import { CHAINED_EVENTS } from './event_defs';
import { canPursueRomance, afterRelationshipWeek, relationshipCheckpoint } from './relationships';

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
                text: '赶紧帮忙捡起来连声道歉',
                resultDescription: 'TA看着你手忙脚乱的样子，忍不住笑了："没关系，我自己来吧。"（好感度微升）',
                action: (s) => ({
                    general: { ...s.general, romance: s.general.romance + 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 8 }
                })
            },
            {
                text: '赶紧让路，补一句不好意思',
                resultDescription: '你让开半步，终于挤出一句道歉。TA点点头：“没事，下次转弯减速。”有点尴尬，但至少说上话了。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset - 5, romance: s.general.romance - 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 5 }
                })
            },
            {
                text: '"同学，你的书和我很有缘啊。"（需要桃花>20）',
                condition: (s) => s.general.romance > 20,
                resultDescription: 'TA愣了一下，随后噗嗤一声笑了："你的搭讪方式真老土。"你们借此聊了几句。（好感度大幅上升）',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 15 }
                })
            }
        ]
    },
    {
        id: 'romance_same_song',
        title: '同频共振',
        description: '午休时间，你在座位上听歌，TA碰巧路过，看到了你手机屏幕上的播放界面。',
        type: 'positive',
        triggerType: 'RANDOM',
        once: true,
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 5 && (s.flags.ta_favorability || 0) < 30 && Math.random() < (0.20 + s.general.romance * 0.006),
        choices: [
            {
                text: '递过一只耳机："要一起听吗？"',
                resultDescription: 'TA犹豫了一下，接过耳机。你们静静地听完了一首歌，仿佛分享了一个小秘密。（好感度上升）',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 10, romance: s.general.romance + 3 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 10 }
                })
            },
            {
                text: '"你也喜欢这首歌？"',
                resultDescription: '你们就这首歌的歌手聊了一会儿，发现彼此的音乐品味出奇地一致。（好感度上升）',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 8 }
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
                text: '把笔记摊开：标问号的地方咱们一起看',
                condition: (s) => s.subjects.math.level >= 2 || s.subjects.physics.level >= 2 || s.subjects.chemistry.level >= 2,
                resultDescription: 'TA接过笔记：“你也在这儿打了问号？太好了，不是我一个人没听懂。”你们终于找到了共同语言——知识盲区。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 5, romance: s.general.romance + 2 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 10 }
                })
            },
            {
                text: '凑过去问："哪里不懂？我教你。"',
                resultDescription: '你耐心地给TA讲解了难点，TA恍然大悟，看着你的眼神多了几分崇拜。（好感度大幅上升，耗费一点精力）',
                action: (s) => ({
                    general: { ...s.general, health: s.general.health - 5, efficiency: s.general.efficiency - 1, romance: s.general.romance + 3, experience: s.general.experience + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 12 }
                })
            }
        ]
    },

    // --- 阶段2：暧昧与日常 (好感度 30 - 70) ---
    {
        id: 'romance_study_together',
        title: '图书馆的偶遇',
        description: '放学后在图书馆，你正准备找个座位，抬头发现TA也在这里，正向你招手。',
        type: 'positive',
        triggerType: 'RANDOM',
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 30 && (s.flags.ta_favorability || 0) < 70 && Math.random() < (0.30 + s.general.romance * 0.006),
        choices: [
            {
                text: '走过去坐在TA旁边',
                resultDescription: '你们默契地一起自习了一下午，偶尔交流几个问题。学习效率出奇的高。（好感度上升，各科经验提升）',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 10, efficiency: s.general.efficiency + 2, romance: s.general.romance + 2, experience: s.general.experience + 10 },
                    subjects: modifySub(s, ['math', 'physics', 'english'], 2),
                    flags: { ...s.flags, romance_shared_moment: true, ta_favorability: (s.flags.ta_favorability || 0) + 10 }
                })
            },
            {
                text: '"等我一下"，去买两杯热奶茶回来（需要金钱>30）',
                condition: (s) => s.general.money > 30,
                resultDescription: '你把热腾腾的奶茶递给TA，TA捧着杯子，脸颊微红："谢谢，你怎么知道我喜欢这个口味？"（好感度大幅上升）',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 15, health: s.general.health + 5, money: s.general.money - 30, efficiency: s.general.efficiency + 1, romance: s.general.romance + 5 },
                    flags: { ...s.flags, romance_shared_moment: true, ta_favorability: (s.flags.ta_favorability || 0) + 15 }
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
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 30 && (s.flags.ta_favorability || 0) < 70 && s.phase === Phase.SEMESTER_1 && s.week > 4 && s.week < 8,
        choices: [
            {
                text: '接过水一饮而尽："谢了！"',
                resultDescription: 'TA递给你纸巾让你擦汗，你们相视一笑，周围同学投来起哄的目光。（好感度上升）',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 20, health: s.general.health + 10, romance: s.general.romance + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 10 }
                })
            },
            {
                text: '强装镇定："一点都不累，小意思。"',
                resultDescription: 'TA白了你一眼，把水塞到你怀里："行了别装了，快喝吧。"虽然被拆穿，但气氛很温馨。（好感度上升）',
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
        condition: (s) => canPursueRomance(s) && (s.flags.ta_favorability || 0) >= 40 && (s.flags.ta_favorability || 0) < 70 && Math.random() < (0.25 + s.general.romance * 0.006),
        choices: [
            {
                text: '陪TA聊天直到深夜',
                resultDescription: '你们从学校的八卦聊到未来的理想，感觉彼此的心贴得更近了。但第二天上课你困得不行。（好感度大幅上升，健康和效率下降）',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 15, health: s.general.health - 15, efficiency: s.general.efficiency - 2, romance: s.general.romance + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 15 }
                })
            },
            {
                text: '"早点休息吧，明天还要早起呢。"',
                resultDescription: '你补了一句“明天午休接着聊”。TA发来一只盖好被子的猫：“成交。”喜欢一个人，也不用靠熬夜证明。',
                action: (s) => ({
                    general: { ...s.general, mindset: s.general.mindset + 3, health: s.general.health + 5 },
                    flags: { ...s.flags, ta_favorability: (s.flags.ta_favorability || 0) + 6 }
                })
            }
        ]
    },

    {
        id: 'romance_personal_moment', title: '原来你还有这一面', type: 'positive', triggerType: 'CONDITIONAL', once: true,
        condition: s => (canPursueRomance(s) && Number(s.flags.ta_favorability || 0) >= 20) || !!s.romancePartner,
        description: s => ({
            profile_linxia: '林夏塞来一只耳机：“这首歌的前奏像不像下课铃？我已经开始条件反射收书包了。”屏幕上是一个只有七首歌的列表。',
            profile_shenzhiyao: '沈知遥把计划本合上：“今天一项都没划掉。要不陪我走一圈？别问学习，我现在和数学暂时不熟。”',
            profile_chenmo: '陈默盯着屏幕半天，忽然笑了：“我给变量取名叫救命，结果真得靠它救命。”他挪开旁边椅子上的书。',
            profile_xujiahe: '许嘉禾抱着活动海报站在门口：“大家都说辛苦了，但胶带至今没有自己长腿过来。”说完又笑：“陪我贴两张？”'
        }[s.relationshipProfileId || ''] || 'TA把旁边的椅子拉开，想和你聊点课堂以外的事。'),
        choices: [
            {text:'留下来，听听今天发生了什么', resultDescription:'你没有急着给建议。TA越说越放松，最后连那件特别丢人的小事都讲了。这个版本的TA，课代表点名时可看不到。',
             action:s=>({general:{...s.general,mindset:s.general.mindset+6},flags:{...s.flags,romance_shared_moment:true,ta_favorability:Number(s.flags.ta_favorability||0)+12}})},
            {text:'今天赶时间，认真说句下次见', resultDescription:'“好，路上慢点。”没有突然变脸，也没有扣上不关心的帽子。只是这段话，留到了下次。',
             action:s=>({general:{...s.general,mindset:s.general.mindset+2},flags:{...s.flags,romance_personal_deferred:true}})}
        ]
    },
    {
        id:'romance_confession_prep', title:'下次，单独走一段？',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>canPursueRomance(s)&&!s.flags.ready_for_confession&&Number(s.flags.ta_favorability||0)>=70,
        description:'放学的人群慢慢散了。TA在楼梯口放慢脚步：“下次有空，想不想一起走走？不用特地准备什么。”',
        choices:[
            {text:'好啊，留一段不用赶路的时间',resultDescription:'你们认真约好了。没有倒数钟声，也没有全班起哄，只是两个人都有点期待下次见面。',
             action:s=>({flags:{...s.flags,ready_for_confession:true,...relationshipCheckpoint(s,'romance_invite')},general:{...s.general,mindset:s.general.mindset+5}})},
            {text:'我更想做朋友，先说清楚',resultDescription:'TA愣了一下，点点头：“谢谢你直接说。那明天作业还是可以一起吐槽吧？”可以，作业是共同敌人。',
             action:s=>({flags:{...s.flags,romance_resolution:'friends',ready_for_confession:false,...relationshipCheckpoint(s,'romance_rejected')}})}
        ]
    },
    {
        id:'romance_confession',title:'有句话想认真说',type:'neutral',triggerType:'CONDITIONAL',once:true,
        condition:s=>canPursueRomance(s)&&!!s.flags.ready_for_confession&&afterRelationshipWeek(s,'romance_invite'),
        description:'你们走到路口，谁也没急着说再见。TA看过来：“你今天安静得有点反常。”脑子里的台词排练了八百遍，此刻全部申请下班。',
        choices:[
            {text:'我喜欢你，想认真试着在一起',
             action:s=>({chainedEvent:Number(s.flags.ta_favorability||0)>=70&&(s.flags.romance_shared_moment || !s.flags.romance_invite_phase)
                ? CHAINED_EVENTS.sum_confess_success : CHAINED_EVENTS.sum_confess_fail})},
            {text:'先不急，今天能这样聊天就很好',resultDescription:'你们又绕了一小圈。喜欢还在，但不用今天就给关系交一份答卷。以后相处更熟悉了，你仍可以主动开口。',
             action:s=>({flags:{...s.flags,ready_for_confession:false},general:{...s.general,mindset:s.general.mindset+5}})},
            {text:'想了想，我更珍惜现在的朋友关系',resultDescription:'“好，那别突然不理我。”你们把话说开，又开始争论食堂哪一档最值得排队。',
             action:s=>({flags:{...s.flags,ready_for_confession:false,romance_resolution:'friends',...relationshipCheckpoint(s,'romance_rejected')}})}
        ]
    },
    {
        id:'romance_after_rejection',title:'好人卡的售后服务',type:'neutral',triggerType:'CONDITIONAL',once:true,
        condition:s=>!s.romancePartner&&s.flags.romance_resolution==='rejected'&&afterRelationshipWeek(s,'romance_rejected'),
        description:'在食堂排队时，你和TA又碰见了。TA先打了招呼，没装作不认识。你脑内的“杂鱼”播报器准备开工，被肚子的响声强行插播。',
        choices:[
            {text:'有点尴尬，但还是可以正常做同学',resultDescription:'“当然可以。”你们各自点饭，没有突然反转成爱情，也没有谁输给谁。今天最大的悬念是鸡腿还有没有。',
             action:s=>({flags:{...s.flags,romance_resolution:'friends',...relationshipCheckpoint(s,'romance_rejected')},general:{...s.general,mindset:s.general.mindset+8}})},
            {text:'我想先缓缓，过阵子再聊',resultDescription:'TA点头：“好，不催你。”你端着餐盘去找朋友。今天先照顾自己，不需要表演已经完全不难过。',
             action:s=>({flags:{...s.flags,romance_resolution:'distance',...relationshipCheckpoint(s,'romance_rejected')},general:{...s.general,mindset:s.general.mindset+6}})}
        ]
    },
    {
        id:'romance_friend_callback',title:'普通同学，也有后续',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>!s.romancePartner&&s.flags.romance_resolution==='friends'&&afterRelationshipWeek(s,'romance_rejected'),
        description:'TA把一张卷子递过来：“这道题你上次是不是问过？我找到另一种解法了。”没有试探，也不需要解读潜台词，就是同学来讲题。',
        choices:[
            {text:'来，让我看看知识怎么攻击我',tags:['study'],resultDescription:'你们讲完题，又吐槽了一会儿作业量。有些关系换了一种形状，仍然能好好留在生活里。',action:s=>({subjects:modifySub(s,['math'],1),flags:{...s.flags,romance_friend_memory:true}})},
            {text:'先记下，谢谢你还记得',resultDescription:'卷子夹进了书里。你发现自己已经可以很自然地说谢谢了。',action:s=>({general:{...s.general,mindset:s.general.mindset+4},flags:{...s.flags,romance_friend_memory:true}})}
        ]
    },
    {
        id:'romance_space_callback',title:'今天没有绕路',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>!s.romancePartner&&s.flags.romance_resolution==='distance'&&afterRelationshipWeek(s,'romance_rejected'),
        description:'前几天路过那间教室，你总想换条路。今天你抱着作业直接走过去了，走到楼梯口才意识到这件事。没有背景音乐，但确实轻松了一点。',
        choices:[{text:'去吃饭，今天多加个蛋',resultDescription:'杂鱼称号已过期。不用续费，也不用向谁证明什么。',action:s=>({flags:{...s.flags,romance_moved_on:true},general:{...s.general,mindset:s.general.mindset+6}})}]
    },
    {
        id:'romance_dating_park',title:'第一次约会的预算',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>!!s.romancePartner&&afterRelationshipWeek(s,'romance_started'),
        description:'TA问周末去哪。你看了看钱包，钱包也看了看你。约会计划目前有两位参与者和零位赞助商。',
        choices:[
            {text:'留出三十块，一起吃点喜欢的东西',condition:s=>s.general.money>=30,resultDescription:'你们交换着尝了几口，最后一致认为对方点的更好吃。照片拍糊了，倒是笑得很清楚。',action:s=>({general:{...s.general,money:s.general.money-30,mindset:s.general.mindset+8},flags:{...s.flags,romance_date_memory:'snack',...relationshipCheckpoint(s,'romance_date')}})},
            {text:'不花钱，散步聊聊各自最近的事',resultDescription:'路边的猫拒绝营业，你们替它配了十分钟内心独白。没有门票，也足够记很久。',action:s=>({general:{...s.general,mindset:s.general.mindset+7},flags:{...s.flags,romance_date_memory:'walk',...relationshipCheckpoint(s,'romance_date')}})}
        ]
    },
    {
        id:'romance_missed_message',title:'那条没回的消息',type:'neutral',triggerType:'CONDITIONAL',once:true,
        condition:s=>!!s.romancePartner&&!!s.flags.romance_date_memory&&afterRelationshipWeek(s,'romance_date'),
        description:'你忙完才看见TA的消息：“今天本来有件事想跟你讲。”这几天你们总对不上时间。没人做错什么大事，但对话框的确有点冷。',
        choices:[
            {text:'解释刚才在忙什么，再听TA把话说完',resultDescription:'TA说不需要秒回，只希望忙的时候打个招呼。你们约好了各自的时间，手机终于不用当测谎仪。',action:s=>({flags:{...s.flags,romance_tension:'resolved',romance_communication:true},general:{...s.general,mindset:s.general.mindset+5}})},
            {text:'今天太累了，先把手机扣下',resultDescription:'今晚先停了下来。你知道这件事还没说开，等有力气了，最好找个时间认真聊。',action:s=>({flags:{...s.flags,romance_tension:'unresolved',...relationshipCheckpoint(s,'romance_tension')},general:{...s.general,health:s.general.health+3}})}
        ]
    },
    {
        id:'romance_repair',title:'把没说完的话说完',type:'neutral',triggerType:'CONDITIONAL',once:true,
        condition:s=>!!s.romancePartner&&s.flags.romance_tension==='unresolved'&&afterRelationshipWeek(s,'romance_tension'),
        description:'TA叫住你：“我不是想让你一直陪着我。但如果不开心，能不能别让我全靠猜？”你们找了个安静的地方坐下。',
        choices:[
            {text:'认真聊聊，我们各自需要多少空间',resultDescription:'你们没有神奇地消除所有分歧，只是约好忙时说明、累时直说。关系不是全勤奖，也不是读心术考试。',action:s=>({flags:{...s.flags,romance_tension:'resolved',romance_communication:true},general:{...s.general,mindset:s.general.mindset+6}})},
            {text:'想清楚了，还是分开更合适',resultDescription:'你们把决定说清楚了。难过是真的，互相喜欢过也是真的，不必给其中一个人安排反派身份。',action:s=>({romancePartner:null,flags:{...s.flags,romance_resolution:'separated',romance_tension:'resolved',ready_for_confession:false},general:{...s.general,mindset:s.general.mindset-8},activeStatuses:s.activeStatuses.filter(st=>st.id!=='in_love')})}
        ]
    },
    {
        id:'romance_year_note',title:'夹在书里的纸条',type:'positive',triggerType:'CONDITIONAL',once:true,
        condition:s=>!!s.romancePartner&&s.phase===Phase.SUMMER_BREAK,
        description:s=>`${s.romancePartner}在还你的书里夹了一张纸条：“下学期也一起走一段吧。”下面又添了一行：“作业各写各的，这个不商量。”`,
        choices:[{text:'回一句：好，作业除外',resultDescription:'你把纸条收好了。这一年没有每天都像电影，但那些普通的放学路，确实是两个人一起走的。',action:s=>({flags:{...s.flags,romance_year_memory:true},general:{...s.general,mindset:s.general.mindset+6}})}]
    }
];
