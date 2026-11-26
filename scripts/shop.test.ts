import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mechanicsSource = fs.readFileSync(new URL('../data/mechanics.ts', import.meta.url), 'utf8');
const shopSource = mechanicsSource.split('// --- Shop Items ---')[1].split('// --- Achievements ---')[0];

test('shop effects do not charge money themselves', () => {
  assert.doesNotMatch(shopSource, /money\s*:/, 'shop effects must not define a money field');
  assert.doesNotMatch(shopSource, /money\s*=/, 'shop effects must not assign money');
});

test('shop lists the expected starting prices', () => {
  assert.match(shopSource, /id: 'red_bull'[\s\S]*?price:\s*38/);
  assert.match(shopSource, /id: 'coffee'[\s\S]*?price:\s*20/);
  assert.match(shopSource, /id: 'flowers'[\s\S]*?price:\s*38/);
  assert.match(shopSource, /id: 'gym_card'[\s\S]*?price:\s*65/);
});
