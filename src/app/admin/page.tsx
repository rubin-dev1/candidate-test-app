'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { AllowedEmail, ResultSummary, QuestionFull } from '@/lib/types';

type Tab = 'candidates' | 'results' | 'questions';

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('candidates');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="text-base font-semibold text-slate-900 truncate">{t.adminTitle}</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            {t.adminLogout}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-4 flex gap-1 overflow-x-auto">
        {([
          ['candidates', t.adminTabCandidates],
          ['results',    t.adminTabResults],
          ['questions',  t.adminTabQuestions],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {tab === 'candidates' && <CandidatesTab />}
        {tab === 'results'    && <ResultsTab />}
        {tab === 'questions'  && <QuestionsTab />}
      </div>
    </div>
  );
}

// ─── Candidates Tab ───────────────────────────────────────────────────────────

function CandidatesTab() {
  const { t } = useLanguage();
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [comment, setComment] = useState('');
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');
  const [addError, setAddError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/emails');
      const data = await res.json();
      setEmails(data.emails ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddedMsg('');
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setAddError(t.errorInvalidEmail);
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, comment }),
      });
      if (!res.ok) throw new Error('Failed');
      setNewEmail('');
      setComment('');
      setAddedMsg(t.adminEmailAdded);
      await load();
      setTimeout(() => setAddedMsg(''), 3000);
    } catch {
      setAddError(t.errorServer);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">{t.adminAddCandidate}</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => { setNewEmail(e.target.value); setAddError(''); }}
            placeholder={t.adminEmailPlaceholder}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.adminCommentPlaceholder}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          {addedMsg && <p className="text-xs text-emerald-600">{addedMsg}</p>}
          <button
            type="submit"
            disabled={adding}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            {adding ? t.adminAdding : t.adminAddButton}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm"><MiniSpinner /></div>
        ) : emails.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.adminNoEmails}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {emails.map((e) => (
              <div key={e.email} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="text-sm font-medium text-slate-800 flex-1">{e.email}</span>
                <span className="text-xs text-slate-400">{fmtDate(e.addedAt)}</span>
                {e.comment && (
                  <span className="text-xs text-slate-500 italic sm:ml-2">{e.comment}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Results Tab ──────────────────────────────────────────────────────────────

function ResultsTab() {
  const { t } = useLanguage();
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/results')
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCenter />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {results.length === 0 ? (
        <EmptyState text={t.adminNoResults} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {[t.adminColEmail, t.adminColStarted, t.adminColStatus,
                    t.adminColCorrect, t.adminColWrong, t.adminColSkipped, t.adminColPercent
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.attemptId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{r.email}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(r.startedAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} percent={r.percent} />
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{r.correctCount}</td>
                    <td className="px-4 py-3 text-red-500">{r.wrongCount}</td>
                    <td className="px-4 py-3 text-slate-400">{r.skippedCount}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{r.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {results.map((r) => (
              <div key={r.attemptId} className="px-4 py-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 truncate">{r.email}</span>
                  <StatusBadge status={r.status} percent={r.percent} />
                </div>
                <div className="text-xs text-slate-400">{fmtDate(r.startedAt)}</div>
                <div className="flex gap-4 text-xs">
                  <span className="text-emerald-600">✓ {r.correctCount}</span>
                  <span className="text-red-500">✗ {r.wrongCount}</span>
                  <span className="text-slate-400">⏭ {r.skippedCount}</span>
                  <span className="font-bold text-slate-700">{r.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Questions Tab ────────────────────────────────────────────────────────────

function QuestionsTab() {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<QuestionFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<QuestionFull | null | 'new'>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/questions');
      const d = await res.json();
      setQuestions(d.questions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (q: QuestionFull) => {
    await fetch('/api/admin/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: q.id, active: !q.active }),
    });
    await load();
  };

  if (editingQuestion !== null) {
    return (
      <QuestionForm
        initial={editingQuestion === 'new' ? null : editingQuestion}
        onCancel={() => setEditingQuestion(null)}
        onSaved={() => { setEditingQuestion(null); load(); }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditingQuestion('new')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
        >
          + {t.adminAddQuestion}
        </button>
      </div>

      {loading ? <LoadingCenter /> : questions.length === 0 ? (
        <EmptyState text={t.adminNoQuestions} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {questions.map((q) => (
              <div key={q.id} className={`px-4 py-4 flex items-start gap-3 ${!q.active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">#{q.id}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-600 rounded px-1.5 py-0.5">
                      Гр. {q.group}
                    </span>
                    <span className="text-xs bg-slate-50 text-slate-500 rounded px-1.5 py-0.5">
                      {q.questionType}
                    </span>
                    {!q.active && (
                      <span className="text-xs bg-red-50 text-red-400 rounded px-1.5 py-0.5">off</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed line-clamp-2">{q.question}</p>
                  <p className="text-xs text-slate-400 mt-1">{q.options.length} вариантов</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {t.adminEditQuestion}
                  </button>
                  <button
                    onClick={() => handleToggleActive(q)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                      q.active
                        ? 'border-red-200 text-red-500 hover:bg-red-50'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {q.active ? t.adminDeactivate : t.adminActivate}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Question Form ────────────────────────────────────────────────────────────

interface QuestionFormProps {
  initial: QuestionFull | null;
  onCancel: () => void;
  onSaved: () => void;
}

function QuestionForm({ initial, onCancel, onSaved }: QuestionFormProps) {
  const { t } = useLanguage();
  const [questionText, setQuestionText] = useState(initial?.question ?? '');
  const [group, setGroup] = useState<number>(initial?.group ?? 1);
  const [type, setType] = useState<'single' | 'multiple'>(initial?.questionType ?? 'single');
  const [options, setOptions] = useState<string[]>(initial?.options ?? ['', '']);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(initial?.correctAnswers ?? []);
  const [explanation, setExplanation] = useState(initial?.explanation ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleOptionChange = (idx: number, val: string) => {
    const old = options[idx];
    const next = [...options];
    next[idx] = val;
    setOptions(next);
    // Обновляем правильные ответы если текст изменился
    setCorrectAnswers((ca) => ca.map((a) => (a === old ? val : a)));
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return; // минимум 2 варианта
    const removed = options[idx];
    setOptions(options.filter((_, i) => i !== idx));
    setCorrectAnswers((ca) => ca.filter((a) => a !== removed));
  };

  const handleCorrectToggle = (option: string) => {
    if (type === 'single') {
      setCorrectAnswers([option]);
    } else {
      setCorrectAnswers((ca) =>
        ca.includes(option) ? ca.filter((a) => a !== option) : [...ca, option]
      );
    }
  };

  const handleTypeChange = (newType: 'single' | 'multiple') => {
    setType(newType);
    if (newType === 'single' && correctAnswers.length > 1) {
      setCorrectAnswers([correctAnswers[0]]);
    }
  };

  const handleSave = async () => {
    setError('');
    if (!questionText.trim()) { setError('Введите текст вопроса'); return; }
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) { setError('Минимум 2 варианта ответа'); return; }
    if (correctAnswers.length === 0) { setError('Отметьте хотя бы один правильный ответ'); return; }

    setSaving(true);
    try {
      const payload = {
        id: initial?.id,
        group,
        question: questionText.trim(),
        options: validOptions,
        correctAnswers,
        questionType: type,
        explanation: explanation.trim(),
        active,
      };
      const res = await fetch('/api/admin/questions', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch {
      setError(t.errorServer);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Back */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        ← {t.qfCancel}
      </button>

      <h2 className="text-base font-semibold text-slate-800">
        {initial ? t.qfEdit : t.qfNew}
      </h2>

      {/* Question text */}
      <Field label={t.qfTitle}>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </Field>

      {/* Group + Type */}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.qfGroup}>
          <select
            value={group}
            onChange={(e) => setGroup(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <Field label={t.qfType}>
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as 'single' | 'multiple')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="single">{t.qfTypeSingle}</option>
            <option value="multiple">{t.qfTypeMultiple}</option>
          </select>
        </Field>
      </div>

      {/* Options + correct answers */}
      <Field label={`${t.qfOptions} — ${t.qfCorrectAnswers}`}>
        <div className="space-y-2">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {/* Correct marker */}
              <button
                type="button"
                onClick={() => opt.trim() && handleCorrectToggle(opt)}
                title={type === 'single' ? 'Radio' : 'Checkbox'}
                className={`flex-shrink-0 w-5 h-5 flex items-center justify-center border-2 transition-colors
                  ${type === 'multiple' ? 'rounded-md' : 'rounded-full'}
                  ${correctAnswers.includes(opt) ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}
                `}
              >
                {correctAnswers.includes(opt) && (
                  <span className="text-white text-xs">✓</span>
                )}
              </button>
              {/* Option text */}
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`${t.qfOptionPlaceholder}`}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {/* Remove */}
              <button
                type="button"
                onClick={() => handleRemoveOption(idx)}
                disabled={options.length <= 2}
                className="text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOptions([...options, ''])}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium py-1"
          >
            {t.qfAddOption}
          </button>
        </div>
      </Field>

      {/* Explanation */}
      <Field label={t.qfExplanation}>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder={t.qfExplanationPlaceholder}
          rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </Field>

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setActive((a) => !a)}
          className={`relative w-10 h-6 rounded-full transition-colors ${active ? 'bg-indigo-600' : 'bg-slate-300'}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              active ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </div>
        <span className="text-sm text-slate-700">{t.qfActive}</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {t.qfCancel}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
        >
          {saving ? '...' : t.qfSave}
        </button>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
      {text}
    </div>
  );
}

function LoadingCenter() {
  return (
    <div className="flex justify-center items-center py-16">
      <MiniSpinner />
    </div>
  );
}

function MiniSpinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StatusBadge({ status, percent }: { status: string; percent: number }) {
  const passed = status === 'completed' && percent >= 70;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      passed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
    }`}>
      {status}
    </span>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
