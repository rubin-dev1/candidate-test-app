import { NextResponse } from 'next/server';
import { AUTH_COOKIE, TEST_COOKIE, COOKIE_OPTIONS } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.cookies.set(TEST_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
