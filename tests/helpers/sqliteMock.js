import { vi } from 'vitest';

export const mockDbConnection = {
  open: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue(),
  execute: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
  run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
  query: vi.fn().mockResolvedValue({ values: [] }),
};

export const mockSqlitePlugin = {
  createConnection: vi.fn().mockResolvedValue(mockDbConnection),
  retrieveConnection: vi.fn().mockResolvedValue(mockDbConnection),
  checkConnectionsConsistency: vi.fn().mockResolvedValue({ result: false }),
  isConnection: vi.fn().mockResolvedValue({ result: false }),
};