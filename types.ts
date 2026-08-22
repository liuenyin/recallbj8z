export enum Phase {
  INIT = 'INIT',
  SUMMER = 'SUMMER',
  MILITARY = 'MILITARY',
  SELECTION = 'SELECTION',
  PLACEMENT_EXAM = 'PLACEMENT_EXAM',
  SEMESTER_1 = 'SEMESTER_1',
  MIDTERM_EXAM = 'MIDTERM_EXAM',
  SUBJECT_RESELECTION = 'SUBJECT_RESELECTION',
  CSP_EXAM = 'CSP_EXAM',
  NOIP_EXAM = 'NOIP_EXAM',
  FINAL_EXAM = 'FINAL_EXAM',
  MIDTERM_EXAM_2 = "MIDTERM_EXAM_2",
  FINAL_EXAM_2 = "FINAL_EXAM_2",
  WINTER_BREAK = 'WINTER_BREAK',
  SEMESTER_2 = 'SEMESTER_2',
  SUMMER_BREAK = 'SUMMER_BREAK',
  WC_EXAM = 'WC_EXAM',
  PROVINCIAL_EXAM = 'PROVINCIAL_EXAM',
  APIO_EXAM = 'APIO_EXAM',
  NOI_EXAM = 'NOI_EXAM',
  ENDING = 'ENDING',
  WITHDRAWAL = 'WITHDRAWAL'
}

export type SubjectKey = 'chinese' | 'math' | 'english' | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography' | 'politics';

export interface SubjectStats {
  aptitude: number;
  level: number;
}

export interface ContestRecord {
    name: string;
    date: number;
    perf: number;
    ratingChange: number;
    newRating: number;
    rank?: string;
}

export interface OIStats {
    dp: number;
    ds: number;
    math: number;
    string: number;
    graph: number;
    misc: number;
    rating?: number;
    history?: ContestRecord[];
}

export interface GeneralStats {
  mindset: number;
  experience: number;
  luck: number;
  romance: number;
  health: number;
  money: number;
  efficiency: number;
}

export interface StoryEntry {
  week: number;
  phase: Phase;
  eventTitle: string;
  choiceText: string;
  resultSummary: string;
  timestamp: number;
}

export type CompetitionType = 'None' | 'OI' | 'MO' | 'PhO' | 'ChO';

export interface CompetitionResultData {
    title: string;
    score: number;
    award: string;
}

export type Difficulty = 'CUSTOM' | 'NORMAL' | 'HARD' | 'REALITY' ;

export interface AiConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  unlockedAt?: number; 
}

export interface GameStatus {
  id: string;
  name: string;
  description: string;
  type: 'BUFF' | 'DEBUFF' | 'NEUTRAL';
  duration: number; 
  icon: string;
  effectDescription?: string; 
}

export type ClubId = 'rap' | 'dance' | 'social_science' | 'mun' | 'touhou' | 'astronomy' | 'math_research' | 'ttrpg' | 'literature' | 'otaku' | 'anime' | 'volleyball' | 'vocaloid' | 'poetry' | 'human_behavior' | 'none';

export interface Club {
    id: ClubId;
    name: string;
    description: string;
    icon: string;
    effectDescription: string;
    action: (state: GameState) => Partial<GameState>;
}

export interface WeekendActivity {
    id: string;
    name: string;
    icon: string;
    type: 'REST' | 'STUDY' | 'SOCIAL' | 'OI' | 'LOVE' | 'PROJECT';
    description?: string; 
    resultText: string | ((state: GameState) => string); 
    condition?: (state: GameState) => boolean;
    action: (state: GameState) => Partial<GameState>;
}

export interface Talent {
    id: string;
    name: string;
    description: string;
    rarity: 'common' | 'rare' | 'legendary' | 'mythical' | 'cursed';
    cost: number; 
    effect?: (state: GameState) => Partial<GameState>; 
}

export interface Item {
    id: string;
    name: string;
    description: string;
    price: number;
    icon: string;
    effect: (state: GameState) => Partial<GameState>;
}

export type Theme = 'light' | 'dark';

export interface Challenge {
    id: string;
    title: string;
    description: string;
    conditions: {
        initialStats?: Partial<GeneralStats>;
    };
}

export interface SerializableEffect {
    mindset?: number;
    health?: number;
    money?: number;
    efficiency?: number;
    romance?: number;
    experience?: number;
    luck?: number;
    fatigue?: number;
    subjects?: Partial<Record<SubjectKey, number>>; 
    oiStats?: Partial<OIStats>;
    romancePartner?: string; 
}

