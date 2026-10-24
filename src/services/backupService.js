import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { getAllQuestions } from '../repositories/questionRepository.js';
import { getAllPapers } from '../repositories/paperRepository.js';
import { getDB } from '../db/database.js';

export const exportDatabase = async () => {
  try {
    const subjects = await getAllSubjects();
    const questions = await getAllQuestions();
    const papers = await getAllPapers();

    const backupData = {
      version: 1,
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

    return { success: true, message: "Backup exported successfully." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const importDatabase = async (jsonString) => {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup.data || !backup.data.subjects || !backup.data.questions) {
      throw new Error("Invalid backup file format.");
    }

    const db = await getDB();
    
    // Execute inside a transaction so if it fails, it rolls back without destroying current data
    await db.execute('BEGIN TRANSACTION;');

    // 1. Clear existing data
    await db.execute('DELETE FROM papers;');
    await db.execute('DELETE FROM questions;');
    await db.execute('DELETE FROM subjects;');

    // 2. Insert Subjects
    for (const sub of backup.data.subjects) {
      await db.run(
        `INSERT INTO subjects (id, name, code, default_duration, default_marks) VALUES (?, ?, ?, ?, ?)`,
        [sub.id, sub.name, sub.code, sub.default_duration, sub.default_marks]
      );
    }

    // 3. Insert Questions (Stringify nested JSON)
    for (const q of backup.data.questions) {
      await db.run(
        `INSERT INTO questions (id, subject_id, type, difficulty, marks, text, options, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.id, q.subject_id, q.type, q.difficulty, q.marks, q.text, JSON.stringify(q.options || []), q.correct_answer]
      );
    }

    // 4. Insert Papers (Stringify nested JSON)
    if (backup.data.papers) {
      for (const p of backup.data.papers) {
        await db.run(
          `INSERT INTO papers (id, title, examination_name, duration, max_marks, instructions, subject_id, snapshot, created_at, is_draft) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.title, p.examination_name, p.duration, p.max_marks, p.instructions, p.subject_id, JSON.stringify(p.snapshot || {}), p.created_at, p.is_draft]
        );
      }
    }

    await db.execute('COMMIT;');
    return { success: true, message: "Database restored successfully." };
  } catch (error) {
    const db = await getDB();
    await db.execute('ROLLBACK;');
    return { success: false, message: error.message };
  }
};