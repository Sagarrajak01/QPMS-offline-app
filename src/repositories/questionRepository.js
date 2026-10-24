import { getDB } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export const getAllQuestions = async () => {
  const db = await getDB();
  const res = await db.query('SELECT * FROM questions');
  return (res.values || []).map(q => ({ ...q, options: JSON.parse(q.options || '[]') }));
};

export const getQuestionsBySubject = async (subjectId) => {
  const db = await getDB();
  const res = await db.query('SELECT * FROM questions WHERE subject_id=?', [subjectId]);
  return (res.values || []).map(q => ({ ...q, options: JSON.parse(q.options || '[]') }));
};

export const createQuestion = async (q) => {
  const db = await getDB();
  const id = uuidv4();
  const query = `INSERT INTO questions (id, subject_id, type, difficulty, marks, text, options, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  await db.run(query, [id, q.subject_id, q.type, q.difficulty, q.marks, q.text, JSON.stringify(q.options || []), q.correct_answer]);
  return { id };
};

export const updateQuestion = async (id, q) => {
  const db = await getDB();
  const query = `UPDATE questions SET subject_id=?, type=?, difficulty=?, marks=?, text=?, options=?, correct_answer=? WHERE id=?`;
  await db.run(query, [q.subject_id, q.type, q.difficulty, q.marks, q.text, JSON.stringify(q.options || []), q.correct_answer, id]);
  return { id };
};

export const deleteQuestion = async (id) => {
  const db = await getDB();
  await db.run(`DELETE FROM questions WHERE id=?`, [id]);
  return { id };
};