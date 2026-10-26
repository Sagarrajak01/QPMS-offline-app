import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as dbModule from '../../src/db/database.js';
import * as paperRepo from '../../src/repositories/paperRepository.js';

vi.mock('../../src/db/database.js', () => {
  return { getDB: vi.fn() };
});

const placeholderCount = (sql) => (sql.match(/\?/g) || []).length;

const validPaper = {
  title: 'Midterm',
  examination_name: 'Spring 2026',
  duration: 120,
  max_marks: 100,
  instructions: 'Do all.',
  subject_id: 's1',
  institution_name: 'NIT Trichy',
  snapshot: { totalMarks: 100, sections: [] },
  is_draft: 0,
};

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

  describe('createPaper', () => {
    let mockRun;

    beforeEach(() => {
      mockRun = vi.fn().mockResolvedValue({});
      dbModule.getDB.mockResolvedValue({ run: mockRun });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('persists institution name and timestamps, with one value for every placeholder', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000);

      const { id } = await paperRepo.createPaper(validPaper);

      const [sql, params] = mockRun.mock.calls[0];
      expect(sql).toContain('institution_name');
      expect(sql).toContain('updated_at');
      expect(params).toHaveLength(placeholderCount(sql));
      expect(params).toEqual([
        id, 'Midterm', 'Spring 2026', 120, 100, 'Do all.', 's1',
        '{"totalMarks":100,"sections":[]}', 1_700_000_000_000, 0, 'NIT Trichy', 1_700_000_000_000,
      ]);
    });

    it('stores optional fields as null and defaults a missing snapshot to an empty object', async () => {
      await paperRepo.createPaper({ title: 'T', subject_id: 's1' });

      const params = mockRun.mock.calls[0][1];
      expect(params.slice(2, 6)).toEqual([null, null, null, null]);
      expect(params[7]).toBe('{}');
      expect(params[10]).toBeNull();
      expect(params).not.toContain(undefined);
    });

    it('normalizes is_draft to 0 or 1', async () => {
      await paperRepo.createPaper({ ...validPaper, is_draft: true });
      await paperRepo.createPaper({ ...validPaper, is_draft: undefined });

      expect(mockRun.mock.calls[0][1][9]).toBe(1);
      expect(mockRun.mock.calls[1][1][9]).toBe(0);
    });

    it('trims the title', async () => {
      await paperRepo.createPaper({ ...validPaper, title: '  Midterm  ' });

      expect(mockRun.mock.calls[0][1][1]).toBe('Midterm');
    });

    it.each([
      ['a missing paper', undefined, /title is required/],
      ['a missing title', { ...validPaper, title: undefined }, /title is required/],
      ['a blank title', { ...validPaper, title: '   ' }, /title is required/],
      ['a non-string title', { ...validPaper, title: 5 }, /title is required/],
      ['a missing subject', { ...validPaper, subject_id: '' }, /subject is required/],
      ['an array snapshot', { ...validPaper, snapshot: [] }, /snapshot must be an object/],
      ['a string snapshot', { ...validPaper, snapshot: '{"a":1}' }, /snapshot must be an object/],
    ])('rejects %s without touching the database', async (_label, input, message) => {
      await expect(paperRepo.createPaper(input)).rejects.toThrow(message);

      expect(dbModule.getDB).not.toHaveBeenCalled();
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('propagates database errors instead of swallowing them', async () => {
      mockRun.mockRejectedValue(new Error('disk full'));

      await expect(paperRepo.createPaper(validPaper)).rejects.toThrow('disk full');
    });

    it('propagates an unavailable database', async () => {
      dbModule.getDB.mockRejectedValue(new Error('Local storage is only available in the Android app.'));

      await expect(paperRepo.createPaper(validPaper)).rejects.toThrow(/only available in the Android app/);
    });
  });

  describe('getAllPapers', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('lists newest papers first', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ values: [] });
      dbModule.getDB.mockResolvedValue({ query: mockQuery });

      await paperRepo.getAllPapers();

      expect(mockQuery.mock.calls[0][0]).toMatch(/ORDER BY created_at DESC/);
    });

    it('keeps the rest of the library readable when one snapshot is corrupt', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        values: [
          { id: 'good', title: 'A', snapshot: '{"sections":[1]}' },
          { id: 'bad-json', title: 'B', snapshot: '{oops' },
          { id: 'bad-type', title: 'C', snapshot: '[1,2]' },
          { id: 'bad-string', title: 'D', snapshot: '"text"' },
          { id: 'empty', title: 'E', snapshot: null },
        ],
      });
      dbModule.getDB.mockResolvedValue({ query: mockQuery });

      const papers = await paperRepo.getAllPapers();

      expect(papers.map((p) => p.id)).toEqual(['good', 'bad-json', 'bad-type', 'bad-string', 'empty']);
      expect(papers[0].snapshot).toEqual({ sections: [1] });
      expect(papers.slice(1).every((p) => JSON.stringify(p.snapshot) === '{}')).toBe(true);
      expect(console.warn).toHaveBeenCalledTimes(3); // a missing snapshot is normal and not warned about
    });

    it('preserves the other columns, including a NULL institution on legacy rows', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        values: [{ id: 'p1', title: 'T', institution_name: null, created_at: 5, snapshot: '{}' }],
      });
      dbModule.getDB.mockResolvedValue({ query: mockQuery });

      const [paper] = await paperRepo.getAllPapers();

      expect(paper).toMatchObject({ id: 'p1', title: 'T', institution_name: null, created_at: 5 });
    });

    it('returns an empty list when the query has no values', async () => {
      dbModule.getDB.mockResolvedValue({ query: vi.fn().mockResolvedValue({}) });

      await expect(paperRepo.getAllPapers()).resolves.toEqual([]);
    });
  });

  describe('deletePaper', () => {
    it('deletes by id with a bound parameter', async () => {
      const mockRun = vi.fn().mockResolvedValue({});
      dbModule.getDB.mockResolvedValue({ run: mockRun });

      await expect(paperRepo.deletePaper('p1')).resolves.toEqual({ id: 'p1' });

      expect(mockRun).toHaveBeenCalledWith('DELETE FROM papers WHERE id=?', ['p1']);
    });
  });
});