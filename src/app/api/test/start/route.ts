import { NextRequest, NextResponse } from 'next/server';
import { getActiveQuestions, getQuestionsByIds } from '@/lib/sheets';
import {
  verifyAuthToken,
  signTestSession,
  verifyTestSession,
  TEST_COOKIE,
  COOKIE_OPTIONS,
} from '@/lib/auth';
import type { QuestionFull, QuestionPublic } from '@/lib/types';

const QUESTIONS_PER_GROUP = 5;
const GROUPS = [1, 2, 3, 4];

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Select 5 questions per group ────────────────────────────────────────────
function selectQuestions(allActive: QuestionFull[]): QuestionFull[] {
  const selected: QuestionFull[] = [];
  for (const g of GROUPS) {
    const pool = allActive.filter((q) => q.group === g);
    if (pool.length < QUESTIONS_PER_GROUP) {
      throw new Error(
        `Not enough questions in group ${g}: need ${QUESTIONS_PER_GROUP}, found ${pool.length}`
      );
    }
    selected.push(...shuffle(pool).slice(0, QUESTIONS_PER_GROUP));
  }
  return shuffle(selected); // Перемешиваем итоговый список
}

// ─── Strip correct answers before sending to client ───────────────────────────
function toPublic(q: QuestionFull): QuestionPublic {
  return {
    id: q.id,
    group: q.group,
    question: q.question,
    options: q.options,
    questionType: q.questionType,
  };
}

export async function GET(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────────
    const authToken = request.cookies.get('auth_token')?.value;
    if (!authToken) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const authPayload = await verifyAuthToken(authToken);
    if (!authPayload || authPayload.isAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const startedAt = new Date().toISOString();

    // ── Проверяем: есть ли уже активная сессия теста ───────────────────────────
    const existingTestToken = request.cookies.get(TEST_COOKIE)?.value;
    if (existingTestToken) {
      const existingSession = await verifyTestSession(existingTestToken);
      if (existingSession && existingSession.email === authPayload.email) {
        // Возвращаем те же вопросы (защита от перезагрузки страницы)
        const questions = await getQuestionsByIds(existingSession.questionIds);
        // Упорядочиваем по сохранённому порядку IDs
        const ordered = existingSession.questionIds
          .map((id) => questions.find((q) => q.id === id))
          .filter(Boolean) as QuestionFull[];

        return NextResponse.json({
          questions: ordered.map(toPublic),
          startedAt: existingSession.startedAt,
        });
      }
    }

    // ── Выбираем новые вопросы ─────────────────────────────────────────────────
    const allActive = await getActiveQuestions();
    const selected = selectQuestions(allActive);
    const questionIds = selected.map((q) => q.id);

    // ── Создаём test-session cookie ────────────────────────────────────────────
    const testToken = await signTestSession({
      email: authPayload.email,
      questionIds,
      startedAt,
    });

    const res = NextResponse.json({
      questions: selected.map(toPublic),
      startedAt,
    });

    res.cookies.set(TEST_COOKIE, testToken, {
      ...COOKIE_OPTIONS,
      maxAge: 2 * 60 * 60, // 2 часа
    });

    return res;
  } catch (err) {
    console.error('[TEST START ERROR]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', detail: msg }, { status: 500 });
  }
}
