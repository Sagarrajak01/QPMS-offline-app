import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/database.js';

export const createSubject = async (subjectData) => {
  const db = getDB();
  const id = uuidv4();
  const now = Date.now();
  
  await db.run(
    `INSERT INTO subjects (id, name, code, description, default_duration, default_marks, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, 
      subjectData.name, 
      subjectData.code || '', 
      subjectData.description || '', 
      subjectData.default_duration || 180, 
      subjectData.default_marks || 100, 
      now, 
      now
    ]
  );
  return id;
};

export const getAllSubjects = async () => {
  const db = getDB();
  const res = await db.query('SELECT * FROM subjects ORDER BY name ASC');
  return res.values || [];
};

export const getSubjectById = async (id) => {
  const db = getDB();
  const res = await db.query('SELECT * FROM subjects WHERE id = ?', [id]);
  return res.values && res.values.length > 0 ? res.values[0] : null;
};

export const updateSubject = async (id, subjectData) => {
  const db = getDB();
  const now = Date.now();
  
  await db.run(
    `UPDATE subjects SET 
      name = ?, code = ?, description = ?, default_duration = ?, default_marks = ?, updated_at = ? 
     WHERE id = ?`,
    [
      subjectData.name, 
      subjectData.code || '', 
      subjectData.description || '', 
      subjectData.default_duration || 180, 
      subjectData.default_marks || 100, 
      now, 
      id
    ]
  );
  return true;
};

export const deleteSubject = async (id) => {
  const db = getDB();
  await db.run('DELETE FROM subjects WHERE id = ?', [id]);
  return true;
};