import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mechanicsSource = fs.readFileSync(new URL('../data/mechanics.ts', import.meta.url), 'utf8');
const shopSource = mechanicsSource.split('// --- Shop Items ---')[1].split('// --- Achievements ---')[0];

test('shop effects do not charge money themselves', () => {
  assert.doesNotMatch(shopSource, /money\s*:/, 'shop effects must not define a money field');
  assert.doesNotMatch(shopSource, /money\s*=/, 'shop effects must not assign money');
});

test('shop price multiplier is normal in regular play and doubles in hell', () => {
  const constantsSource = fs.readFileSync(new URL('../data/constants.ts', import.meta.url), 'utf8');
  assert.match(constantsSource, /shopPriceMultiplier:\s*2/);
  assert.match(shopSource, /id: 'red_bull'[\s\S]*?price:\s*150/);
  assert.match(shopSource, /id: 'coffee'[\s\S]*?price:\s*20/);
});
