import type { ExamResult, WorldContext } from '../types';

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const restoreExamResult = (value: unknown): ExamResult | null => {
  if (!record(value) || typeof value.title !== 'string' || typeof value.comment !== 'string'
      || !record(value.scores) || !Number.isFinite(value.totalScore)) return null;
  const entries = Object.entries(value.scores);
  if (!entries.length || entries.some(([key, score]) =>
      !/^(chinese|math|english|physics|chemistry|biology|history|geography|politics|oi_prob_[1-8])$/.test(key)
      || typeof score !== 'number' || !Number.isFinite(score) || score < 0
      || score > (['chinese', 'math', 'english'].includes(key) ? 150 : 100))) return null;
  return {
    title: value.title.slice(0, 120), comment: value.comment.slice(0, 500),
    scores: Object.fromEntries(entries) as Record<string, number>,
    totalScore: entries.reduce((sum, [, score]) => sum + (score as number), 0),
    type: value.type === 'COMPETITION' ? 'COMPETITION' : 'ACADEMIC',
    rank: typeof value.rank === 'number' && Number.isFinite(value.rank) && value.rank > 0 ? Math.floor(value.rank) : undefined,
    totalStudents: typeof value.totalStudents === 'number' && Number.isFinite(value.totalStudents) && value.totalStudents > 0 ? Math.floor(value.totalStudents) : undefined
  };
};

export const restoreWorldContext = (
  value: unknown,
  regions: readonly { code: string; name: string }[],
  templates: readonly { id: string }[]
): WorldContext | undefined => {
  if (!record(value)) return undefined;
  const region = regions.find(region => region.code === value.code);
  if (!region || typeof value.yearStart !== 'number' || !Number.isInteger(value.yearStart)
      || value.yearStart < 2016 || value.yearStart > 2024) return undefined;
  return {
    code: region.code, region: region.name, yearStart: value.yearStart, yearEnd: value.yearStart + 3,
    characterTemplateId: templates.find(template => template.id === value.characterTemplateId)?.id ?? 't_ordinary'
  };
};

export const restoreFlags = (value: unknown): Record<string, string | number | boolean | null> =>
  record(value) ? Object.fromEntries(Object.entries(value).filter(([key, entry]) =>
    !['__proto__', 'constructor', 'prototype'].includes(key)
    && (entry === null || typeof entry === 'string' || typeof entry === 'boolean'
      || typeof entry === 'number' && Number.isFinite(entry)))) as Record<string, string | number | boolean | null> : {};
