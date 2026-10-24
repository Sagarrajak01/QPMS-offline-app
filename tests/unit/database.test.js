import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initDB, getDB, closeDB } from '../../src/db/database';

// 1. Hoist the mock data creation
const { mockSqlitePlugin, mockDbConnection } = vi.hoisted(() => {
  const db = {
    open: vi.fn().mockResolvedValue(),
    close: vi.fn().mockResolvedValue(),
    execute: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
    run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
    query: vi.fn().mockResolvedValue({ values: [] }),
  };
  
  const plugin = {
    createConnection: vi.fn().mockResolvedValue(db),
    retrieveConnection: vi.fn().mockResolvedValue(db),
    checkConnectionsConsistency: vi.fn().mockResolvedValue({ result: false }),
    isConnection: vi.fn().mockResolvedValue({ result: false }),
  };

  return { mockDbConnection: db, mockSqlitePlugin: plugin };
});

// 2. Apply the mock
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: mockSqlitePlugin,
}));

describe('Database Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes the database connection and runs migrations', async () => {
    await initDB();
    expect(mockSqlitePlugin.createConnection).toHaveBeenCalledWith({
      database: 'qpms_db',
      encrypted: false,
      mode: 'no-encryption',
      version: 1,
      readonly: false
    });
    expect(mockDbConnection.open).toHaveBeenCalled();
    expect(mockDbConnection.execute).toHaveBeenCalled(); 
  });

  it('returns the defined database instance via getDB', () => {
    const db = getDB();
    expect(db).toBeDefined(); 
  });
});