import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as paperRepo from '../../src/repositories/paperRepository';
import * as dbModule from '../../src/db/database';

vi.mock('../../src/db/database', () => {
  const mockDb = {
    run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
    query: vi.fn().mockResolvedValue({ 
      values: [{ 
        id: 'p1', 
        title: 'Physics Midterm', 
        snapshot: JSON.stringify({ totalMarks: 50, sections: [] }),
        is_draft: 0
      }] 
    })
  };
  return { getDB: vi.fn(() => mockDb) };
});

describe('Paper Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a paper and serializes the complete snapshot to JSON', async () => {
    const db = dbModule.getDB();
    const paperData = {
      title: 'Math Final',
      examination_name: 'Spring 2026',
      subject_id: 'sub1',
      duration: 120,
      max_marks: 100,
      instructions: 'All questions compulsory.',
      institution_name: 'NIT Trichy',
      snapshot: { totalMarks: 100, sections: [{ name: 'A', questions: [] }] },
      is_draft: 1
    };

    const id = await paperRepo.createPaper(paperData);
    
    expect(id).toBeDefined();
    expect(db.run).toHaveBeenCalledTimes(1);
    
    const params = db.run.mock.calls[0][1];
    // Check that the snapshot was stringified before saving
    expect(params[8]).toBe(JSON.stringify(paperData.snapshot));
  });

  it('retrieves a paper and parses the JSON snapshot back to an object', async () => {
    const db = dbModule.getDB();
    const papers = await paperRepo.getPapersBySubject('sub1');
    
    expect(papers).toHaveLength(1);
    expect(papers[0].title).toBe('Physics Midterm');
    // Ensure the snapshot is a parsed JS object, not a string
    expect(typeof papers[0].snapshot).toBe('object');
    expect(papers[0].snapshot.totalMarks).toBe(50);
  });
});