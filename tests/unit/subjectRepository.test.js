import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDB } from '../../src/db/database.js';
import {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../../src/repositories/subjectRepository.js';

vi.mock('../../src/db/database.js', () => ({ getDB: vi.fn() }));

const placeholderCount = (sql) => (sql.match(/\?/g) || []).length;

const validSubject = {
  name: 'Physics',
  code: 'PHY101',
  description: 'Mechanics and waves',
  default_duration: 180,
  default_marks: 100,
};

const makeDb = () => {
  const calls = [];
  const record = (name) => vi.fn(async (...args) => { calls.push({ name, args }); return {}; });
  return {
    calls,
    query: vi.fn().mockResolvedValue({ values: [] }),
    run: record('run'),
    beginTransaction: record('begin'),
    commitTransaction: record('commit'),
    rollbackTransaction: record('rollback'),
  };
};

describe('Subject Repository', () => {
  let db;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db = makeDb();
    getDB.mockResolvedValue(db);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('getAllSubjects', () => {
    it('returns subjects with code and description as strings, including legacy NULLs', async () => {
      db.query.mockResolvedValue({
        values: [
          { id: 's1', name: 'Physics', code: 'PHY', description: 'Mech', default_duration: 60 },
          { id: 's2', name: 'Legacy', code: null, description: null, default_duration: 90 },
        ],
      });

      const subjects = await getAllSubjects();

      expect(db.query).toHaveBeenCalledWith('SELECT * FROM subjects');
      expect(subjects[0]).toMatchObject({ id: 's1', code: 'PHY', description: 'Mech', default_duration: 60 });
      expect(subjects[1]).toMatchObject({ id: 's2', code: '', description: '', default_duration: 90 });
    });

    it('returns an empty list when there are no values', async () => {
      db.query.mockResolvedValue({});

      await expect(getAllSubjects()).resolves.toEqual([]);
    });

    it('propagates an unavailable database', async () => {
      getDB.mockRejectedValue(new Error('Local storage is only available in the Android app.'));

      await expect(getAllSubjects()).rejects.toThrow(/only available in the Android app/);
    });
  });

  describe('createSubject', () => {
    it('persists the description and timestamps, with one value for every placeholder', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000);

      const { id } = await createSubject(validSubject);

      const [sql, params] = db.run.mock.calls[0];
      expect(sql).toContain('INSERT INTO subjects');
      expect(sql).toContain('description');
      expect(sql).toMatch(/created_at, updated_at/);
      expect(params).toHaveLength(placeholderCount(sql));
      expect(params).toEqual([
        id, 'Physics', 'PHY101', 'Mechanics and waves', 180, 100, 1_700_000_000_000, 1_700_000_000_000,
      ]);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('trims text and stores missing code/description as empty strings and missing numbers as null', async () => {
      await createSubject({ name: '  Maths  ', code: undefined, description: '   ' });

      const params = db.run.mock.calls[0][1];
      expect(params.slice(1, 6)).toEqual(['Maths', '', '', null, null]);
      expect(params).not.toContain(undefined);
    });

    it.each([
      ['a missing subject', undefined, /name is required/],
      ['a missing name', { ...validSubject, name: undefined }, /name is required/],
      ['a blank name', { ...validSubject, name: '   ' }, /name is required/],
      ['a non-string name', { ...validSubject, name: 7 }, /name is required/],
      ['zero duration', { ...validSubject, default_duration: 0 }, /Default duration must be a positive number/],
      ['negative duration', { ...validSubject, default_duration: -5 }, /Default duration must be a positive number/],
      ['NaN marks', { ...validSubject, default_marks: NaN }, /Default marks must be a positive number/],
      ['string marks', { ...validSubject, default_marks: '100' }, /Default marks must be a positive number/],
    ])('rejects %s without touching the database', async (_label, input, message) => {
      await expect(createSubject(input)).rejects.toThrow(message);

      expect(getDB).not.toHaveBeenCalled();
      expect(db.run).not.toHaveBeenCalled();
    });

    it('propagates database errors instead of swallowing them', async () => {
      db.run.mockRejectedValue(new Error('disk full'));

      await expect(createSubject(validSubject)).rejects.toThrow('disk full');
    });
  });

  describe('updateSubject', () => {
    it('updates every editable column and updated_at, leaving created_at alone', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_800_000_000_000);

      const result = await updateSubject('s9', { ...validSubject, description: 'New description' });

      const [sql, params] = db.run.mock.calls[0];
      expect(result).toEqual({ id: 's9' });
      expect(sql).toContain('UPDATE subjects SET');
      expect(sql).not.toContain('created_at');
      expect(sql).toContain('description=?');
      expect(params).toHaveLength(placeholderCount(sql));
      expect(params).toEqual(['Physics', 'PHY101', 'New description', 180, 100, 1_800_000_000_000, 's9']);
    });

    it('ignores extra fields passed in from the form, such as id and timestamps', async () => {
      await updateSubject('s9', { ...validSubject, id: 'other', created_at: 1, updated_at: 2 });

      const params = db.run.mock.calls[0][1];
      expect(params).not.toContain('other');
      expect(params.at(-1)).toBe('s9');
    });

    it.each([
      ['a missing id', undefined, validSubject, /subject id is required/],
      ['a blank id', '  ', validSubject, /subject id is required/],
      ['a blank name', 's9', { ...validSubject, name: '' }, /name is required/],
    ])('rejects %s without touching the database', async (_label, id, subject, message) => {
      await expect(updateSubject(id, subject)).rejects.toThrow(message);

      expect(db.run).not.toHaveBeenCalled();
    });
  });

  describe('deleteSubject', () => {
    it('deletes the questions and the subject inside one explicit transaction', async () => {
      await expect(deleteSubject('s1')).resolves.toEqual({ id: 's1' });

      expect(db.calls.map((c) => c.name)).toEqual(['begin', 'run', 'run', 'commit']);
      expect(db.calls[1].args).toEqual(['DELETE FROM questions WHERE subject_id=?', ['s1'], false]);
      expect(db.calls[2].args).toEqual(['DELETE FROM subjects WHERE id=?', ['s1'], false]);
      expect(db.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('never touches papers', async () => {
      await deleteSubject('s1');

      expect(db.calls.some((c) => /papers/i.test(String(c.args[0])))).toBe(false);
    });

    it('rolls back and rethrows when the second delete fails, so no questions are lost', async () => {
      let runCount = 0;
      db.run.mockImplementation(async () => {
        runCount += 1;
        if (runCount === 2) throw new Error('disk full');
        return {};
      });

      await expect(deleteSubject('s1')).rejects.toThrow('disk full');

      expect(db.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(db.commitTransaction).not.toHaveBeenCalled();
    });

    it('rolls back when the commit fails', async () => {
      db.commitTransaction.mockRejectedValue(new Error('commit failed'));

      await expect(deleteSubject('s1')).rejects.toThrow('commit failed');

      expect(db.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('reports the original error even if the rollback also fails', async () => {
      db.run.mockRejectedValue(new Error('first failure'));
      db.rollbackTransaction.mockRejectedValue(new Error('rollback failure'));

      await expect(deleteSubject('s1')).rejects.toThrow('first failure');
    });

    it('does not attempt a rollback when the transaction could not start', async () => {
      db.beginTransaction.mockRejectedValue(new Error('Already in transaction'));

      await expect(deleteSubject('s1')).rejects.toThrow('Already in transaction');

      expect(db.run).not.toHaveBeenCalled();
      expect(db.rollbackTransaction).not.toHaveBeenCalled();
    });

    it.each([[undefined], [''], ['   '], [null]])('rejects an invalid id (%j) before touching the database', async (id) => {
      await expect(deleteSubject(id)).rejects.toThrow(/subject id is required/);

      expect(getDB).not.toHaveBeenCalled();
    });
  });
});