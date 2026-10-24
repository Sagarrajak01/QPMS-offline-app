import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/database.js';

export const createPaper = async (paperData) => {
  const db = getDB();
  const id = uuidv4();
  const now = Date.now();
  
  const snapshotStr = JSON.stringify(paperData.snapshot || {});
  
  await db.run(
    `INSERT INTO papers (
      id, title, examination_name, subject_id, duration, max_marks, 
      instructions, institution_name, snapshot, is_draft, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      paperData.title,
      paperData.examination_name || '',
      paperData.subject_id,
      paperData.duration,
      paperData.max_marks,
      paperData.instructions || '',
      paperData.institution_name || '',
      snapshotStr,
      paperData.is_draft !== undefined ? paperData.is_draft : 1, 
      now,
      now
    ]
  );
  return id;
};

export const getAllPapers = async () => {
  const db = getDB();
  const res = await db.query('SELECT * FROM papers ORDER BY created_at DESC');
  
  return (res.values || []).map(p => ({
    ...p,
    snapshot: p.snapshot ? JSON.parse(p.snapshot) : null
  }));
};

export const getPapersBySubject = async (subjectId) => {
  const db = getDB();
  const res = await db.query(
    'SELECT * FROM papers WHERE subject_id = ? ORDER BY created_at DESC', 
    [subjectId]
  );
  
  return (res.values || []).map(p => ({
    ...p,
    snapshot: p.snapshot ? JSON.parse(p.snapshot) : null
  }));
};

export const getPaperById = async (id) => {
  const db = getDB();
  const res = await db.query('SELECT * FROM papers WHERE id = ?', [id]);
  
  if (res.values && res.values.length > 0) {
    const p = res.values[0];
    return {
      ...p,
      snapshot: p.snapshot ? JSON.parse(p.snapshot) : null
    };
  }
  return null;
};

export const updatePaper = async (id, paperData) => {
  const db = getDB();
  const now = Date.now();
  const snapshotStr = JSON.stringify(paperData.snapshot || {});
  
  await db.run(
    `UPDATE papers SET 
      title = ?, examination_name = ?, duration = ?, max_marks = ?, 
      instructions = ?, institution_name = ?, snapshot = ?, is_draft = ?, updated_at = ? 
     WHERE id = ?`,
    [
      paperData.title,
      paperData.examination_name || '',
      paperData.duration,
      paperData.max_marks,
      paperData.instructions || '',
      paperData.institution_name || '',
      snapshotStr,
      paperData.is_draft !== undefined ? paperData.is_draft : 1,
      now,
      id
    ]
  );
  return true;
};

export const deletePaper = async (id) => {
  const db = getDB();
  await db.run('DELETE FROM papers WHERE id = ?', [id]);
  return true;
};