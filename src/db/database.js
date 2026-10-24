import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { MIGRATIONS } from './schema';

let dbConnection = null;
const DB_NAME = 'qpms_db';

export const initDB = async () => {
  try {
    const isConn = await CapacitorSQLite.isConnection({ database: DB_NAME });
    
    if (isConn.result) {
      dbConnection = await CapacitorSQLite.retrieveConnection({ database: DB_NAME });
    } else {
      dbConnection = await CapacitorSQLite.createConnection({
        database: DB_NAME,
        encrypted: false,
        mode: 'no-encryption',
        version: 1,
        readonly: false
      });
    }

    await dbConnection.open();
    await runMigrations();
    
    return dbConnection;
  } catch (error) {
    console.error('Error initializing database', error);
    throw error;
  }
};

const runMigrations = async () => {
  if (!dbConnection) throw new Error('Database connection not established');
  
  // Create migrations table if not exists (fail-safe outside of normal migration flow)
  await dbConnection.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      executed_at INTEGER NOT NULL
    );
  `);

  const res = await dbConnection.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
  const currentVersion = res.values.length > 0 ? res.values[0].version : 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      await dbConnection.execute(migration.statement);
      await dbConnection.run(
        'INSERT INTO schema_migrations (version, executed_at) VALUES (?, ?)',
        [migration.version, Date.now()]
      );
    }
  }
};

export const getDB = () => {
  if (!dbConnection) {
    console.warn('Database accessed before initialization');
  }
  return dbConnection;
};

export const closeDB = async () => {
  if (dbConnection) {
    await dbConnection.close();
    dbConnection = null;
  }
};