import { NextRequest, NextResponse } from 'next/server';
import {
  getAllQuestions,
  addQuestion,
  updateQuestion,
  deactivateQuestion,
  activateQuestion,
} from '@/lib/sheets';
import { verifyAuthToken } from '@/lib/auth';
import type { QuestionFull } from '@/lib/types';

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  if (!payload?.isAdmin) return null;
  return payload;
}

// ─── GET /api/admin/questions ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    const questions = await getAllQuestions();
    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[ADMIN QUESTIONS GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// ─── POST /api/admin/questions → create ───────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

    const err = validateBody(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    await addQuestion({
      group:          Number(body.group),
      question:       String(body.question).trim(),
      options:        body.options as string[],
      correctAnswers: body.correctAnswers as string[],
      questionType:   body.questionType as 'single' | 'multiple',
      explanation:    String(body.explanation ?? '').trim(),
      active:         body.active !== false,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ADMIN QUESTIONS POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// ─── PATCH /api/admin/questions → update ──────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
    }

    const id = Number(body.id);
    if (isNaN(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });

    // Partial update — передаём только те поля, что пришли
    const updates: Partial<Omit<QuestionFull, 'id'>> = {};
    if (body.group         !== undefined) updates.group         = Number(body.group);
    if (body.question      !== undefined) updates.question      = String(body.question).trim();
    if (body.options       !== undefined) updates.options       = body.options as string[];
    if (body.correctAnswers !== undefined) updates.correctAnswers = body.correctAnswers as string[];
    if (body.questionType  !== undefined) updates.questionType  = body.questionType as 'single' | 'multiple';
    if (body.explanation   !== undefined) updates.explanation   = String(body.explanation ?? '').trim();
    if (body.active        !== undefined) updates.active        = Boolean(body.active);

    await updateQuestion(id, updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ADMIN QUESTIONS PATCH]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// ─── DELETE /api/admin/questions?id=N → soft-delete ──────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const id = Number(request.nextUrl.searchParams.get('id'));
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
    }

    await deactivateQuestion(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ADMIN QUESTIONS DELETE]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function validateBody(body: Record<string, unknown>): string | null {
  if (!body.question || typeof body.question !== 'string' || !body.question.trim()) {
    return 'QUESTION_REQUIRED';
  }
  if (!Array.isArray(body.options) || body.options.length < 2) {
    return 'OPTIONS_REQUIRED';
  }
  if (!Array.isArray(body.correctAnswers) || body.correctAnswers.length === 0) {
    return 'CORRECT_ANSWERS_REQUIRED';
  }
  if (!['single', 'multiple'].includes(body.questionType as string)) {
    return 'INVALID_TYPE';
  }
  if (![1, 2, 3, 4].includes(Number(body.group))) {
    return 'INVALID_GROUP';
  }
  return null;
}
