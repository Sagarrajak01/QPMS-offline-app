import { getDB } from '../db/database';

export const exportData = async () => {
  const db = getDB();
  const subjects = await db.query('SELECT * FROM subjects');
  const questions = await db.query('SELECT * FROM questions');
  const papers = await db.query('SELECT * FROM papers');
  const settings = await db.query('SELECT * FROM app_settings');

  const backup = {
    version: 1,
    timestamp: Date.now(),
    subjects: subjects.values || [],
    questions: questions.values || [],
    papers: papers.values || [],
    settings: settings.values || []
  };

  return JSON.stringify(backup);
};

export const importData = async (jsonString) => {
  const db = getDB();
  
  try {
    const data = JSON.parse(jsonString);
    
    // Basic validation
    if (!data.version || !Array.isArray(data.subjects) || !Array.isArray(data.questions)) {
      throw new Error('Invalid backup file format.');
    }

    await db.execute('BEGIN TRANSACTION');

    try {
      // 1. Clear existing data (Respect foreign key order by deleting children first)
      await db.execute('DELETE FROM app_settings');
      await db.execute('DELETE FROM papers');
      await db.execute('DELETE FROM questions');
      await db.execute('DELETE FROM subjects');

      // 2. Insert Subjects
      for (const s of data.subjects) {
        await db.run(
          'INSERT INTO subjects (id, name, code, description, default_duration, default_marks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.name, s.code, s.description, s.default_duration, s.default_marks, s.created_at, s.updated_at]
        );
      }

      // 3. Insert Questions
      for (const q of data.questions) {
        await db.run(
          'INSERT INTO questions (id, subject_id, unit, topic, type, difficulty, marks, text, options, correct_answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [q.id, q.subject_id, q.unit, q.topic, q.type, q.difficulty, q.marks, q.text, q.options, q.correct_answer, q.created_at, q.updated_at]
        );
      }

      // 4. Insert Papers
      for (const p of data.papers) {
        await db.run(
          'INSERT INTO papers (id, title, examination_name, subject_id, duration, max_marks, instructions, institution_name, snapshot, is_draft, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [p.id, p.title, p.examination_name, p.subject_id, p.duration, p.max_marks, p.instructions, p.institution_name, p.snapshot, p.is_draft, p.created_at, p.updated_at]
        );
      }

      // 5. Insert Settings
      for (const st of data.settings) {
        await db.run('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)', [st.key, st.value, st.updated_at]);
      }

      await db.execute('COMMIT');
      return { success: true };
      
    } catch (txnError) {
      await db.execute('ROLLBACK');
      throw txnError;
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};