import { getDB } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const INSERT_PAPER = `INSERT INTO papers (id, title, examination_name, duration, max_marks, instructions, subject_id, snapshot, created_at, is_draft, institution_name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonBlankString = (value) => typeof value === 'string' && value.trim().length > 0;

const parseSnapshot = (raw, paperId) => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (isPlainObject(parsed)) return parsed;
  } catch {
  }
  console.warn(`Paper ${paperId} has an unreadable snapshot; treating it as empty.`);
  return {};
};

export const getAllPapers = async () => {
  const db = await getDB();
  const res = await db.query('SELECT * FROM papers ORDER BY created_at DESC');
  return (res.values || []).map((p) => ({ ...p, snapshot: parseSnapshot(p.snapshot, p.id) }));
};

export const createPaper = async (paper) => {
  // Validate before touching the database. Downstream code (list, PDF download)
  // assumes every stored paper has a title and a subject.
  if (!paper || !isNonBlankString(paper.title)) throw new Error('Paper title is required.');
  if (!isNonBlankString(paper.subject_id)) throw new Error('A subject is required for a paper.');
  if (paper.snapshot != null && !isPlainObject(paper.snapshot)) throw new Error('Paper snapshot must be an object.');

  const db = await getDB();
  const id = uuidv4();
  const now = Date.now();

  await db.run(INSERT_PAPER, [
    id,
    paper.title.trim(),
    paper.examination_name ?? null,
    paper.duration ?? null,
    paper.max_marks ?? null,
    paper.instructions ?? null,
    paper.subject_id,
    JSON.stringify(paper.snapshot ?? {}),
    now,
    paper.is_draft ? 1 : 0,
    paper.institution_name ?? null,
    now,
  ]);
  return { id };
};

export const deletePaper = async (id) => {
  const db = await getDB();
  await db.run(`DELETE FROM papers WHERE id=?`, [id]);
  return { id };
};