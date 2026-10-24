import { getDB } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export const getAllSubjects = async () => {
  const db = await getDB();
  const res = await db.query('SELECT * FROM subjects');
  return res.values || [];
};

export const createSubject = async (subject) => {
  const db = await getDB();
  const id = uuidv4();
  const query = `INSERT INTO subjects (id, name, code, default_duration, default_marks) VALUES (?, ?, ?, ?, ?)`;
  await db.run(query, [id, subject.name, subject.code, subject.default_duration, subject.default_marks]);
  return { id };
};

export const updateSubject = async (id, subject) => {
  const db = await getDB();
  const query = `UPDATE subjects SET name=?, code=?, default_duration=?, default_marks=? WHERE id=?`;
  await db.run(query, [subject.name, subject.code, subject.default_duration, subject.default_marks, id]);
  return { id };
};

export const deleteSubject = async (id) => {
  const db = await getDB();
  await db.run(`DELETE FROM questions WHERE subject_id=?`, [id]);
  // Delete the actual subject
  await db.run(`DELETE FROM subjects WHERE id=?`, [id]);
  return { id };
};