import test from 'node:test';
import assert from 'node:assert/strict';
import { getAccounts, createLocalAccount, deleteLocalAccount, setActiveAccountId, getActiveAccountId, getAccountSaveKey } from '../lib/accounts.ts';
import { restoreExamResult, restoreWorldContext, restoreFlags } from '../lib/save_validation.ts';

const storage = () => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key)
  }});
  return entries;
};
test('accounts recover guest and discard duplicate or malformed entries', () => {
  const entries = storage();
  entries.set('recall_accounts_v1', JSON.stringify([{id:'x',name:'A',createdAt:1},{id:'x',name:'B',createdAt:2},{id:'',name:'',createdAt:0}]));
  assert.deepEqual(getAccounts().map(a => a.id), ['guest', 'x']);
});
test('deleting the active account resets persisted selection and preserves other saves', () => {
  const entries = storage();
  const account = createLocalAccount('测试');
  entries.set(getAccountSaveKey(account.id), 'progress');
  entries.set(getAccountSaveKey('guest'), 'guest progress');
  deleteLocalAccount(account.id);
  assert.equal(getActiveAccountId(), 'guest');
  assert.equal(entries.get('recall_active_account_v1'), 'guest');
  assert.equal(entries.has(getAccountSaveKey(account.id)), false);
  assert.equal(entries.get(getAccountSaveKey('guest')), 'guest progress');
});
test('failed writes report errors instead of claiming creation or switching succeeded', () => {
  storage();
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => createLocalAccount('失败'), /保存失败/);
  assert.throws(() => setActiveAccountId('guest'), /切换失败/);
  assert.throws(() => setActiveAccountId('unknown'), /不存在/);
});
test('exam restoration rejects crash-causing shapes and recomputes totals', () => {
  assert.equal(restoreExamResult({title:'考试',comment:'',scores:null,totalScore:0}), null);
  assert.equal(restoreExamResult({title:'考试',comment:'',scores:{math:{}},totalScore:0}), null);
  assert.equal(restoreExamResult({title:'考试',comment:'',scores:{math:151},totalScore:0}), null);
  assert.equal(restoreExamResult({title:'考试',comment:'',scores:{math:120,physics:80},totalScore:999})?.totalScore, 200);
});
test('world restoration validates city paths and corrects derived metadata', () => {
  const regions = [{code:'bj',name:'北京'}];
  assert.equal(restoreWorldContext({code:'../private',yearStart:2020}, regions, []), undefined);
  assert.deepEqual(restoreWorldContext({code:'bj',region:{},yearStart:2020,yearEnd:9999}, regions, []),
    {code:'bj',region:'北京',yearStart:2020,yearEnd:2023,characterTemplateId:'t_ordinary'});
  assert.deepEqual(restoreFlags({relationship_name:{bad:true},mo_team:true,score:5}), {mo_team:true,score:5});
});

test('creating an account rolls back the new profile if selection cannot persist', () => {
  storage();
  const setItem = localStorage.setItem;
  localStorage.setItem = (key, value) => {
    if (key === 'recall_active_account_v1') throw new Error('selection write failed');
    setItem(key, value);
  };
  assert.throws(() => createLocalAccount('未完成'), /切换失败/);
  assert.deepEqual(getAccounts().map(a => a.id), ['guest']);
});
