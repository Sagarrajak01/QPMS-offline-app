import { getDB } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const INSERT_SUBJECT = `INSERT INTO subjects (id, name, code, description, default_duration, default_marks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
const UPDATE_SUBJECT = `UPDATE subjects SET name=?, code=?, description=?, default_duration=?, default_marks=?, updated_at=? WHERE id=?`;

const isNonBlankString = (value) => typeof value === 'string' && value.trim().length > 0;
const trimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const positiveNumberOrNull = (value, label) => {
  if (value == null) return null;
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive number.`);
  return value;
};

const requireId = (id) => {
  if (!isNonBlankString(id)) throw new Error('A subject id is required.');
};

// Rows written before schema migration 2 have NULL code/description. The subject
// form binds both to text inputs, so they are always returned as strings.
const toSubject = (row) => ({
  ...row,
  code: row.code ?? '',
  description: row.description ?? '',
});

// Validates the input and returns the column values shared by insert and update.
const toColumnValues = (subject) => {
  if (!subject || !isNonBlankString(subject.name)) throw new Error('Subject name is required.');

  return {
    name: subject.name.trim(),
    code: trimmedString(subject.code),
    description: trimmedString(subject.description),
    default_duration: positiveNumberOrNull(subject.default_duration, 'Default duration'),
    default_marks: positiveNumberOrNull(subject.default_marks, 'Default marks'),
  };
};

export const getAllSubjects = async () => {
  const db = await getDB();
  const res = await db.query('SELECT * FROM subjects');
  return (res.values || []).map(toSubject);
};

export const createSubject = async (subject) => {
  const v = toColumnValues(subject);
  const db = await getDB();
  const id = uuidv4();
  const now = Date.now();

  await db.run(INSERT_SUBJECT, [id, v.name, v.code, v.description, v.default_duration, v.default_marks, now, now]);
  return { id };
};

export const updateSubject = async (id, subject) => {
  requireId(id);
  const v = toColumnValues(subject);
  const db = await getDB();

  await db.run(UPDATE_SUBJECT, [v.name, v.code, v.description, v.default_duration, v.default_marks, Date.now(), id]);
  return { id };
};

export const deleteSubject = async (id) => {
  requireId(id);
  const db = await getDB();

  await db.beginTransaction();
  try {
    await db.run(`DELETE FROM questions WHERE subject_id=?`, [id], false);
    await db.run(`DELETE FROM subjects WHERE id=?`, [id], false);
    await db.commitTransaction();
  } catch (error) {
    try {
      await db.rollbackTransaction();
    } catch (rollbackError) {
      console.error('Rollback failed while deleting subject:', rollbackError);
    }
    throw error;
  }

  return { id };
};