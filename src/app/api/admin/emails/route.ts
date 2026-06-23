import { NextRequest, NextResponse } from 'next/server';
import { getAllAllowedEmails, addAllowedEmail } from '@/lib/sheets';
import { verifyAuthToken } from '@/lib/auth';

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  if (!payload?.isAdmin) return null;
  return payload;
}

export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    const emails = await getAllAllowedEmails();
    return NextResponse.json({ emails });
  } catch (err) {
    console.error('[ADMIN EMAILS GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
    }

    await addAllowedEmail(email, 'admin_ui', comment);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ADMIN EMAILS POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
