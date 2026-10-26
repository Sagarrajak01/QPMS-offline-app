import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const makeConnection = ({ userVersion = 0, foreignKeys = 1 } = {}) => ({
  open: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue(),
  execute: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
  query: vi.fn(async (sql) => {
    if (/user_version/i.test(sql)) return { values: [{ user_version: userVersion }] };
    if (/foreign_keys/i.test(sql)) return { values: [{ foreign_keys: foreignKeys }] };
    return { values: [] };
  }),
});

// The module keeps connection state, so each test loads a fresh copy with its own mocks.
const loadDatabaseModule = async ({ platform = 'android', connection = makeConnection() } = {}) => {
  vi.resetModules();

  const sqliteApi = {
    checkConnectionsConsistency: vi.fn().mockResolvedValue({ result: false }),
    isConnection: vi.fn().mockResolvedValue({ result: false }),
    createConnection: vi.fn().mockResolvedValue(connection),
    retrieveConnection: vi.fn().mockResolvedValue(connection),
  };

  vi.doMock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => platform } }));
  vi.doMock('@capacitor-community/sqlite', () => ({
    CapacitorSQLite: {},
    SQLiteConnection: class {
      constructor() {
        return sqliteApi;
      }
    },
  }));

  const mod = await import('../../src/db/database.js');
  return { ...mod, sqliteApi, connection };
};

const executedSql = (connection) => connection.execute.mock.calls.map(([sql]) => sql);

