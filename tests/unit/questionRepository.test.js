import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDB } from '../../src/db/database.js';
import {
  getAllQuestions,
  getQuestionsBySubject,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../../src/repositories/questionRepository.js';

vi.mock('../../src/db/database.js', () => ({ getDB: vi.fn() }));

const placeholderCount = (sql) => (sql.match(/\?/g) || []).length;

const baseQuestion = {
  subject_id: 's1',
  type: 'MCQ',
  difficulty: 'EASY',
  marks: 2,
  text: 'What is speed?',
  unit: 'Unit 1',
  topic: 'Kinematics',
  options: ['Distance/Time', 'Time/Distance'],
  correct_answer: 'Distance/Time',
};

describe('Question Repository', () => {
  let db;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    db = { run: vi.fn().mockResolvedValue({}), query: vi.fn().mockResolvedValue({ values: [] }) };
    getDB.mockResolvedValue(db);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('createQuestion', () => {
    it('persists unit, topic and timestamps, with one value for every placeholder', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000);

      const { id } = await createQuestion(baseQuestion);

      const [sql, params] = db.run.mock.calls[0];
      expect(sql).toContain('INSERT INTO questions');
      expect(sql).toMatch(/unit, topic/);
      expect(sql).toMatch(/created_at, updated_at/);
      expect(params).toHaveLength(placeholderCount(sql));
      expect(params).toEqual([
        id, 's1', 'MCQ', 'EASY', 2, 'What is speed?', 'Unit 1', 'Kinematics',
        '["Distance/Time","Time/Distance"]', 'Distance/Time', 1_700_000_000_000, 1_700_000_000_000,
      ]);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('stores missing unit/topic as empty strings and trims whitespace', async () => {
      await createQuestion({ ...baseQuestion, unit: undefined, topic: '   ', text: '  What is speed?  ' });

      const params = db.run.mock.calls[0][1];
      expect(params[5]).toBe('What is speed?');
      expect(params[6]).toBe('');
      expect(params[7]).toBe('');
    });

    it('stores non-array options as an empty list and a missing answer as null', async () => {
      await createQuestion({ ...baseQuestion, type: 'SHORT', options: null, correct_answer: undefined });
      await createQuestion({ ...baseQuestion, type: 'SHORT', options: 'not-a-list' });

      expect(db.run.mock.calls[0][1][8]).toBe('[]');
      expect(db.run.mock.calls[0][1][9]).toBeNull();
      expect(db.run.mock.calls[1][1][8]).toBe('[]');
    });

    it.each([
      ['blank text', { text: '   ' }, /text is required/],
      ['missing text', { text: undefined }, /text is required/],
      ['non-string text', { text: 42 }, /text is required/],
      ['a missing subject', { subject_id: '' }, /subject is required/],
      ['an undefined subject', { subject_id: undefined }, /subject is required/],
    ])('rejects %s without touching the database', async (_label, override, message) => {
      await expect(createQuestion({ ...baseQuestion, ...override })).rejects.toThrow(message);

      expect(getDB).not.toHaveBeenCalled();
      expect(db.run).not.toHaveBeenCalled();
    });

    it('rejects a missing question object', async () => {
      await expect(createQuestion(undefined)).rejects.toThrow(/subject is required/);
    });

    it('propagates database errors instead of swallowing them', async () => {
      db.run.mockRejectedValue(new Error('FOREIGN KEY constraint failed'));

      await expect(createQuestion(baseQuestion)).rejects.toThrow('FOREIGN KEY constraint failed');
    });

    it('propagates an unavailable database', async () => {
      getDB.mockRejectedValue(new Error('Local storage is only available in the Android app.'));

      await expect(createQuestion(baseQuestion)).rejects.toThrow(/only available in the Android app/);
    });
  });

  describe('updateQuestion', () => {
    it('updates every editable column and updated_at, leaving created_at alone', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_800_000_000_000);

      const result = await updateQuestion('q9', { ...baseQuestion, unit: 'Unit 2', topic: 'Dynamics' });

      const [sql, params] = db.run.mock.calls[0];
      expect(result).toEqual({ id: 'q9' });
      expect(sql).toContain('UPDATE questions SET');
      expect(sql).not.toContain('created_at');
      expect(sql).toContain('unit=?');
      expect(sql).toContain('topic=?');
      expect(sql).toContain('updated_at=?');
      expect(params).toHaveLength(placeholderCount(sql));
      expect(params).toEqual([
        's1', 'MCQ', 'EASY', 2, 'What is speed?', 'Unit 2', 'Dynamics',
        '["Distance/Time","Time/Distance"]', 'Distance/Time', 1_800_000_000_000, 'q9',
      ]);
    });

    it('ignores extra fields such as id and timestamps passed in from the UI', async () => {
      await updateQuestion('q9', { ...baseQuestion, id: 'other', created_at: 1, updated_at: 2 });

      expect(db.run.mock.calls[0][1]).not.toContain('other');
      expect(db.run.mock.calls[0][1].at(-1)).toBe('q9');
    });

    it('rejects invalid input without touching the database', async () => {
      await expect(updateQuestion('q9', { ...baseQuestion, text: '' })).rejects.toThrow(/text is required/);

      expect(db.run).not.toHaveBeenCalled();
    });
  });

  describe('reading questions', () => {
    it('parses options and returns unit/topic as strings', async () => {
      db.query.mockResolvedValue({
        values: [{ id: 'q1', text: 'T', unit: 'U1', topic: 'Tp', options: '["a","b"]' }],
      });

      const [q] = await getAllQuestions();

      expect(db.query).toHaveBeenCalledWith('SELECT * FROM questions');
      expect(q).toMatchObject({ id: 'q1', unit: 'U1', topic: 'Tp', options: ['a', 'b'] });
    });

    it('normalizes legacy rows that have NULL unit, topic and options', async () => {
      db.query.mockResolvedValue({ values: [{ id: 'q1', text: 'T', unit: null, topic: null, options: null }] });

      const [q] = await getAllQuestions();

      expect(q.unit).toBe('');
      expect(q.topic).toBe('');
      expect(q.options).toEqual([]);
    });

    it('keeps the rest of the bank readable when one row has corrupt options', async () => {
      db.query.mockResolvedValue({
        values: [
          { id: 'good1', text: 'A', options: '["x"]' },
          { id: 'bad1', text: 'B', options: '{not json' },
          { id: 'bad2', text: 'C', options: '"a string"' },
          { id: 'good2', text: 'D', options: '[]' },
        ],
      });

      const questions = await getAllQuestions();

      expect(questions.map((q) => q.id)).toEqual(['good1', 'bad1', 'bad2', 'good2']);
      expect(questions[0].options).toEqual(['x']);
      expect(questions[1].options).toEqual([]);
      expect(questions[2].options).toEqual([]);
      expect(console.warn).toHaveBeenCalledTimes(2);
    });

    it('returns an empty list when there are no rows or no values', async () => {
      db.query.mockResolvedValue({});

      await expect(getAllQuestions()).resolves.toEqual([]);
    });

    it('filters by subject using a bound parameter', async () => {
      db.query.mockResolvedValue({ values: [{ id: 'q1', text: 'T', options: '[]' }] });

      const result = await getQuestionsBySubject('s1');

      expect(db.query).toHaveBeenCalledWith('SELECT * FROM questions WHERE subject_id=?', ['s1']);
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteQuestion', () => {
    it('deletes by id with a bound parameter', async () => {
      await expect(deleteQuestion('q1')).resolves.toEqual({ id: 'q1' });

      expect(db.run).toHaveBeenCalledWith('DELETE FROM questions WHERE id=?', ['q1']);
    });
  });
});