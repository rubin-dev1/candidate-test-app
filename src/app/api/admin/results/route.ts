import { NextRequest, NextResponse } from 'next/server';
import { getAllResults } from '@/lib/sheets';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    const payload = await verifyAuthToken(token);
    if (!payload?.isAdmin) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const results = await getAllResults();
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[ADMIN RESULTS GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
