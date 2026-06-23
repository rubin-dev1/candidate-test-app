import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { AuthPayload, TestSessionPayload } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUTH_COOKIE = 'auth_token';
export const TEST_COOKIE = 'test_session';

const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
};

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// ─── Auth token (4h) ──────────────────────────────────────────────────────────

export async function signAuthToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...(payload as unknown as Record<string, unknown>) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      email: payload.email as string,
      isAdmin: payload.isAdmin as boolean,
    };
  } catch {
    return null;
  }
}

// ─── Test session token (2h) ──────────────────────────────────────────────────

export async function signTestSession(payload: TestSessionPayload): Promise<string> {
  return new SignJWT({ ...(payload as unknown as Record<string, unknown>) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(getSecret());
}

export async function verifyTestSession(token: string): Promise<TestSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      email: payload.email as string,
      questionIds: payload.questionIds as number[],
      startedAt: payload.startedAt as string,
    };
  } catch {
    return null;
  }
}

// ─── Cookie helpers (server-side) ─────────────────────────────────────────────

export async function getAuthFromCookies(): Promise<AuthPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

export async function getTestSessionFromCookies(): Promise<TestSessionPayload | null> {
  const store = await cookies();
  const token = store.get(TEST_COOKIE)?.value;
  if (!token) return null;
  return verifyTestSession(token);
}