describe('Database Engine', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor-community/sqlite');
  });

  describe('web platform', () => {
    it('rejects with DatabaseUnavailableError instead of pretending storage works', async () => {
      const { initDB, getDB, DatabaseUnavailableError, sqliteApi } = await loadDatabaseModule({ platform: 'web' });

      await expect(initDB()).rejects.toBeInstanceOf(DatabaseUnavailableError);
      await expect(getDB()).rejects.toBeInstanceOf(DatabaseUnavailableError);
      expect(sqliteApi.createConnection).not.toHaveBeenCalled();
    });
  });

  describe('fresh install', () => {
    it('enables foreign keys outside a transaction, then applies every migration in order', async () => {
      const { initDB, connection } = await loadDatabaseModule();

      await expect(initDB()).resolves.toBe(true);

      expect(connection.open).toHaveBeenCalledTimes(1);

      const calls = connection.execute.mock.calls;
      expect(calls[0]).toEqual(['PRAGMA foreign_keys = ON;', false]);

      const [, v1, v2] = calls;
      expect(calls).toHaveLength(3);
      expect(v1[1]).toBe(true);
      expect(v1[0]).toContain('CREATE TABLE IF NOT EXISTS subjects');
      expect(v1[0]).toContain('CREATE TABLE IF NOT EXISTS questions');
      expect(v1[0]).toContain('CREATE TABLE IF NOT EXISTS papers');
      expect(v1[0].endsWith('PRAGMA user_version = 1')).toBe(true);

      expect(v2[1]).toBe(true);
      expect(v2[0]).toContain('ALTER TABLE questions ADD COLUMN unit TEXT');
      expect(v2[0]).toContain('ALTER TABLE questions ADD COLUMN topic TEXT');
      expect(v2[0]).toContain('ALTER TABLE papers ADD COLUMN institution_name TEXT');
      expect(v2[0].endsWith('PRAGMA user_version = 2')).toBe(true);
    });

    it('formats migrations the way the native plugin parses them', async () => {
      const { initDB, connection } = await loadDatabaseModule();
      await initDB();

      for (const sql of executedSql(connection).slice(1)) {
        expect(sql).not.toContain('--');
        // Every statement but the last must be terminated by ";\n" (the plugin's separator).
        const statements = sql.split(';\n');
        expect(statements.length).toBeGreaterThan(1);
        statements.forEach((s) => expect(s.trim()).not.toBe(''));
      }
    });
  });

  describe('existing installs', () => {
    it('upgrades a legacy (unversioned) database by running the baseline and then the column additions', async () => {
      // Legacy installs have user_version 0 but already contain the baseline tables.
      const { initDB, connection } = await loadDatabaseModule({ connection: makeConnection({ userVersion: 0 }) });
      await initDB();

      const sql = executedSql(connection);
      expect(sql.some((s) => s.includes('CREATE TABLE IF NOT EXISTS'))).toBe(true);
      expect(sql.some((s) => s.includes('ALTER TABLE questions ADD COLUMN unit'))).toBe(true);
    });

    it('only applies migrations newer than the stored version', async () => {
      const { initDB, connection } = await loadDatabaseModule({ connection: makeConnection({ userVersion: 1 }) });
      await initDB();

      const sql = executedSql(connection);
      expect(sql).toHaveLength(2); // foreign keys pragma + migration 2
      expect(sql[1]).toContain('ALTER TABLE');
      expect(sql[1]).not.toContain('CREATE TABLE');
    });

    it('does nothing when the schema is already current', async () => {
      const { initDB, connection } = await loadDatabaseModule({ connection: makeConnection({ userVersion: 2 }) });
      await initDB();

      expect(executedSql(connection)).toEqual(['PRAGMA foreign_keys = ON;']);
    });

    it('refuses a database created by a newer app version and closes the connection', async () => {
      const { initDB, DatabaseUnavailableError, connection } = await loadDatabaseModule({
        connection: makeConnection({ userVersion: 99 }),
      });

      await expect(initDB()).rejects.toBeInstanceOf(DatabaseUnavailableError);
      await expect(initDB()).rejects.toThrow(/newer than this app supports/);
      expect(connection.close).toHaveBeenCalled();
    });

    it('reuses an existing plugin connection when one is already registered', async () => {
      const { initDB, sqliteApi } = await loadDatabaseModule({ connection: makeConnection({ userVersion: 2 }) });
      sqliteApi.checkConnectionsConsistency.mockResolvedValue({ result: true });
      sqliteApi.isConnection.mockResolvedValue({ result: true });

      await initDB();

      expect(sqliteApi.retrieveConnection).toHaveBeenCalledWith('qpms_db', false);
      expect(sqliteApi.createConnection).not.toHaveBeenCalled();
    });
  });

  describe('failure handling', () => {
    it('rejects, closes the connection, and allows a later retry to succeed', async () => {
      const connection = makeConnection();
      const { initDB, getDB, DatabaseUnavailableError } = await loadDatabaseModule({ connection });

      connection.execute.mockImplementation(async (sql) => {
        if (sql.includes('CREATE TABLE')) throw new Error('disk full');
        return { changes: { changes: 0 } };
      });

      const failure = initDB();
      await expect(failure).rejects.toBeInstanceOf(DatabaseUnavailableError);
      await expect(failure).rejects.toThrow(/disk full/);
      expect(connection.close).toHaveBeenCalledTimes(1);

      connection.execute.mockResolvedValue({ changes: { changes: 0 } });
      await expect(initDB()).resolves.toBe(true);
      await expect(getDB()).resolves.toBe(connection);
    });

    it('still opens the database (with a warning) if foreign keys cannot be verified', async () => {
      const { initDB } = await loadDatabaseModule({ connection: makeConnection({ userVersion: 2, foreignKeys: 0 }) });

      await expect(initDB()).resolves.toBe(true);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('connection lifecycle', () => {
    it('shares a single initialization between concurrent callers', async () => {
      const { initDB, getDB, sqliteApi, connection } = await loadDatabaseModule();

      const results = await Promise.all([initDB(), getDB(), getDB()]);

      expect(results[0]).toBe(true);
      expect(results[1]).toBe(connection);
      expect(results[2]).toBe(connection);
      expect(sqliteApi.createConnection).toHaveBeenCalledTimes(1);
      expect(connection.open).toHaveBeenCalledTimes(1);
    });

    it('returns the same connection on later calls without reinitializing', async () => {
      const { getDB, sqliteApi, connection } = await loadDatabaseModule();

      const first = await getDB();
      const second = await getDB();

      expect(first).toBe(connection);
      expect(second).toBe(first);
      expect(sqliteApi.createConnection).toHaveBeenCalledTimes(1);
    });
  });
});