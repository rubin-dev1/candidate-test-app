import { NextRequest, NextResponse } from 'next/server';
import {
  isEmailAllowed,
  isAdminEmail,
  getLastCompletedResult,
} from '@/lib/sheets';
import {
  signAuthToken,
  AUTH_COOKIE,
  COOKIE_OPTIONS,
} from '@/lib/auth';

const RETAKE_COOLDOWN_DAYS = parseInt(process.env.RETAKE_COOLDOWN_DAYS ?? '7', 10);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
    }

    // ── Проверка: администратор ────────────────────────────────────────────────
    const admin = await isAdminEmail(email);
    if (admin) {
      const token = await signAuthToken({ email, isAdmin: true });
      const res = NextResponse.json({ success: true, isAdmin: true });
      res.cookies.set(AUTH_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: 4 * 60 * 60 });
      return res;
    }

    // ── Проверка: допущен ли кандидат ──────────────────────────────────────────
    const allowed = await isEmailAllowed(email);
    if (!allowed) {
      return NextResponse.json({ error: 'NOT_ALLOWED' }, { status: 403 });
    }

    // ── Проверка: cooldown между попытками ─────────────────────────────────────
    if (RETAKE_COOLDOWN_DAYS > 0) {
      const last = await getLastCompletedResult(email);
      if (last) {
        const msElapsed = Date.now() - new Date(last.finishedAt).getTime();
        const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
        if (daysElapsed < RETAKE_COOLDOWN_DAYS) {
          const daysRemaining = Math.ceil(RETAKE_COOLDOWN_DAYS - daysElapsed);
          return NextResponse.json(
            { error: 'RETAKE_TOO_SOON', daysRemaining },
            { status: 429 }
          );
        }
      }
    }

    // ── Выдаём токен кандидату ─────────────────────────────────────────────────
    const token = await signAuthToken({ email, isAdmin: false });
    const res = NextResponse.json({ success: true, isAdmin: false });
    res.cookies.set(AUTH_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: 4 * 60 * 60 });
    return res;
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
