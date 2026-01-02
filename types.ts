
export enum Phase {
  INIT = 'INIT',
  SUMMER = 'SUMMER',          // 5周
  MILITARY = 'MILITARY',      // 1周
  SELECTION = 'SELECTION',    // 选科环节
  PLACEMENT_EXAM = 'PLACEMENT_EXAM', // 分班考
  SEMESTER_1 = 'SEMESTER_1',  // 21周
  MIDTERM_EXAM = 'MIDTERM_EXAM', // 期中考试
  SUBJECT_RESELECTION = 'SUBJECT_RESELECTION', // 期中后改选
  CSP_EXAM = 'CSP_EXAM',      // OI特有：CSP考试
  NOIP_EXAM = 'NOIP_EXAM',    // OI特有：NOIP考试
  FINAL_EXAM = 'FINAL_EXAM',
  ENDING = 'ENDING',
  WITHDRAWAL = 'WITHDRAWAL'   // 隐藏结局：休学
}

export type SubjectKey = 'chinese' | 'math' | 'english' | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography' | 'politics';

export interface SubjectStats {
  aptitude: number;
  level: number;
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

// --- New Features Interfaces ---

export type Difficulty = 'CUSTOM' | 'NORMAL' | 'HARD' | 'REALITY';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  unlockedAt?: number; // timestamp
}

export interface GameStatus {
  id: string;
  name: string;
  description: string;
  type: 'BUFF' | 'DEBUFF' | 'NEUTRAL';
  duration: number; // remaining weeks
  icon: string;
  effectDescription?: string; // e.g. "学习效率 +20%"
}

// ------------------------------

export interface GameState {
  isPlaying: boolean; // Controls the time flow
  eventQueue: GameEvent[]; // Queue for multiple events per week

  phase: Phase;
  week: number;
  totalWeeksInPhase: number;
  subjects: Record<SubjectKey, SubjectStats>;
  general: GeneralStats;
  selectedSubjects: SubjectKey[];
  competition: CompetitionType;
  romancePartner: string | null;
  className: string; 
  log: GameLogEntry[];
  currentEvent: GameEvent | null;
  chainedEvent: GameEvent | null; // Stores the next event to trigger immediately
  eventResult: { choice: EventChoice, diff: string[] } | null;
  history: StoryEntry[];
  examResult: ExamResult | null;
  competitionResults: Array<CompetitionResultData>;
  popupCompetitionResult: CompetitionResultData | null;
  triggeredEvents: string[]; 
  isSick: boolean;
  isGrounded: boolean;
  debugMode: boolean;
  
  // New State Fields
  activeStatuses: GameStatus[];
  unlockedAchievements: string[]; // IDs only
  achievementPopup: Achievement | null; // For toast notification
  difficulty: Difficulty;
}

export interface GameLogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'event';
  timestamp: number;
}

export type EventTriggerType = 'RANDOM' | 'CONDITIONAL' | 'FIXED';

export interface GameEvent {
  id: string;
  title: string;
  // UPDATE: Allow description to be a dynamic function
  description: string | ((state: GameState) => string);
  type: 'positive' | 'negative' | 'neutral';
  choices?: EventChoice[];
  condition?: (state: GameState) => boolean;
  once?: boolean;
  
  // Editor Metadata
  triggerType?: EventTriggerType;
  fixedPhase?: Phase;
  fixedWeek?: number;
}

export interface EventChoice {
  text: string;
  resultDescription?: string;
  // Make chaining explicit for the editor
  nextEventId?: string; 
  action: (state: GameState) => Partial<GameState>;
}

export interface ExamResult {
  title: string;
  scores: Record<string, number>;
  totalScore: number;
  rank?: number;
  totalStudents?: number;
  comment: string;
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
