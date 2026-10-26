import { getDB } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const INSERT_QUESTION = `INSERT INTO questions (id, subject_id, type, difficulty, marks, text, unit, topic, options, correct_answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
const UPDATE_QUESTION = `UPDATE questions SET subject_id=?, type=?, difficulty=?, marks=?, text=?, unit=?, topic=?, options=?, correct_answer=?, updated_at=? WHERE id=?`;

const trimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const parseOptions = (raw, questionId) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall through to the warning below.
  }
  console.warn(`Question ${questionId} has unreadable options; treating them as empty.`);
  return [];
};

const toQuestion = (row) => ({
  ...row,
  unit: row.unit ?? '',
  topic: row.topic ?? '',
  options: parseOptions(row.options, row.id),
});

// Validates the input and returns the column values shared by insert and update.
const toColumnValues = (q) => {
  if (!q || !trimmedString(q.subject_id)) throw new Error('A subject is required for a question.');
  if (!trimmedString(q.text)) throw new Error('Question text is required.');

  const options = Array.isArray(q.options) ? q.options : [];

  return {
    subject_id: q.subject_id,
    type: q.type ?? null,
    difficulty: q.difficulty ?? null,
    marks: q.marks ?? null,
    text: q.text.trim(),
    unit: trimmedString(q.unit),
    topic: trimmedString(q.topic),
    options: JSON.stringify(options),
    correct_answer: q.correct_answer ?? null,
  };
};

export const getAllQuestions = async () => {
  const db = await getDB();
  const res = await db.query('SELECT * FROM questions');
  return (res.values || []).map(toQuestion);
};

export const getQuestionsBySubject = async (subjectId) => {
  const db = await getDB();
  const res = await db.query('SELECT * FROM questions WHERE subject_id=?', [subjectId]);
  return (res.values || []).map(toQuestion);
};

export const createQuestion = async (q) => {
  const v = toColumnValues(q);
  const db = await getDB();
  const id = uuidv4();
  const now = Date.now();

  await db.run(INSERT_QUESTION, [
    id, v.subject_id, v.type, v.difficulty, v.marks, v.text, v.unit, v.topic, v.options, v.correct_answer, now, now,
  ]);
  return { id };
};

export const updateQuestion = async (id, q) => {
  const v = toColumnValues(q);
  const db = await getDB();

  await db.run(UPDATE_QUESTION, [
    v.subject_id, v.type, v.difficulty, v.marks, v.text, v.unit, v.topic, v.options, v.correct_answer, Date.now(), id,
  ]);
  return { id };
};

export const deleteQuestion = async (id) => {
  const db = await getDB();
  await db.run(`DELETE FROM questions WHERE id=?`, [id]);
  return { id };
};