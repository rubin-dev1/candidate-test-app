import { google } from 'googleapis';
import type { QuestionFull, AllowedEmail, ResultSummary } from './types';

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

const SID = () => {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID is not set');
  return id;
};

// ─── AllowedEmails ────────────────────────────────────────────────────────────
// Columns: A=email  B=added_at  C=source  D=comment

export async function isEmailAllowed(email: string): Promise<boolean> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID(),
    range: 'AllowedEmails!A:A',
  });
  const rows = res.data.values ?? [];
  return rows.slice(1).some(
    (row) => row[0]?.toString().toLowerCase().trim() === email.toLowerCase().trim()
  );
}

export async function getAllAllowedEmails(): Promise<AllowedEmail[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID(),
    range: 'AllowedEmails!A:D',
  });
  return (res.data.values ?? []).slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      email: row[0] ?? '',
      addedAt: row[1] ?? '',
      source: row[2] ?? '',
      comment: row[3] ?? '',
    }));
}

export async function addAllowedEmail(
  email: string,
  source = 'admin',
  comment = ''
): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SID(),
    range: 'AllowedEmails!A:D',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[email.toLowerCase().trim(), new Date().toISOString(), source, comment]],
    },
  });
}

// ─── Admins ───────────────────────────────────────────────────────────────────
// Columns: A=email  B=role  C=added_at  D=comment

export async function isAdminEmail(email: string): Promise<boolean> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID(),
    range: 'Admins!A:A',
  });
  const rows = res.data.values ?? [];
  return rows.slice(1).some(
    (row) => row[0]?.toString().toLowerCase().trim() === email.toLowerCase().trim()
  );
}

// ─── Questions ────────────────────────────────────────────────────────────────
// Columns: A=id  B=group  C=question  D=options_json  E=correct_answers_json
//          F=question_type  G=explanation  H=active

function rowToQuestion(row: string[]): QuestionFull {
  return {
    id: parseInt(row[0]),
    group: parseInt(row[1]),
    question: row[2] ?? '',
    options: safeParseJson<string[]>(row[3], []),
    correctAnswers: safeParseJson<string[]>(row[4], []),
    questionType: (row[5] === 'multiple' ? 'multiple' : 'single') as QuestionFull['questionType'],
    explanation: row[6] ?? '',
    active: (row[7] ?? 'true').toLowerCase() !== 'false',
  };
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function getAllQuestions(): Promise<QuestionFull[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID(),
    range: 'Questions!A:H',
  });
  return (res.data.values ?? [])
    .slice(1)
    .filter((row) => row[0] && !isNaN(parseInt(row[0])))
    .map(rowToQuestion);
}

export async function getActiveQuestions(): Promise<QuestionFull[]> {
  const all = await getAllQuestions();
  return all.filter((q) => q.active);
}

export async function getQuestionsByIds(ids: number[]): Promise<QuestionFull[]> {
  const all = await getAllQuestions();
  return all.filter((q) => ids.includes(q.id));
}

export async function addQuestion(q: Omit<QuestionFull, 'id'>): Promise<void> {
  const all = await getAllQuestions();
  const maxId = all.reduce((m, q) => Math.max(m, q.id), 0);
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SID(),
    range: 'Questions!A:H',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        maxId + 1,
        q.group,
        q.question,
        JSON.stringify(q.options),
        JSON.stringify(q.correctAnswers),
        q.questionType,
        q.explanation ?? '',
        q.active ? 'true' : 'false',
      ]],
    },
  });
}

export async function updateQuestion(
  id: number,
  updates: Partial<Omit<QuestionFull, 'id'>>
): Promise<void> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID(),
    range: 'Questions!A:H',
  });
  const rows = res.data.values ?? [];

  // rows[0] is header → sheet row 1; rows[1] is first data → sheet row 2
  const arrayIdx = rows.findIndex((row, i) => i > 0 && parseInt(row[0]) === id);
  if (arrayIdx === -1) throw new Error(`Question ${id} not found`);

  const existing = rows[arrayIdx];
  const sheetRow = arrayIdx + 1; // 1-based

  const updated = [
    existing[0],
    updates.group     !== undefined ? updates.group       : existing[1],
    updates.question  !== undefined ? updates.question    : existing[2],
    updates.options   !== undefined ? JSON.stringify(updates.options)         : existing[3],
    updates.correctAnswers !== undefined ? JSON.stringify(updates.correctAnswers) : existing[4],
    updates.questionType !== undefined ? updates.questionType : existing[5],
    updates.explanation  !== undefined ? updates.explanation  : existing[6],
    updates.active    !== undefined ? String(updates.active) : existing[7],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SID(),
    range: `Questions!A${sheetRow}:H${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updated] },
  });
}

// Soft-delete: просто ставит active=false
export async function deactivateQuestion(id: number): Promise<void> {
  await updateQuestion(id, { active: false });
}

export async function activateQuestion(id: number): Promise<void> {
  await updateQuestion(id, { active: true });
}

// ─── Results ──────────────────────────────────────────────────────────────────
// Columns: A=attempt_id  B=email  C=started_at  D=finished_at  E=status
//          F=correct_count  G=wrong_count  H=skipped_count  I=percent
//          J=questions_json  K=answers_json  L=notes

export interface SaveResultInput {
  attemptId: string;
  email: string;
  startedAt: string;
  finishedAt: string;
  status: string;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percent: number;
  questionsJson: string;
  answersJson: string;
  notes?: string;
}

export async function saveResult(r: SaveResultInput): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SID(),
    range: 'Results!A:L',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        r.attemptId,
        r.email,
        r.startedAt,
        r.finishedAt,
        r.status,
        r.correctCount,
        r.wrongCount,
        r.skippedCount,
        r.percent,
        r.questionsJson,
        r.answersJson,
        r.notes ?? '',
      ]],
    },
  });
}

export async function getAllResults(): Promise<ResultSummary[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID(),
    range: 'Results!A:I',
  });
  return (res.data.values ?? [])
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      attemptId:    row[0] ?? '',
      email:        row[1] ?? '',
      startedAt:    row[2] ?? '',
      finishedAt:   row[3] ?? '',
      status:       row[4] ?? '',
      correctCount: parseInt(row[5]) || 0,
      wrongCount:   parseInt(row[6]) || 0,
      skippedCount: parseInt(row[7]) || 0,
      percent:      parseFloat(row[8]) || 0,
    }))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

/** Возвращает последний завершённый результат кандидата или null */
export async function getLastCompletedResult(
  email: string
): Promise<{ finishedAt: string } | null> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID(),
    range: 'Results!B:E',
  });
  const rows = (res.data.values ?? [])
    .slice(1)
    .filter(
      (row) =>
        row[0]?.toString().toLowerCase().trim() === email.toLowerCase().trim() &&
        row[3] === 'completed'
    );
  if (!rows.length) return null;
  rows.sort((a, b) => new Date(b[2]).getTime() - new Date(a[2]).getTime());
  return { finishedAt: rows[0][2] };
}
