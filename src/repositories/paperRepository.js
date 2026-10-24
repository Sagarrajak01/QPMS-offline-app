import { getDB } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export const getAllPapers = async () => {
  const db = await getDB();
  const res = await db.query('SELECT * FROM papers ORDER BY created_at DESC');
  return (res.values || []).map(p => ({ ...p, snapshot: JSON.parse(p.snapshot || '{}') }));
};

export const createPaper = async (paper) => {
  const db = await getDB();
  const id = uuidv4();
  const created_at = Date.now();
  const query = `INSERT INTO papers (id, title, examination_name, duration, max_marks, instructions, subject_id, snapshot, created_at, is_draft) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  await db.run(query, [
    id, 
    paper.title, 
    paper.examination_name, 
    paper.duration, 
    paper.max_marks, 
    paper.instructions, 
    paper.subject_id, 
    JSON.stringify(paper.snapshot || {}), 
    created_at, 
    paper.is_draft || 0
  ]);
  return { id };
};

export const deletePaper = async (id) => {
  const db = await getDB();
  await db.run(`DELETE FROM papers WHERE id=?`, [id]);
  return { id };
};