export interface AiGeneratedEventChoice {
    text: string;
    effect: SerializableEffect;
    resultDescription: string;
}

export interface AiGeneratedEvent {
    title: string;
    description: string;
    type: 'positive' | 'negative' | 'neutral';
    choices: AiGeneratedEventChoice[];
}

export interface Project {
    id: string;
    title: string;
    description: string;
    type: 'ACADEMIC' | 'CLUB' | 'PERSONAL' | 'EVENT' | 'OI';
    deadlinePhase: Phase;
    deadlineWeek: number;
    progress: number;
    requiredProgress: number;
    rewardsDescription: string;
    onComplete?: (state: GameState) => Partial<GameState>;
    onFail?: (state: GameState) => Partial<GameState>;
}

export interface WorldContext {
  region: string;
  code: string;
  yearStart: number;
  yearEnd: number;
  characterTemplateId: string;
}

export interface RelationshipProfile {
  id: string;
  name: string;
  role: string;
  personality: string;
  routeHint: string;
}

export interface CharacterTemplate {
  id: string;
  name: string;
  description: string;
  baseStatsModifier: Partial<GeneralStats>;
}

export interface GameState {
  worldContext?: WorldContext; 
  activeProjects: Project[]; 
  completedProjects: string[]; 
  isPlaying: boolean; 
  isAiGenerating?: boolean; 
  eventQueue: GameEvent[]; 
  pendingHistoricalEvents: GameEvent[]; 
  recentEventIds: string[]; 
  phase: Phase;
  week: number;
  totalWeeksInPhase: number;
  subjects: Record<SubjectKey, SubjectStats>;
  general: GeneralStats;
  fatigue: number;
  initialGeneral: GeneralStats; 
  oiStats: OIStats; 
  selectedSubjects: SubjectKey[];
  competition: CompetitionType;
  flags: Record<string, any>;
  club: ClubId | null; 
  hasSelectedClub: boolean; 
  romancePartner: string | null;
  relationshipProfileId: string | null;
  className: string; 
  log: GameLogEntry[];
  currentEvent: GameEvent | null;
  chainedEvent: GameEvent | null; 
  eventResult: { choice: EventChoice, diff: string[] } | null;
  history: StoryEntry[];
  examResult: ExamResult | null;
  midtermRank: number | string | null; 
  competitionResults: Array<CompetitionResultData>;
  popupCompetitionResult: CompetitionResultData | null;
  popupExamResult: (ExamResult & { nextPhase?: Phase }) | null;
  triggeredEvents: string[]; 
  isSick: boolean;
  isGrounded: boolean;
  debugMode: boolean;
  activeStatuses: GameStatus[];
  unlockedAchievements: string[]; 
  achievementPopup: Achievement | null; 
  difficulty: Difficulty;
  activeChallengeId: string | null; 
  isWeekend: boolean;
  lastWeekSchedule: Record<string, string>;
  lastHistoricalWeek: number;
  weekendProcessed: boolean; 
  availableWeekendActivityIds?: string[]; 
  activeMiniGame: 'AUTUMN_TRIP' | null;
  sleepCount: number;
  rejectionCount: number; 
  hasSleptThisWeek?: boolean;
  dreamtExam?: boolean;
  talents: Talent[];
  inventory: string[]; 
  theme: Theme;
}

export interface GameLogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'event';
  timestamp: number;
}

export type EventTriggerType = 'RANDOM' | 'CONDITIONAL' | 'FIXED' | 'CHAINED';

export interface GameEvent {
  id: string;
  title: string;
  description: string | ((state: GameState) => string);
  type: 'positive' | 'negative' | 'neutral';
  choices?: EventChoice[];
  condition?: (state: GameState) => boolean;
  once?: boolean;
  triggerType?: EventTriggerType;
  fixedPhase?: Phase;
  fixedWeek?: number;
  miniGameId?: 'AUTUMN_TRIP';
}

export interface EventChoice {
  text: string;
  resultDescription?: string;
  nextEventId?: string; 
  condition?: (state: GameState) => boolean;
  action: (state: GameState) => Partial<GameState>;
}

export interface ExamResult {
  title: string;
  type?: 'ACADEMIC' | 'COMPETITION'; 
  scores: Record<string, number>;
  totalScore: number;
  rank?: number;
  totalStudents?: number;
  comment: string;
}

export interface OIProblem {
    name: string;
    level: number; 
    difficulty: {
        dp: number;
        ds: number;
        math: number;
        string: number;
        graph: number;
        misc: number;
    }
}

export const SUBJECT_NAMES: Record<SubjectKey, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  history: '历史',
  geography: '地理',
  politics: '政治'
};
