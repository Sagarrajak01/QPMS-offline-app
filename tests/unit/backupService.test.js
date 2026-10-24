import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportData, importData } from '../../src/services/backupService';

// Hoist mocks
const { mockRun, mockQuery, mockExecute } = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockQuery: vi.fn().mockResolvedValue({ values: [] }),
  mockExecute: vi.fn()
}));

vi.mock('../../src/db/database', () => ({
  getDB: vi.fn(() => ({
    run: mockRun,
    query: mockQuery,
    execute: mockExecute
  }))
}));

describe('Backup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports data to a structured JSON string', async () => {
    mockQuery.mockResolvedValueOnce({ values: [{ id: 's1', name: 'Math' }] }) // subjects
             .mockResolvedValueOnce({ values: [{ id: 'q1' }] }) // questions
             .mockResolvedValueOnce({ values: [{ id: 'p1' }] }) // papers
             .mockResolvedValueOnce({ values: [{ key: 'theme', value: 'dark' }] }); // settings

    const backupJSON = await exportData();
    const data = JSON.parse(backupJSON);

    expect(data.version).toBe(1);
    expect(data.subjects).toHaveLength(1);
    expect(data.questions).toHaveLength(1);
    expect(data.papers).toHaveLength(1);
    expect(data.settings).toHaveLength(1);
  });

  it('imports valid JSON data using transactions', async () => {
    const validJSON = JSON.stringify({
      version: 1,
      subjects: [{ id: 's1', name: 'Math', code: '', description: '', default_duration: 60, default_marks: 100, created_at: 123, updated_at: 123 }],
      questions: [],
      papers: [],
      settings: []
    });

    const result = await importData(validJSON);
    expect(result.success).toBe(true);
    
    // Verify Transaction Handling
    expect(mockExecute).toHaveBeenCalledWith('BEGIN TRANSACTION');
    expect(mockExecute).toHaveBeenCalledWith('DELETE FROM subjects'); // Clear existing
    expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO subjects'), expect.any(Array));
    expect(mockExecute).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back on invalid JSON or database error', async () => {
    const result = await importData('{"invalid_format": true}'); // Missing version/arrays
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid backup file');
  });
});