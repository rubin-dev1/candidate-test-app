'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();

    if (!trimmed) {
      setError(t.errorRequired);
      inputRef.current?.focus();
      return;
    }
    if (!validateEmail(trimmed)) {
      setError(t.errorInvalidEmail);
      inputRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'NOT_ALLOWED') {
          setError(t.errorNotAllowed);
        } else if (data.error === 'RETAKE_TOO_SOON') {
          setError(t.errorRetakeTooSoon(data.daysRemaining ?? 0));
        } else if (data.error === 'INVALID_EMAIL') {
          setError(t.errorInvalidEmail);
        } else {
          setError(t.errorServer);
        }
        return;
      }

      // Сохраняем email для использования на странице теста
      sessionStorage.setItem('user_email', trimmed);

      if (data.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/test');
      }
    } catch {
      setError(t.errorServer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="flex justify-end p-4">
        <LanguageSwitcher />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Logo / Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t.loginTitle}</h1>
            <p className="mt-2 text-sm text-slate-500">{t.loginSubtitle}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  {t.emailLabel}
                </label>
                <input
                  ref={inputRef}
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={t.emailPlaceholder}
                  disabled={loading}
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors
                    placeholder:text-slate-400 bg-white
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                    disabled:bg-slate-50 disabled:text-slate-400
                    ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'}
                  `}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 animate-fade-in" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700
                  text-white text-sm font-semibold transition-all duration-150
                  disabled:opacity-60 disabled:cursor-not-allowed
                  active:scale-[0.98] shadow-sm hover:shadow"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    {t.loginChecking}
                  </span>
                ) : (
                  t.loginButton
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
