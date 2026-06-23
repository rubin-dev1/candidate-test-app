'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { TestResult, QuestionResult } from '@/lib/types';

export default function ResultPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('test_result');
    if (!raw) {
      router.replace('/');
      return;
    }
    try {
      setResult(JSON.parse(raw) as TestResult);
    } catch {
      router.replace('/');
    }
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">{t.loading}</div>
      </div>
    );
  }

  const scoreColor =
    result.percent >= 70
      ? 'text-emerald-600'
      : result.percent >= 50
      ? 'text-amber-600'
      : 'text-red-600';

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-900">{t.resultTitle}</h1>
        <LanguageSwitcher />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        {/* Score card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6 text-center">
          <div className={`text-5xl font-bold mb-1 ${scoreColor}`}>
            {result.percent}%
          </div>
          <div
            className={`text-sm font-semibold mt-2 ${
              result.passed ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {result.passed ? t.resultPassed : t.resultFailed}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <StatCard
              value={result.correctCount}
              label={t.resultCorrect}
              color="text-emerald-600 bg-emerald-50"
            />
            <StatCard
              value={result.wrongCount}
              label={t.resultWrong}
              color="text-red-600 bg-red-50"
            />
            <StatCard
              value={result.skippedCount}
              label={t.resultSkipped}
              color="text-slate-500 bg-slate-100"
            />
          </div>
        </div>

        {/* Question details */}
        <div className="flex flex-col gap-3">
          {result.details.map((detail, idx) => (
            <QuestionReview key={detail.question.id} detail={detail} index={idx + 1} t={t} />
          ))}
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              sessionStorage.removeItem('test_result');
              router.push('/');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200
              text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ← {t.resultBackHome}
          </button>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl py-3 px-2 ${color.split(' ')[1]}`}>
      <div className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function QuestionReview({
  detail,
  index,
  t,
}: {
  detail: QuestionResult;
  index: number;
  t: ReturnType<typeof useLanguage>['t'];
}) {
  const [open, setOpen] = useState(false);
  const { question, correctAnswers, userAnswer, isCorrect } = detail;

  const statusIcon = userAnswer.timeExpired
    ? '⏭'
    : isCorrect
    ? '✓'
    : '✗';

  const statusColor = userAnswer.timeExpired
    ? 'text-slate-400 bg-slate-100 border-slate-200'
    : isCorrect
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : 'text-red-600 bg-red-50 border-red-200';

  const headerBg = userAnswer.timeExpired
    ? 'bg-white'
    : isCorrect
    ? 'bg-emerald-50/40'
    : 'bg-red-50/40';

  return (
    <div className={`rounded-xl border overflow-hidden ${
      userAnswer.timeExpired ? 'border-slate-200' : isCorrect ? 'border-emerald-200' : 'border-red-200'
    }`}>
      {/* Accordion header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left flex items-start gap-3 p-4 transition-colors hover:bg-slate-50/80 ${headerBg}`}
      >
        {/* Status badge */}
        <span
          className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center
            text-xs font-bold ${statusColor}`}
        >
          {statusIcon}
        </span>

        {/* Question text */}
        <div className="flex-1 min-w-0">
          <span className="text-xs text-slate-400 font-medium"># {index}</span>
          <p className="text-sm text-slate-800 mt-0.5 leading-relaxed line-clamp-2">
            {question.question}
          </p>
        </div>

        {/* Expand icon */}
        <svg
          className={`flex-shrink-0 w-4 h-4 text-slate-400 transition-transform mt-1 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-slate-100 px-4 py-4 bg-white space-y-3 animate-fade-in">
          {/* Options with correct highlighting */}
          <div className="flex flex-col gap-1.5">
            {question.options.map((option, i) => {
              const isCorrectOption = correctAnswers.includes(option);
              const isUserSelected = userAnswer.selectedAnswers.includes(option);

              let optStyle = 'text-slate-600 bg-slate-50';
              if (isCorrectOption) optStyle = 'text-emerald-800 bg-emerald-50 font-medium';
              if (isUserSelected && !isCorrectOption) optStyle = 'text-red-700 bg-red-50';

              return (
                <div
                  key={i}
                  className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${optStyle}`}
                >
                  <span className="flex-shrink-0">
                    {isCorrectOption ? '✓' : isUserSelected ? '✗' : '○'}
                  </span>
                  <span>{option}</span>
                </div>
              );
            })}
          </div>

          {/* User answer note */}
          {userAnswer.timeExpired ? (
            <p className="text-xs text-slate-400 italic">{t.resultTimeExpiredNote}</p>
          ) : userAnswer.selectedAnswers.length === 0 ? (
            <p className="text-xs text-slate-400 italic">{t.resultNoAnswer}</p>
          ) : null}

          {/* Explanation */}
          {detail.explanation && (
            <div className="bg-indigo-50 rounded-lg px-3 py-2.5">
              <p className="text-xs font-medium text-indigo-600 mb-1">{t.resultExplanation}</p>
              <p className="text-xs text-indigo-900 leading-relaxed">{detail.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
