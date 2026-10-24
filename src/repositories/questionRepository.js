import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/database.js';

export const createQuestion = async (qData) => {
  const db = getDB();
  const id = uuidv4();
  const now = Date.now();
  const optionsStr = qData.options ? JSON.stringify(qData.options) : null;
  
  await db.run(
    `INSERT INTO questions (id, subject_id, unit, topic, type, difficulty, marks, text, options, correct_answer, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, qData.subject_id, qData.unit || '', qData.topic || '', qData.type, qData.difficulty, qData.marks, qData.text, optionsStr, qData.correct_answer || '', now, now]
  );
  return id;
};

// NEW FUNCTION ADDED
export const getAllQuestions = async () => {
  const db = getDB();
  const res = await db.query('SELECT * FROM questions ORDER BY created_at DESC');
  const questions = res.values || [];
  return questions.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null
  }));
};

export const getQuestionsBySubject = async (subjectId) => {
  const db = getDB();
  const res = await db.query('SELECT * FROM questions WHERE subject_id = ? ORDER BY created_at DESC', [subjectId]);
  const questions = res.values || [];
  return questions.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null
  }));
};

export const getQuestionById = async (id) => {
  const db = getDB();
  const res = await db.query('SELECT * FROM questions WHERE id = ?', [id]);
  if (res.values && res.values.length > 0) {
    const q = res.values[0];
    return { ...q, options: q.options ? JSON.parse(q.options) : null };
  }
  return null;
};

export const updateQuestion = async (id, qData) => {
  const db = getDB();
  const now = Date.now();
  const optionsStr = qData.options ? JSON.stringify(qData.options) : null;
  
  await db.run(
    `UPDATE questions SET unit = ?, topic = ?, type = ?, difficulty = ?, marks = ?, text = ?, options = ?, correct_answer = ?, updated_at = ? WHERE id = ?`,
    [qData.unit || '', qData.topic || '', qData.type, qData.difficulty, qData.marks, qData.text, optionsStr, qData.correct_answer || '', now, id]
  );
  return true;
};

export const deleteQuestion = async (id) => {
  const db = getDB();
  await db.run('DELETE FROM questions WHERE id = ?', [id]);
  return true;
};