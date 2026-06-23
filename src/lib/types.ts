// ─── Question types ───────────────────────────────────────────────────────────

export type QuestionType = 'single' | 'multiple';
export type Locale = 'ru' | 'en';

/** Вопрос в виде, который безопасно отправлять клиенту (без правильных ответов) */
export interface QuestionPublic {
  id: number;
  group: number;
  question: string;
  options: string[];
  questionType: QuestionType;
}

/** Полный вопрос (только сервер) */
export interface QuestionFull extends QuestionPublic {
  correctAnswers: string[];
  explanation: string;
  active: boolean;
}

// ─── Test session ─────────────────────────────────────────────────────────────

/** Ответ пользователя на один вопрос */
export interface UserAnswer {
  questionId: number;
  selectedAnswers: string[];
  timeExpired: boolean;
}

/** Детальный результат по одному вопросу (для страницы результатов) */
export interface QuestionResult {
  question: QuestionPublic;
  correctAnswers: string[];
  userAnswer: UserAnswer;
  isCorrect: boolean;
  explanation: string;
}

/** Итоговый результат теста */
export interface TestResult {
  attemptId: string;
  email: string;
  startedAt: string;
  finishedAt: string;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percent: number;
  passed: boolean;
  details: QuestionResult[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  email: string;
  isAdmin: boolean;
}

export interface TestSessionPayload {
  email: string;
  questionIds: number[];
  startedAt: string;
}

// ─── Admin data ───────────────────────────────────────────────────────────────

export interface AllowedEmail {
  email: string;
  addedAt: string;
  source: string;
  comment: string;
}

export interface ResultSummary {
  attemptId: string;
  email: string;
  startedAt: string;
  finishedAt: string;
  status: string;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percent: number;
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  daysRemaining?: number;
}
