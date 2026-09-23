import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
const executablePath=process.env.CHROME_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/chromium'].find(existsSync);
const browser=await puppeteer.launch({executablePath,headless:true});
try {
 mkdirSync('artifacts',{recursive:true});
 const page=await browser.newPage();await page.setViewport({width:390,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:3000/');
 const results=await page.evaluate(async()=>{
  const {default:React}=await import('/node_modules/.vite/deps/react.js');
  const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');
  const {default:{flushSync}}=await import('/node_modules/.vite/deps/react-dom.js');
  const {useGameLogic}=await import('/hooks/useGameLogic.ts');
  const {ROMANCE_EVENTS}=await import('/data/events_romance.ts');
  const {PHASE_EVENTS,CHAINED_EVENTS}=await import('/data/events.ts');
  const {RELATIONSHIP_PROFILES,getRelationshipStage}=await import('/data/relationships.ts');
  const {getEndingMemories}=await import('/data/ending.ts');
  const {isQueuedEventStillEligible}=await import('/data/game_flow.ts');
  let game;function Harness(){game=useGameLogic(undefined,'romance-regression');return null;}
  const root=createRoot(document.body.appendChild(document.createElement('div')));flushSync(()=>root.render(React.createElement(Harness)));
  const initial=game.state, checks=[];
  const event=id=>ROMANCE_EVENTS.find(e=>e.id===id)||CHAINED_EVENTS[id];
  function choose(s,id,index=0){flushSync(()=>game.setState({...s,isPlaying:false,isWeekend:false,currentEvent:event(id),eventResult:null,chainedEvent:null,eventQueue:[]}));flushSync(()=>game.handleChoice(event(id).choices[index]));return game.state;}
  for(const profile of RELATIONSHIP_PROFILES){
    let s={...initial,phase:'SEMESTER_2',week:18,relationshipProfileId:profile.id,flags:{relationship_name:profile.name,ta_favorability:75}};
    const personal=event('romance_personal_moment');checks.push([profile.name+' has distinct scene',personal.description(s).includes(profile.name)]);
    s=choose(s,personal.id);s=choose(s,'romance_confession_prep');
    checks.push(['no same-week confession',!event('romance_confession').condition(s)]);
    s={...s,phase:'SUMMER_BREAK',week:1};checks.push(['promise crosses semesters',event('romance_confession').condition(s)]);
    s=choose(s,'romance_confession');checks.push(['shared history accepted',s.chainedEvent.id==='sum_confess_success']);
    s=choose(s,'sum_confess_success');checks.push(['named partner',s.romancePartner===profile.name&&!s.flags.ready_for_confession]);
    s={...s,week:2};checks.push(['date delayed',event('romance_dating_park').condition(s)]);
    s=choose({...s,general:{...s.general,money:0}},'romance_dating_park',1);checks.push(['free date',s.general.money===0&&s.flags.romance_date_memory==='walk']);
    checks.push(['conflict delayed',!event('romance_missed_message').condition(s)]);
    s=choose({...s,week:3},'romance_missed_message',1);checks.push(['tension shown',getRelationshipStage(s)==='有些话还没说开']);
    s={...s,week:4};checks.push(['repair offered',event('romance_repair').condition(s)]);
    const repaired=choose(s,'romance_repair');checks.push(['repair keeps partner',repaired.romancePartner===profile.name&&repaired.flags.romance_communication&&getEndingMemories(repaired).some(m=>m.includes('没说完'))]);
    const split=choose(s,'romance_repair',1);checks.push(['separation honored',!split.romancePartner&&getRelationshipStage(split)==='各自往前走'&&!event('romance_confession_prep').condition(split)]);
  }
  let rejected=choose({...initial,phase:'SEMESTER_1',week:21,flags:{relationship_name:'林夏',ta_favorability:50}},'sum_confess_fail');
  checks.push(['failure recorded once',rejected.rejectionCount===1&&getRelationshipStage(rejected)==='正在整理心情']);
  checks.push(['aftermath delayed',!event('romance_after_rejection').condition(rejected)]);
  rejected={...rejected,phase:'WINTER_BREAK',week:1};checks.push(['aftermath survives break',event('romance_after_rejection').condition(rejected)]);
  const friends=choose(rejected,'romance_after_rejection');const distance=choose(rejected,'romance_after_rejection',1);
  checks.push(['friends no new confession',!PHASE_EVENTS.SEMESTER_1.find(e=>e.id==='evt_confession_generic').condition(friends)]);
  checks.push(['stale flirt discarded',!isQueuedEventStillEligible(event('romance_first_encounter'),friends)]);
  checks.push(['friend followup',event('romance_friend_callback').condition({...friends,week:2})]);
  checks.push(['space followup',event('romance_space_callback').condition({...distance,week:2})]);
  const recovered=choose({...distance,week:2},'romance_space_callback');checks.push(['space ending memory',getEndingMemories(recovered).some(m=>m.includes('称号已过期'))]);
  flushSync(()=>game.setState({...friends,week:2,currentEvent:null,eventResult:null,isWeekend:true,isPlaying:false}));
  flushSync(()=>game.saveGame());flushSync(()=>game.setState(initial));flushSync(()=>game.loadGame('manual'));
  checks.push(['restore friendship and followup',game.state.flags.romance_resolution==='friends'&&event('romance_friend_callback').condition(game.state)]);
  const old={...initial,phase:'SEMESTER_2',week:19,flags:{relationship_name:'陈默',ready_for_confession:true,ta_favorability:80}};
  checks.push(['old invitation still reachable',event('romance_confession').condition(old)]);
  const {default:EventModal}=await import('/components/EventModal.tsx');
  document.getElementById('root').style.display='none';
  flushSync(()=>root.render(React.createElement(EventModal,{event:event('romance_after_rejection'),state:rejected,eventResult:null,autoContinueEnabled:false,onChoice:()=>{},onConfirm:()=>{}})));
  return checks;
 });
 for(const [name,ok] of results)assert.ok(ok,name);
 await page.waitForFunction(()=>document.body.innerText.includes('好人卡的售后服务')&&[...document.querySelectorAll('.animate-fadeIn')].filter(el=>el.getClientRects().length).every(el=>getComputedStyle(el).opacity==='1'));
 await page.waitForFunction(()=>[...document.querySelectorAll('div[style]')].filter(el=>el.getClientRects().length && el.style.opacity).every(el=>Number(getComputedStyle(el).opacity)>0.99));
 await page.screenshot({path:'artifacts/romance-aftermath-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log(`PASS ${results.length} romance checks: four profiles, delayed promises, success, rejection, friendship, space, repair, separation and saves`);
}finally{await browser.close();}
