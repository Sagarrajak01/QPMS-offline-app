import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { getAllQuestions } from '../repositories/questionRepository.js';
import { getAllPapers } from '../repositories/paperRepository.js';
import { getDB } from '../db/database.js';

const BACKUP_VERSION = 2;
const MIN_SUPPORTED_BACKUP_VERSION = 1;

const INSERT_SUBJECT =
  'INSERT INTO subjects (id, name, code, description, default_duration, default_marks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
const INSERT_QUESTION =
  'INSERT INTO questions (id, subject_id, type, difficulty, marks, text, unit, topic, options, correct_answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
const INSERT_PAPER =
  'INSERT INTO papers (id, title, examination_name, duration, max_marks, instructions, subject_id, institution_name, snapshot, is_draft, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

/** A problem with the backup file itself, as opposed to a storage failure. */
class BackupFormatError extends Error {}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const orNull = (value) => value ?? null;
const timestampOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);

const requireArray = (label, value) => {
  if (!Array.isArray(value)) {
    throw new BackupFormatError(`Invalid backup file format: "${label}" must be a list.`);
  }
  return value;
};

// Checks the fields common to every record (object, unique id) and returns the set
// of ids so later sections can verify references.
const validateRecords = (label, records, validateRecord) => {
  const ids = new Set();

  records.forEach((record, index) => {
    const where = `${label} #${index + 1}`;

    if (!isPlainObject(record)) throw new BackupFormatError(`${where} is not a valid record.`);
    if (!isNonEmptyString(record.id)) throw new BackupFormatError(`${where} is missing an id.`);
    if (ids.has(record.id)) throw new BackupFormatError(`${where} has a duplicate id.`);

    ids.add(record.id);
    validateRecord(record, where);
  });

  return ids;
};


const parseBackup = (jsonString) => {
  if (typeof jsonString !== 'string' || jsonString.trim() === '') {
    throw new BackupFormatError('The backup file is empty.');
  }

  let backup;
  try {
    backup = JSON.parse(jsonString);
  } catch {
    throw new BackupFormatError('The backup file is not valid JSON.');
  }

  if (!isPlainObject(backup) || !isPlainObject(backup.data)) {
    throw new BackupFormatError('Invalid backup file format.');
  }

  const { version } = backup;
  if (!Number.isInteger(version) || version < MIN_SUPPORTED_BACKUP_VERSION) {
    throw new BackupFormatError('Unrecognized backup version.');
  }
  if (version > BACKUP_VERSION) {
    throw new BackupFormatError(
      `This backup was created by a newer version of QPMS (backup format ${version}). Update the app to restore it.`
    );
  }

  const subjects = requireArray('subjects', backup.data.subjects);
  const questions = requireArray('questions', backup.data.questions);
  const papers = requireArray('papers', backup.data.papers ?? []);

  const subjectIds = validateRecords('Subject', subjects, (subject, where) => {
    if (!isNonEmptyString(subject.name)) throw new BackupFormatError(`${where} is missing a name.`);
  });

  validateRecords('Question', questions, (question, where) => {
    if (!isNonEmptyString(question.text)) throw new BackupFormatError(`${where} is missing its text.`);
    if (!subjectIds.has(question.subject_id)) {
      throw new BackupFormatError(`${where} refers to a subject that is not in the backup.`);
    }
    if (question.options != null && !(Array.isArray(question.options) && question.options.every((o) => typeof o === 'string'))) {
      throw new BackupFormatError(`${where} has invalid options.`);
    }
    if (question.marks != null && !Number.isFinite(question.marks)) {
      throw new BackupFormatError(`${where} has invalid marks.`);
    }
  });

  validateRecords('Paper', papers, (paper, where) => {
    if (paper.snapshot != null && !isPlainObject(paper.snapshot)) {
      throw new BackupFormatError(`${where} has an invalid snapshot.`);
    }
  });

  return { subjects, questions, papers };
};

export const exportDatabase = async () => {
  try {
    const subjects = await getAllSubjects();
    const questions = await getAllQuestions();
    const papers = await getAllPapers();

    const backupData = {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      data: { subjects, questions, papers }
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const fileName = `QPMS_Backup_${new Date().getTime()}.json`;

    // Write the file to Android Native Cache Storage
    const result = await Filesystem.writeFile({
      path: fileName,
      data: jsonStr,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    // Trigger the Native Android "Share/Save" Intent
    await Share.share({
      title: 'QPMS Database Backup',
      text: 'Here is your QPMS database backup file.',
      url: result.uri,
      dialogTitle: 'Save Backup File'
    });

    return { success: true, message: 'Backup exported successfully.' };
  } catch (error) {
    return { success: false, message: error?.message || 'Backup export failed.' };
  }
};


const runInTransaction = async (work, fallbackMessage) => {
  let db = null;
  let transactionStarted = false;

  try {
    db = await getDB();
    await db.beginTransaction();
    transactionStarted = true;

    await work(db);

    await db.commitTransaction();
    transactionStarted = false;
    return { success: true };
  } catch (error) {
    let message = error?.message || fallbackMessage;
    if (!/[.!?]$/.test(message)) message += '.';

    if (transactionStarted) {
      try {
        await db.rollbackTransaction();
        message += ' Your existing data was not changed.';
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        message += ' Rolling back also failed; restart the app and verify your data.';
      }
    }

    return { success: false, message };
  }
};

// Children first, so foreign keys are never violated while deleting.
const deleteAllRows = async (db) => {
  await db.execute('DELETE FROM papers;', false);
  await db.execute('DELETE FROM questions;', false);
  await db.execute('DELETE FROM subjects;', false);
};

export const importDatabase = async (jsonString) => {
  let data;
  try {
    data = parseBackup(jsonString);
  } catch (error) {
    if (error instanceof BackupFormatError) return { success: false, message: error.message };
    throw error;
  }

  const now = Date.now();

  const result = await runInTransaction(async (db) => {
    await deleteAllRows(db);

    for (const s of data.subjects) {
      await db.run(
        INSERT_SUBJECT,
        [
          s.id, s.name, orNull(s.code), orNull(s.description), orNull(s.default_duration), orNull(s.default_marks),
          timestampOr(s.created_at, now), timestampOr(s.updated_at, now)
        ],
        false
      );
    }

    for (const q of data.questions) {
      await db.run(
        INSERT_QUESTION,
        [
          q.id, q.subject_id, orNull(q.type), orNull(q.difficulty), orNull(q.marks), q.text,
          orNull(q.unit), orNull(q.topic), JSON.stringify(q.options ?? []), orNull(q.correct_answer),
          timestampOr(q.created_at, now), timestampOr(q.updated_at, now)
        ],
        false
      );
    }

    for (const p of data.papers) {
      await db.run(
        INSERT_PAPER,
        [
          p.id, orNull(p.title), orNull(p.examination_name), orNull(p.duration), orNull(p.max_marks),
          orNull(p.instructions), orNull(p.subject_id), orNull(p.institution_name), JSON.stringify(p.snapshot ?? {}),
          p.is_draft ? 1 : 0, timestampOr(p.created_at, now), timestampOr(p.updated_at, now)
        ],
        false
      );
    }
  }, 'Restore failed.');

  if (!result.success) return result;

  return {
    success: true,
    message: `Database restored successfully (${data.subjects.length} subjects, ${data.questions.length} questions, ${data.papers.length} papers).`
  };
};

export const clearDatabase = async () => {
  const result = await runInTransaction(deleteAllRows, 'Could not delete the data.');

  return result.success ? { success: true, message: 'All data has been deleted.' } : result;
};