export type ThemeMode = 'light' | 'dark';

export type QuizMode = 'practice' | 'exam';

export type SrsStatus = 'repeat' | 'doubt' | 'mastered';

export type QuestionType = 'choice' | 'input' | 'completion' | 'correction';

export type OptionLetter = 'A' | 'B' | 'C' | 'D';

export interface Question {
  id: string;
  number?: number;
  part?: 1 | 2;
  type: QuestionType | string;
  section?: string;
  question: string;
  options?: Partial<Record<OptionLetter, string>> | null;
  answer: string;
  explanation?: string;
  readingText?: string | null;
  topicTitle?: string;
  topicBadge?: string;
}

export interface Topic {
  id: string;
  title: string;
  badge: string;
  blockId?: string;
  blockName?: string;
  description?: string;
  questions: Question[];
}

export interface TestData {
  metadata: {
    generatedAt: string;
    totalTopics: number;
    totalQuestions: number;
  };
  topics: Topic[];
}

export interface GoldenRule {
  title: string;
  content: string;
}

export interface ExamTrap {
  trap: string;
  exampleBad: string;
  exampleGood: string;
  explanation: string;
}

export interface ExamTip {
  rule: string;
  tip: string;
}

export interface VocabKey {
  term: string;
  meaning: string;
  distractorRole: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface StudySheet {
  topicId: string;
  badge: string;
  title: string;
  summary: string;
  goldenRules: GoldenRule[];
  examTraps: ExamTrap[];
  examTips: ExamTip[];
  vocabularyKeys: VocabKey[];
  flashcards: Flashcard[];
}

export interface StudyData {
  metadata: {
    generatedAt: string;
    totalSheets: number;
  };
  sheets: Record<string, StudySheet>;
}

export interface ReadingUnit {
  id: string;
  title: string;
  text: string;
  questions: Array<{
    id: string;
    question: string;
    options: Record<OptionLetter, string>;
    answer: OptionLetter;
    explanation?: string;
  }>;
}

export interface ClozeUnit {
  id: string;
  title: string;
  text: string;
  questions: Array<{
    id: string;
    question: string;
    options: Record<OptionLetter, string>;
    answer: OptionLetter;
    explanation?: string;
  }>;
}

export interface ExamData {
  metadata: {
    version: string;
    totalReadingUnits: number;
    totalReadingQuestions: number;
    totalClozeUnits: number;
    totalClozeQuestions: number;
  };
  readingUnits: ReadingUnit[];
  clozeUnits: ClozeUnit[];
}

export interface QuestionReview extends Question {
  userAnswer: string | null;
  isCorrect: boolean;
  isBlank: boolean;
}

export interface HistoryEntry {
  id: string;
  date: string;
  topicId: string | null;
  mode: QuizMode;
  title: string;
  badge: string;
  isOfficialMock?: boolean;
  part1Score?: string;
  part2Score?: string;
  part1Correct?: number;
  part2Correct?: number;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  score: number;
  passed: boolean;
  timeSeconds: number;
  questionsReview: QuestionReview[];
}

export interface ActiveQuiz {
  topicId: string | null;
  title: string;
  badge: string;
  mode: QuizMode;
  questions: Question[];
  currentIndex: number;
  userAnswers: Record<string, string>;
  interactiveChecked: Record<string, boolean>;
  isFinished: boolean;
  startTime: number;
  elapsedSeconds: number;
  savedAt?: number;
  isOfficialMock?: boolean;
  timeLimitMinutes?: number | null;
  totalTimeSeconds?: number | null;
}

export type SrsMap = Record<string, SrsStatus>;

export interface SyncPayload {
  version: number;
  theme: ThemeMode;
  favorites: string[];
  errors: string[];
  history: HistoryEntry[];
  srs: SrsMap;
  activeQuiz: ActiveQuiz | null;
  activeQuizUpdatedAt: number;
  updatedAt: string;
}

export type SyncStatus = 'loading' | 'saving' | 'saved' | 'offline';

export type AppView =
  | 'dashboard'
  | 'topics'
  | 'quiz'
  | 'results'
  | 'history'
  | 'history-detail'
  | 'analytics'
  | 'study-sheet';
