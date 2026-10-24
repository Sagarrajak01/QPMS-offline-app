import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dbModule from '../../src/db/database.js';
import * as paperRepo from '../../src/repositories/paperRepository.js';

vi.mock('../../src/db/database.js', () => {
  return { getDB: vi.fn() };
});

describe('Paper Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a paper and serializes the complete snapshot to JSON', async () => {
    const mockRun = vi.fn().mockResolvedValue({ changes: 1 });
    dbModule.getDB.mockResolvedValue({ run: mockRun });

    const paper = {
      title: 'Midterm',
      examination_name: 'Spring 2026',
      duration: 120,
      max_marks: 100,
      instructions: 'Do all.',
      subject_id: 's1',
      snapshot: { totalMarks: 100, sections: [] }
    };

    await paperRepo.createPaper(paper);

    expect(mockRun).toHaveBeenCalled();
    const params = mockRun.mock.calls[0][1];
    
    // In native insert array, snapshot is index 7
    expect(params[7]).toBe(JSON.stringify(paper.snapshot));
  });

  it('retrieves a paper and parses the JSON snapshot back to an object', async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      values: [
        { id: 'p1', snapshot: '{"totalMarks":100}' }
      ]
    });
    dbModule.getDB.mockResolvedValue({ query: mockQuery });

    const papers = await paperRepo.getAllPapers();

    expect(papers).toHaveLength(1);
    expect(papers[0].snapshot).toEqual({ totalMarks: 100 });
  });
});