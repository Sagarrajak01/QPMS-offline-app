import { describe, it, expect, vi } from 'vitest';
import { initDB, getDB } from '../../src/db/database';

// Mock Capacitor Core
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' }
}));

// Mock Capacitor SQLite Native Plugin
vi.mock('@capacitor-community/sqlite', () => {
  const mockDb = {
    open: vi.fn().mockResolvedValue(true),
    execute: vi.fn().mockResolvedValue(true),
  };
  
  // Use a class so it can be instantiated with 'new' in the source file
  class MockSQLiteConnection {
    checkConnectionsConsistency = vi.fn().mockResolvedValue({ result: false });
    isConnection = vi.fn().mockResolvedValue({ result: false });
    createConnection = vi.fn().mockResolvedValue(mockDb);
    retrieveConnection = vi.fn().mockResolvedValue(mockDb);
  }

  return {
    CapacitorSQLite: {},
    SQLiteConnection: MockSQLiteConnection
  };
});

describe('Database Engine', () => {
  it('initializes the native database connection and executes schema', async () => {
    const result = await initDB();
    expect(result).toBe(true);
    
    const db = await getDB();
    expect(db.open).toHaveBeenCalled();
    expect(db.execute).toHaveBeenCalled();
  });
});