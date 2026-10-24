import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db = null;

export const initDB = async () => {
  if (Capacitor.getPlatform() === 'web') return true; 
  
  try {
    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection("qpms_db", false)).result;
    
    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection("qpms_db", false);
    } else {
      db = await sqlite.createConnection("qpms_db", false, "no-encryption", 1, false);
    }
    
    await db.open();
    
    // Enforce Foreign Keys & create schema
    await db.execute('PRAGMA foreign_keys = ON;');
    const schema = `
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT, default_duration INTEGER, default_marks INTEGER
      );
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, type TEXT, difficulty TEXT, marks INTEGER, text TEXT, options TEXT, correct_answer TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS papers (
        id TEXT PRIMARY KEY, title TEXT, examination_name TEXT, duration INTEGER, max_marks INTEGER, instructions TEXT, subject_id TEXT, snapshot TEXT, created_at INTEGER, is_draft INTEGER
      );
    `;
    await db.execute(schema);
    return true;
  } catch (err) {
    console.error("Native DB Init Error:", err);
    return false;
  }
};

export const getDB = async () => {
  if (!db) await initDB();
  return db;
};