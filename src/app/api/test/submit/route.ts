import { NextRequest, NextResponse } from 'next/server';
import { getQuestionsByIds, saveResult } from '@/lib/sheets';
import {
  verifyAuthToken,
  verifyTestSession,
  TEST_COOKIE,
  COOKIE_OPTIONS,
} from '@/lib/auth';
import type { UserAnswer, QuestionFull, QuestionResult, TestResult } from '@/lib/types';

const PASS_THRESHOLD = parseInt(process.env.PASS_THRESHOLD ?? '70', 10);

// ─── Оценка одного ответа ─────────────────────────────────────────────────────
function evaluate(
  userAnswer: UserAnswer,
  question: QuestionFull
): 'correct' | 'wrong' | 'skipped' {
  if (userAnswer.timeExpired || userAnswer.selectedAnswers.length === 0) {
    return 'skipped';
  }
  const sortedUser = [...userAnswer.selectedAnswers].sort();
  const sortedCorrect = [...question.correctAnswers].sort();

  const match =
    sortedUser.length === sortedCorrect.length &&
    sortedUser.every((a, i) => a === sortedCorrect[i]);

  return match ? 'correct' : 'wrong';
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────────
    const authToken = request.cookies.get('auth_token')?.value;
    if (!authToken) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const authPayload = await verifyAuthToken(authToken);
    if (!authPayload || authPayload.isAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // ── Test session ────────────────────────────────────────────────────────────
    const testToken = request.cookies.get(TEST_COOKIE)?.value;
    if (!testToken) {
      return NextResponse.json({ error: 'NO_TEST_SESSION' }, { status: 400 });
    }

    const session = await verifyTestSession(testToken);
    if (!session || session.email !== authPayload.email) {
      return NextResponse.json({ error: 'INVALID_SESSION' }, { status: 400 });
    }

    // ── Answers from client ─────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const answers: UserAnswer[] = body?.answers ?? [];

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
    }

    // ── Fetch full questions (with correct answers) ─────────────────────────────
    const questions = await getQuestionsByIds(session.questionIds);
    const qMap = new Map(questions.map((q) => [q.id, q]));

    // ── Build per-question result ───────────────────────────────────────────────
    const finishedAt = new Date().toISOString();
    const details: QuestionResult[] = session.questionIds.map((qid) => {
      const q = qMap.get(qid);
      const userAnswer = answers.find((a) => a.questionId === qid) ?? {
        questionId: qid,
        selectedAnswers: [],
        timeExpired: true,
      };

      if (!q) {
        // Вопрос был деактивирован во время теста — считаем пропущенным
        return {
          question: { id: qid, group: 0, question: '(unavailable)', options: [], questionType: 'single' as const },
          correctAnswers: [],
          userAnswer,
          isCorrect: false,
          explanation: '',
        };
      }

      const verdict = evaluate(userAnswer, q);
      return {
        question: {
          id: q.id,
          group: q.group,
          question: q.question,
          options: q.options,
          questionType: q.questionType,
        },
        correctAnswers: q.correctAnswers,
        userAnswer,
        isCorrect: verdict === 'correct',
        explanation: q.explanation ?? '',
      };
    });

    // ── Aggregate counts ────────────────────────────────────────────────────────
    const total = details.length;
    const correctCount = details.filter((d) => d.isCorrect).length;
    const skippedCount = details.filter(
      (d) => !d.isCorrect && (d.userAnswer.timeExpired || d.userAnswer.selectedAnswers.length === 0)
    ).length;
    const wrongCount = total - correctCount - skippedCount;
    const percent = Math.round((correctCount / total) * 100);
    const passed = percent >= PASS_THRESHOLD;
    const attemptId = crypto.randomUUID();

    const result: TestResult = {
      attemptId,
      email: authPayload.email,
      startedAt: session.startedAt,
      finishedAt,
      correctCount,
      wrongCount,
      skippedCount,
      percent,
      passed,
      details,
    };

    // ── Save to Google Sheets ───────────────────────────────────────────────────
    await saveResult({
      attemptId,
      email: authPayload.email,
      startedAt: session.startedAt,
      finishedAt,
      status: 'completed',
      correctCount,
      wrongCount,
      skippedCount,
      percent,
      questionsJson: JSON.stringify(session.questionIds),
      answersJson: JSON.stringify(answers),
    });

    // ── Clear test session cookie ───────────────────────────────────────────────
    const res = NextResponse.json(result);
    res.cookies.set(TEST_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
    return res;
  } catch (err) {
    console.error('[SUBMIT ERROR]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
