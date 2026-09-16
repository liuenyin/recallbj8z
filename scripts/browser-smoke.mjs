import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
const executablePath = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome'
].find(existsSync);
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome/Chromium executable.');
const base = process.env.SMOKE_URL || 'http://127.0.0.1:3000/';
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(new URL(base).origin) || request.url().startsWith('data:') ? request.continue() : request.abort());
  const clickText = async (text) => {
    await page.waitForFunction(text => [...document.querySelectorAll('button')].some(b => !b.disabled && b.getClientRects().length && b.textContent.includes(text)), {}, text);
    const handle = await page.evaluateHandle(text => [...document.querySelectorAll('button')].find(b => !b.disabled && b.getClientRects().length && b.textContent.includes(text)), text);
    await handle.asElement().click();
    await handle.dispose();
  };
  await page.goto(base, {waitUntil:'networkidle0'});
  assert.ok(await page.evaluate(() => document.body.innerText.includes('八中')));
  assert.equal(await page.$eval('button.rounded-2xl', el => getComputedStyle(el).borderRadius), '16px');
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.fonts.check('900 16px "Font Awesome 6 Free"')));
  await page.setViewport({width:390,height:844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  mkdirSync('artifacts', {recursive:true});
  await page.screenshot({path:'artifacts/review-home-mobile.png',fullPage:true});
  await page.setViewport({width:1280,height:900});
  console.log('PASS: home, local styles/icons, mobile width with external network blocked');
  await clickText('账号与存档');
  await page.type('input[placeholder="例如：高一重开"]', '浏览器测试');
  await clickText('创建');
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('recall_accounts_v1')).some(a => a.name === '浏览器测试')));
  await page.reload({waitUntil:'networkidle0'});
  await clickText('开启新学期');
  await clickText('入学吧');
  await clickText('专注课内综合');
  await clickText('确认结果');
  await page.waitForFunction(() => !document.body.innerText.includes('暑假的抉择'));
  assert.deepEqual(errors, []);
  console.log('PASS: fresh game, talent confirmation and first event settlement');
  // Corrupt optional fields must not take down an otherwise recoverable save.
  await page.evaluate(() => {
    const id = localStorage.getItem('recall_active_account_v1');
    localStorage.setItem(`recall_save_v1_${id}`, JSON.stringify({version:3,state:{
      phase:'SEMESTER_1',week:3,totalWeeksInPhase:20,general:{health:80,efficiency:15},subjects:{},
      isPlaying:false,isWeekend:true,hasSelectedClub:true,className:{bad:true},
      lastWeekSchedule:{Sat_Aft:'w_library',Sun_Aft:'w_game'},
      history:[{phase:'SUMMER',week:1,eventTitle:'暑假的抉择',choiceText:'专注课内综合',resultSummary:'新生活开始了。',timestamp:1}],
      popupExamResult:{title:'bad',scores:null,totalScore:1,comment:''},
      achievementPopup:{title:{bad:true}},worldContext:{code:'../bad',region:{}},
      flags:{relationship_name:{bad:true}},talents:[{id:'nonexistent',name:{bad:true}}]
    }}));
  });
  await page.reload({waitUntil:'networkidle0'});
  await clickText('继续');
  await page.waitForFunction(() => document.body.innerText.includes('周'));
  await page.waitForFunction(() => [...document.querySelectorAll('.animate-fadeIn')].every(el => getComputedStyle(el).opacity === '1'));
  await page.screenshot({path:'artifacts/review-game.png',fullPage:true});
  assert.deepEqual(errors, []);
  console.log('PASS: account creation and malformed optional save recovery without render errors');
  await clickText('清空安排');
  assert.ok(await page.evaluate(() => document.body.innerText.includes('0 项可执行')));
  await clickText('恢复上次');
  assert.ok(await page.evaluate(() => document.body.innerText.includes('2 项可执行')));
  await page.setViewport({width:390,height:844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({path:'artifacts/planner-mobile.png',fullPage:true});
  await page.setViewport({width:1280,height:900});
  console.log('PASS: planner clear/restore and mobile layout');
  const activityResult = await page.evaluate(async () => {
    const {getWeekendActivityUpdates} = await import('/data/utils.ts');
    const {WEEKEND_ACTIVITIES} = await import('/data/mechanics.ts');
    const state = {difficulty:'NORMAL',fatigue:30,general:{health:80,mindset:50,efficiency:15,excitement:30}};
    const game = WEEKEND_ACTIVITIES.find(a => a.id === 'w_game');
    const sleep = WEEKEND_ACTIVITIES.find(a => a.id === 'w_sleep');
    const before = JSON.stringify(state);
    const preview = getWeekendActivityUpdates(state,game,2,true);
    const actual = getWeekendActivityUpdates(state,game,2);
    let randomized = 0;
    const simulated = {...game, action: () => { randomized++; return {}; }, previewAction: () => ({})};
    getWeekendActivityUpdates(state,simulated,1,true);
    return {equal:JSON.stringify(preview) === JSON.stringify(actual),excitement:actual.general.excitement,
      efficiency:actual.general.efficiency,recovery:getWeekendActivityUpdates(state,sleep,1).fatigue < state.fatigue,
      unchanged:JSON.stringify(state) === before,randomized};
  });
  assert.deepEqual(activityResult,{equal:true,excitement:40.2,efficiency:14,recovery:true,unchanged:true,randomized:0});
  console.log('PASS: shared activity preview, repeat gains, unchanged costs and deterministic projection');
  await clickText('执行本周计划');
  await page.waitForFunction(() => document.body.innerText.includes('【本周计划】'));
  await page.evaluate(() => [...document.querySelectorAll('summary')].find(el => el.textContent.includes('展开安排')).click());
  assert.ok(await page.evaluate(() => document.body.innerText.includes('[周六下午]')));
  console.log('PASS: executing the restored plan advances the week and records its activities');
  await clickText('保存');
  const manualBefore = await page.evaluate(() => JSON.parse(localStorage.getItem(
    `recall_save_v1_${localStorage.getItem('recall_active_account_v1')}_manual`)).state);
  await clickText('历程');
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = blob => { window.diaryText = blob.text(); return original(blob); };
    document.addEventListener('click', event => {
      if (event.target instanceof HTMLAnchorElement && event.target.download) event.preventDefault();
    });
  });
  await clickText('导出这段经历');
  const diary = await page.evaluate(() => window.diaryText);
  assert.ok(diary.includes('入学前的暑假 · 第 1 周｜暑假的抉择'));
  assert.ok(diary.includes('我的选择：专注课内综合'));
  assert.ok(!diary.includes('SEMESTER_1'));
  console.log('PASS: Chinese phases and downloadable campus diary');
  // Test the actual AI client in the browser against mocked server responses.
  const aiResult = await page.evaluate(async () => {
    const ai = await import('/lib/gemini.ts');
    const config = {...ai.DEFAULT_AI_CONFIG,enabled:true};
    const state = {subjects:{},general:{},history:[],flags:{},activeStatuses:[],talents:[],phase:'SUMMER',week:1};
    const event = {title:'测试',description:'测试事件',choices:[{text:'A',effect:{health:999}},{text:'B',effect:{health:-999}}]};
    const originalFetch = window.fetch;
    const originalSet = Storage.prototype.setItem;
    try {
      window.fetch = async () => new Response(JSON.stringify({choices:[{message:{content:JSON.stringify([event])}}]}));
      let rejected = false;
      try { await ai.generateBatchGameEvents(state,config); } catch { rejected = true; }
      window.fetch = async () => new Response(JSON.stringify({choices:[{message:{content:JSON.stringify([event,event])}}]}));
      const batch = await ai.generateBatchGameEvents(state,config);
      Storage.prototype.setItem = () => { throw new Error('quota'); };
      let storageError = false;
      try { ai.saveAiConfig(config); } catch { storageError = true; }
      return {rejected,storageError,health:batch[0].choices[0].effect.health};
    } finally { window.fetch = originalFetch; Storage.prototype.setItem = originalSet; }
  });
  assert.deepEqual(aiResult, {rejected:true,storageError:true,health:20});
  assert.deepEqual(errors, []);
  console.log('PASS: AI event count, bounded effects and configuration write failure');
  await page.evaluate(() => {
    const key = `recall_save_v1_${localStorage.getItem('recall_active_account_v1')}`;
    localStorage.setItem(key, JSON.stringify({version:3,state:{
      phase:'SEMESTER_1',week:6,general:{health:80,mindset:70},subjects:{},
      isPlaying:false,isWeekend:false,hasSelectedClub:true,currentEvent:'campus_borrow_pen',eventQueue:[]
    }}));
  });
  await page.reload({waitUntil:'networkidle0'});
  await clickText('继续');
  await clickText('借用备用笔');
  await clickText('改为手动继续');
  await new Promise(resolve => setTimeout(resolve, 3500));
  assert.ok(await page.evaluate(() => document.body.innerText.includes('确认结果')));
  assert.equal(await page.evaluate(() => localStorage.getItem('recall_auto_continue_v1')), 'false');
  await clickText('恢复自动继续');
  await page.waitForFunction(() => document.body.innerText.includes('片刻后自动继续'));
  await page.waitForFunction(() => document.body.innerText.includes('周计划时间表'));
  const automaticSave = await page.evaluate(() => JSON.parse(localStorage.getItem(
    `recall_save_v1_${localStorage.getItem('recall_active_account_v1')}`)).state);
  assert.equal(automaticSave.history.filter(entry => entry.eventTitle === '借一支笔').length, 1);
  assert.equal(automaticSave.currentEvent, null);
  await page.reload({waitUntil:'networkidle0'});
  await clickText('继续');
  await page.waitForFunction(() => document.body.innerText.includes('周计划时间表'));
  const resumedSave = await page.evaluate(() => JSON.parse(localStorage.getItem(
    `recall_save_v1_${localStorage.getItem('recall_active_account_v1')}`)).state);
  assert.deepEqual(resumedSave.history, automaticSave.history);
  assert.deepEqual(resumedSave.general, automaticSave.general);
  console.log('PASS: daily scene auto-continues, autosaves, and reloads without repeating its reward');
  await page.reload({waitUntil:'networkidle0'});
  await clickText('读取手动存档');
  await page.waitForFunction(() => document.body.innerText.includes('高一上学期'));
  const manualAfter = await page.evaluate(() => JSON.parse(localStorage.getItem(
    `recall_save_v1_${localStorage.getItem('recall_active_account_v1')}`)).state);
  assert.equal(manualAfter.week, manualBefore.week);
  assert.deepEqual(manualAfter.subjects, manualBefore.subjects);
  assert.ok(manualAfter.log.some(entry => entry.details?.some(line => line.includes('上图书馆'))));
  console.log('PASS: home restores the independent manual save and retains expanded plan details');
  await page.evaluate(() => {
    const key = `recall_save_v1_${localStorage.getItem('recall_active_account_v1')}`;
    localStorage.setItem(key, '{broken-json');
  });
  await page.reload({waitUntil:'networkidle0'});
  await clickText('继续');
  assert.ok(await page.evaluate(() => {
    const key = `recall_save_v1_${localStorage.getItem('recall_active_account_v1')}`;
    return localStorage.getItem(key) === null && localStorage.getItem(key + '_corrupt_backup') === '{broken-json';
  }));
  assert.deepEqual(errors, []);
  console.log('PASS: unreadable save is backed up before removal');
} finally { await browser.close(); }
