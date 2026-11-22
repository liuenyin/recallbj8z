import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import overrides from '../data/en-overrides.json';
import { RELATIONSHIP_NICKNAMES } from '../data/campus_names';

export type Language = 'zh' | 'en';
export type Translate = <T>(value: T) => T;

type Catalog = Record<string, string>;
const han = /\p{Script=Han}/u;
const argument = /\{(\d+)\}/g;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const makeTranslator = (catalog: Catalog): Translate => {
    const exact = new Map(Object.entries({ ...catalog, ...overrides }));
    const relationshipNames = [...Object.values(RELATIONSHIP_NICKNAMES), '对方'];
    const templates = [...exact].flatMap(([source, target]) => {
        const pieces = source.split(argument);
        if (pieces.length < 3) return [];
        const indexes: number[] = [];
        const literal = pieces.filter((_, index) => index % 2 === 0).join('');
        if (!han.test(literal)) return [];
        const pattern = pieces.map((piece, index) => {
            if (index % 2 === 0) return escapeRegex(piece).replace(/ /g, '\\s*');
            indexes.push(Number(piece));
            return '([\\s\\S]*?)';
        }).join('');
        return [{ regex: new RegExp('^' + pattern + '$'), target, indexes, length: literal.length }];
    }).sort((left, right) => right.length - left.length);
    const cache = new Map<string, string>();

    const translate = (text: string, depth = 0): string => {
        if (depth > 5 || !han.test(text)) return text;
        const source = text.trim();
        const fixed = exact.get(source);
        if (fixed !== undefined) return text.replace(source, () => fixed);
        for (const name of relationshipNames) {
            if (!source.includes(name)) continue;
            const dialogue = exact.get(source.replaceAll(name, 'TA'));
            if (dialogue) return dialogue.replace(/\bTA\b/g, exact.get(name) ?? name);
        }
        const stat = /^(.+?)\s*([+-]\d+(?:\.\d+)?|上升|提升|增加|下降|降低|减少)$/.exec(source);
        if (stat) {
            const label = exact.get(stat[1]) ?? exact.get(stat[1].replace(/能力$/, ''));
            if (label) return `${label} ${exact.get(stat[2]) ?? stat[2]}`;
        }
        const proficiency = /^(.+?)(不合格|合格)$/.exec(source);
        if (proficiency && exact.has(proficiency[1])) return `${exact.get(proficiency[1])}: ${exact.get(proficiency[2])}`;
        const timetableRow = /^\[([^\]]+)\]\s*(.+?)：(.+)$/.exec(source);
        if (timetableRow) {
            const [, slot, activity, result] = timetableRow.map(piece => piece === source ? piece : translate(piece, depth + 1));
            return `[${slot}] ${activity}: ${result}`;
        }
        for (const { regex, target, indexes } of templates) {
            const match = regex.exec(source);
            if (!match) continue;
            const values = new Map(indexes.map((index, position) => [index, translate(match[position + 1], depth + 1)]));
            return text.replace(source, () => target.replace(argument, (placeholder, index) => values.get(Number(index)) ?? placeholder).trim());
        }
        if (source.includes('\n')) return text.split('\n').map(line => translate(line, depth + 1)).join('\n');
        const parts = source.split(/([；、，。])/);
        if (parts.length > 1) {
            const translated = parts.map(part => translate(part, depth + 1));
            if (translated.every(part => !han.test(part))) {
                return translated.map(part => ({ '；': '. ', '、': ', ', '，': ', ', '。': '. ' })[part] ?? part).join('').trim();
            }
        }
        if (source.startsWith('✓ ') || source.startsWith('• ')) return source.slice(0, 2) + translate(source.slice(2), depth + 1);
        return text;
    };
    return <T,>(value: T): T => {
        if (typeof value !== 'string' || !han.test(value)) return value;
        const translated = cache.get(value) ?? translate(value);
        if (cache.size >= 1000) cache.clear();
        cache.set(value, translated);
        return translated as T;
    };
};

const identity: Translate = value => value;
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: Translate }>({
    language: 'zh', setLanguage: () => {}, t: identity
});
const STORAGE_KEY = 'recall_language_v1';

const initialLanguage = (): Language => {
    const parameter = new URLSearchParams(window.location.search).get('lang');
    if (parameter === 'en' || parameter === 'zh') return parameter;
    try {
        return (localStorage.getItem(STORAGE_KEY) || localStorage.getItem('recall_exhibition_language')) === 'en' ? 'en' : 'zh';
    } catch {
        return 'zh';
    }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [requested, setRequested] = useState<Language>(initialLanguage);
    const [english, setEnglish] = useState<Translate | null>(null);
    useEffect(() => {
        if (requested !== 'en' || english) return;
        let active = true;
        import('../data/en.generated.json').then(module => {
            if (active) setEnglish(() => makeTranslator(module.default));
        }).catch(() => {
            if (active) setRequested('zh');
        });
        return () => { active = false; };
    }, [requested, english]);

    const language: Language = requested === 'en' && english ? 'en' : 'zh';
    const context = useMemo(() => ({
        language,
        t: language === 'en' && english ? english : identity,
        setLanguage: (next: Language) => {
            setRequested(next);
            try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the current session usable. */ }
            const url = new URL(window.location.href);
            if (url.searchParams.has('lang')) {
                url.searchParams.set('lang', next);
                window.history.replaceState(null, '', url);
            }
        }
    }), [language, english]);

    useEffect(() => {
        document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
        document.title = language === 'en' ? 'Beijing No. 8 High School Simulator' : '八中重开模拟器';
    }, [language]);

    return <LanguageContext.Provider value={context}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
