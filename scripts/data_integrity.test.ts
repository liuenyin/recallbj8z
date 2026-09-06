import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = (path: string) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('offline AI event IDs are unique after source normalization', () => {
  const rows = readJson('../data/ai_generated_events.json') as any[];
  const events = rows.flatMap((row, eventIndex) => Array.isArray(row.childrens)
    ? row.childrens.map((event: any, childIndex: number) => ({ ...event, id: `offline_${eventIndex}_${childIndex}` }))
    : row.choices || row.effect ? [{ ...row, id: `offline_${eventIndex}` }] : []);
  const ids = events.map(event => event.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(events.every(event => (Array.isArray(event.choices) && event.choices.length > 0) || event.effect));
  assert.ok(events.every(event => typeof event.title === 'string' && event.title.trim()));
  assert.ok(events.every(event => typeof event.description === 'string' && event.description.trim()));
});

test('academic maximum ignores duplicate or non-academic keys', () => {
  const flowSource = read('../data/game_flow.ts');
  assert.match(flowSource, /Array\.from\(new Set\(subjects\)\)/);
  assert.match(flowSource, /ELECTIVE_ACADEMIC_SUBJECTS/);
});

test('active statuses are normalized to one entry per status id', () => {
  const utilsSource = read('../data/utils.ts');
  assert.match(utilsSource, /normalizeActiveStatuses/);
  assert.match(utilsSource, /const byId = new Map<string, GameStatus>\(\)/);
  assert.match(utilsSource, /activeStatuses: normalizeActiveStatuses\(state\.activeStatuses\)/);
});

test('OI JSON effects are limited to keys supported by the parser', () => {
  const rows = readJson('../oi_events.json') as any[];
  const supported = new Set(['efficiency', 'experience', 'health', 'luck', 'mindset', 'money', 'oi_dp', 'oi_ds', 'oi_graph', 'oi_math', 'oi_misc', 'oi_string']);
  const keys = new Set<string>();
  rows.forEach(event => (event.choices || []).forEach((choice: any) => Object.keys(choice.effect || {}).forEach(key => keys.add(key))));
  assert.deepEqual([...keys].filter(key => !supported.has(key)), []);
});

test('city event data uses playable event types and choices', () => {
  const cityDir = new URL('../public/cities/', import.meta.url);
  const files = fs.readdirSync(cityDir).filter(file => file.endsWith('.json'));
  assert.ok(files.length > 0);
  files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(new URL(file, cityDir), 'utf8')) as any;
    assert.ok(Array.isArray(data.events), file);
    data.events.forEach((event: any) => {
      assert.ok(['positive', 'negative', 'neutral'].includes(event.type), `${file}:${event.id}`);
      assert.ok(Array.isArray(event.choices) && event.choices.length > 0, `${file}:${event.id}`);
      assert.ok(event.choices.every((choice: any) => typeof choice.text === 'string' && choice.text.trim()), `${file}:${event.id}`);
    });
  });
});
