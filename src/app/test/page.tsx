'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Timer } from '@/components/Timer';
import { ProgressBar } from '@/components/ProgressBar';
import { QuestionCard } from '@/components/QuestionCard';
import type { QuestionPublic, UserAnswer } from '@/lib/types';

const QUESTION_TIME = 30; // seconds per question

export default function TestPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Ref для answers, чтобы использовать актуальное значение в callback-ах
  const answersRef = useRef<UserAnswer[]>([]);
  answersRef.current = answers;

  // ─── Load questions on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/test/start');
        if (!res.ok) {
          if (res.status === 401) {
            router.replace('/');
            return;
          }
          throw new Error('Failed to load');
        }
        const data: { questions: QuestionPublic[]; startedAt: string } = await res.json();
        setQuestions(data.questions);
        // Инициализируем пустые ответы для всех вопросов
        setAnswers(
          data.questions.map((q) => ({
            questionId: q.id,
            selectedAnswers: [],
            timeExpired: false,
          }))
        );
      } catch {
        setError(t.errorServer);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Timer expire handler ────────────────────────────────────────────────────
  const handleTimeExpire = useCallback(() => {
    const current = answersRef.current;
    const currentQuestion = questions[currentIdx];
    if (!currentQuestion) return;

    // Записываем «время истекло»
    const updated = current.map((a) =>
      a.questionId === currentQuestion.id
        ? { ...a, timeExpired: true, selectedAnswers: [] }
        : a
    );
    setAnswers(updated);
    answersRef.current = updated;

    // Следующий вопрос или завершение
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswers([]);
    } else {
      submitTest(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, questions]);

  // ─── Next question ───────────────────────────────────────────────────────────
  const handleNext = () => {
    const currentQuestion = questions[currentIdx];
    if (!currentQuestion) return;

    const updated = answers.map((a) =>
      a.questionId === currentQuestion.id
        ? { ...a, selectedAnswers, timeExpired: false }
        : a
    );
    setAnswers(updated);
    answersRef.current = updated;

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswers([]);
    } else {
      submitTest(updated);
    }
  };

  // ─── Submit test ─────────────────────────────────────────────────────────────
  const submitTest = async (finalAnswers: UserAnswer[]) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/');
          return;
        }
        throw new Error('Submit failed');
      }

      const result = await res.json();
      sessionStorage.setItem('test_result', JSON.stringify(result));
      router.push('/result');
    } catch {
      setError(t.errorServer);
      setSubmitting(false);
    }
  };

  // ─── Render states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Screen>
        <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
          <Spinner />
          <span className="text-sm">{t.testLoading}</span>
        </div>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.replace('/')}
            className="text-sm text-indigo-600 underline"
          >
            {t.resultBackHome}
          </button>
        </div>
      </Screen>
    );
  }

  if (submitting) {
    return (
      <Screen>
        <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
          <Spinner />
          <span className="text-sm">{t.testSubmitting}</span>
        </div>
      </Screen>
    );
  }

  const currentQuestion = questions[currentIdx];
  if (!currentQuestion) return null;

  const isLast = currentIdx === questions.length - 1;

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <ProgressBar
            current={currentIdx + 1}
            total={questions.length}
            label={t.testQuestion}
            ofLabel={t.testOf}
          />
        </div>
        <LanguageSwitcher />
      </header>

      {/* Timer bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-2">
        {/* key forces Timer remount on question change → resets countdown */}
        <Timer
          key={currentIdx}
          duration={QUESTION_TIME}
          onExpire={handleTimeExpire}
          label={t.testTimeLeft}
        />
      </div>

      {/* Question */}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <QuestionCard
            question={currentQuestion}
            selectedAnswers={selectedAnswers}
            onChange={setSelectedAnswers}
            hint={
              currentQuestion.questionType === 'multiple'
                ? t.testMultipleHint
                : t.testSingleHint
            }
            sectionLabel={t.testSection}
          />
        </div>
      </main>

      {/* Bottom action bar */}
      <footer className="bg-white border-t border-slate-100 px-4 py-4 safe-bottom">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleNext}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700
              text-white text-sm font-semibold transition-all duration-150
              disabled:opacity-60 active:scale-[0.98] shadow-sm"
          >
            {isLast ? t.testFinish : t.testNextQuestion}
          </button>
        </div>
      </footer>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
