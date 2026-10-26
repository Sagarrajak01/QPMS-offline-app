import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'qpms_db';
export class DatabaseUnavailableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'DatabaseUnavailableError';
  }
}

const MIGRATIONS = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT, default_duration INTEGER, default_marks INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, type TEXT, difficulty TEXT, marks INTEGER, text TEXT, options TEXT, correct_answer TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS papers (
        id TEXT PRIMARY KEY, title TEXT, examination_name TEXT, duration INTEGER, max_marks INTEGER, instructions TEXT, subject_id TEXT, snapshot TEXT, created_at INTEGER, is_draft INTEGER
      )`,
    ],
  },
  {
    version: 2,
    statements: [
      'ALTER TABLE subjects ADD COLUMN description TEXT',
      'ALTER TABLE subjects ADD COLUMN created_at INTEGER',
      'ALTER TABLE subjects ADD COLUMN updated_at INTEGER',
      'ALTER TABLE questions ADD COLUMN unit TEXT',
      'ALTER TABLE questions ADD COLUMN topic TEXT',
      'ALTER TABLE questions ADD COLUMN created_at INTEGER',
      'ALTER TABLE questions ADD COLUMN updated_at INTEGER',
      'ALTER TABLE papers ADD COLUMN institution_name TEXT',
      'ALTER TABLE papers ADD COLUMN updated_at INTEGER',
    ],
  },
];

const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db = null;
let initPromise = null;

const connect = async () => {
  const consistency = await sqlite.checkConnectionsConsistency();
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;

  if (consistency.result && exists) {
    return sqlite.retrieveConnection(DB_NAME, false);
  }
  return sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
};

const readPragma = async (conn, name) => {
  const res = await conn.query(`PRAGMA ${name};`);
  // Ignore any non-row entries the plugin may prepend on some platforms.
  const row = (res?.values || []).find((r) => r && name in r);
  return row ? Number(row[name]) || 0 : 0;
};

const enableForeignKeys = async (conn) => {
  // SQLite silently ignores this pragma inside a transaction, and the plugin's
  // execute() opens one by default, so the second argument must be false.
  await conn.execute('PRAGMA foreign_keys = ON;', false);

  if ((await readPragma(conn, 'foreign_keys')) !== 1) {
    console.warn('SQLite foreign key enforcement could not be enabled.');
  }
};

const runMigrations = async (conn) => {
  const currentVersion = await readPragma(conn, 'user_version');

  if (currentVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${currentVersion} is newer than this app supports (${LATEST_SCHEMA_VERSION}). Please update the app.`
    );
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    // Statements and the version bump share one transaction (the plugin's
    // default), so a failed migration leaves the database untouched.
    const sql = [...migration.statements, `PRAGMA user_version = ${migration.version}`].join(';\n');
    await conn.execute(sql, true);
  }
};

const closeQuietly = async (conn) => {
  try {
    await conn.close();
  } catch (closeError) {
    console.error('Failed to close database after initialization error:', closeError);
  }
};

const openDatabase = async () => {
  const conn = await connect();
  await conn.open();

  try {
    await enableForeignKeys(conn);
    await runMigrations(conn);
  } catch (err) {
    await closeQuietly(conn);
    throw err;
  }

  return conn;
};

export const initDB = () => {
  if (db) return Promise.resolve(true);

  if (!initPromise) {
    initPromise = (async () => {
      if (Capacitor.getPlatform() === 'web') {
        throw new DatabaseUnavailableError(
          'Local storage is only available in the Android app. The web build has no database.'
        );
      }

      try {
        db = await openDatabase();
        return true;
      } catch (err) {
        console.error('Native DB Init Error:', err);
        throw new DatabaseUnavailableError(`Failed to initialize the local database: ${err.message}`, { cause: err });
      }
    })().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
};

export const getDB = async () => {
  await initDB();
  return db;
};