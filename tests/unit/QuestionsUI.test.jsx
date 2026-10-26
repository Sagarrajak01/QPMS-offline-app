import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Questions from '../../src/pages/Questions';
import { getAllQuestions, createQuestion, updateQuestion, deleteQuestion } from '../../src/repositories/questionRepository.js';
import { getAllSubjects } from '../../src/repositories/subjectRepository.js';

// Mock dependencies
vi.mock('../../src/repositories/questionRepository.js', () => ({
  getAllQuestions: vi.fn().mockResolvedValue([
    { id: 'q1', text: 'What is HTML?', type: 'SHORT', marks: 2, subject_id: 'sub1' }
  ]),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn()
}));

vi.mock('../../src/repositories/subjectRepository.js', () => ({
  getAllSubjects: vi.fn().mockResolvedValue([
    { id: 'sub1', name: 'Web Dev' }
  ])
}));

// The modal is a separate component; a stub keeps these tests focused on the page's own logic.
vi.mock('../../src/components/QuestionModal.jsx', async () => {
  const { createElement: h } = await import('react');
  return {
    default: ({ isOpen, onClose, onSave, initialData, subjects }) =>
      isOpen
        ? h('div', { 'data-testid': 'question-modal' },
            h('span', { 'data-testid': 'modal-editing-id' }, initialData?.id ?? 'new'),
            h('span', { 'data-testid': 'modal-subject-count' }, String(subjects.length)),
            h('button', { onClick: () => onSave(SAVE_PAYLOAD) }, 'Mock save'),
            h('button', { onClick: onClose }, 'Mock close'))
        : null,
  };
});

const SAVE_PAYLOAD = {
  subject_id: 'sub1', text: 'Saved text', type: 'SHORT', difficulty: 'EASY', marks: 2,
  unit: 'U1', topic: 'T1', options: [], correct_answer: '',
};

const SUBJECTS = [{ id: 'sub1', name: 'Web Dev' }, { id: 'sub2', name: 'Databases' }];
const QUESTIONS = [{ id: 'q1', text: 'What is HTML?', type: 'SHORT', difficulty: 'EASY', marks: 2, subject_id: 'sub1' }];

const CSV_HEADER = 'unit,topic,type,difficulty,marks,text,option_1,option_2,option_3,option_4,correct_answer';
const makeCsvFile = (...rows) => new File([[CSV_HEADER, ...rows].join('\n')], 'questions.csv', { type: 'text/csv' });
const GOOD_SHORT = 'Unit 1,Basics,SHORT,EASY,2,Define HTML.,,,,,';
const GOOD_MCQ = 'Unit 2,Forms,MCQ,MEDIUM,1,Pick one,a,b,c,d,a';
const BAD_TYPE = 'Unit 3,Bad,BOGUS,EASY,1,Invalid type row,,,,,';

const upload = (container, file) => {
  const input = container.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });
  return input;
};

describe('Questions UI', () => {
  beforeEach(() => {
    getAllQuestions.mockReset().mockResolvedValue(QUESTIONS);
    getAllSubjects.mockReset().mockResolvedValue(SUBJECTS);
    createQuestion.mockReset().mockResolvedValue({ id: 'new' });
    updateQuestion.mockReset().mockResolvedValue({ id: 'q1' });
    deleteQuestion.mockReset().mockResolvedValue({ id: 'q1' });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the question bank and loads questions', async () => {
    render(<Questions />);
    
    // Check header
    expect(screen.getByText('Question Bank')).toBeInTheDocument();
    
    // Wait for the mocked question to appear
    await waitFor(() => {
      expect(screen.getByText('What is HTML?')).toBeInTheDocument();
    });
  });

  describe('loading and listing', () => {
    it('shows a loading message, not the empty state, until data arrives', async () => {
      let resolveQuestions;
      getAllQuestions.mockReturnValue(new Promise((resolve) => { resolveQuestions = resolve; }));

      render(<Questions />);

      expect(screen.getByRole('status')).toHaveTextContent('Loading questions...');
      expect(screen.queryByText(/No questions found/)).not.toBeInTheDocument();

      resolveQuestions(QUESTIONS);

      expect(await screen.findByText('What is HTML?')).toBeInTheDocument();
      expect(screen.queryByText('Loading questions...')).not.toBeInTheDocument();
    });

    it('shows the real error with a retry, and never fake data, when loading fails', async () => {
      getAllQuestions.mockRejectedValueOnce(new Error('Local storage is only available in the Android app.'));

      render(<Questions />);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Could not load the question bank: Local storage is only available in the Android app.');
      expect(screen.queryByText('What is Linux?')).not.toBeInTheDocument();
      expect(screen.queryByText('Operating Systems')).not.toBeInTheDocument();
      expect(screen.queryByText(/No questions found/)).not.toBeInTheDocument();

      fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText('What is HTML?')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(getAllQuestions).toHaveBeenCalledTimes(2);
    });

    it('shows the empty-bank message when there are no questions', async () => {
      getAllQuestions.mockResolvedValue([]);

      render(<Questions />);

      expect(await screen.findByText('No questions found. Add one or import a CSV!')).toBeInTheDocument();
    });

    it('filters by text case-insensitively and distinguishes "no matches" from an empty bank', async () => {
      getAllQuestions.mockResolvedValue([
        { id: 'q1', text: 'What is HTML?', type: 'SHORT', marks: 2, subject_id: 'sub1' },
        { id: 'q2', text: 'Define CSS', type: 'SHORT', marks: 2, subject_id: 'sub1' },
      ]);
      render(<Questions />);
      await screen.findByText('What is HTML?');
      const search = screen.getByPlaceholderText('Search questions...');

      fireEvent.change(search, { target: { value: '  html ' } });
      expect(screen.getByText('What is HTML?')).toBeInTheDocument();
      expect(screen.queryByText('Define CSS')).not.toBeInTheDocument();

      fireEvent.change(search, { target: { value: 'zzz' } });
      expect(screen.getByText('No questions match your search.')).toBeInTheDocument();
      expect(screen.queryByText(/Add one or import a CSV/)).not.toBeInTheDocument();

      fireEvent.change(search, { target: { value: '' } });
      expect(screen.getByText('Define CSS')).toBeInTheDocument();
    });

    it('does not crash on a legacy row with no text', async () => {
      getAllQuestions.mockResolvedValue([
        { id: 'q0', text: null, type: 'SHORT', marks: 1, subject_id: 'sub1' },
        { id: 'q1', text: 'What is HTML?', type: 'SHORT', marks: 2, subject_id: 'sub1' },
      ]);

      render(<Questions />);

      expect(await screen.findByText('What is HTML?')).toBeInTheDocument();
      fireEvent.change(screen.getByPlaceholderText('Search questions...'), { target: { value: 'html' } });
      expect(screen.getByText('What is HTML?')).toBeInTheDocument();
    });
  });

  describe('adding and editing', () => {
    it('refuses to open the form when there are no subjects', async () => {
      getAllSubjects.mockResolvedValue([]);
      render(<Questions />);
      await screen.findByText('What is HTML?');

      fireEvent.click(screen.getByRole('button', { name: /add question/i }));

      expect(window.alert).toHaveBeenCalledWith('Create a subject first!');
      expect(screen.queryByTestId('question-modal')).not.toBeInTheDocument();
    });

    it('creates a question, closes the form and reloads the list', async () => {
      render(<Questions />);
      await screen.findByText('What is HTML?');

      fireEvent.click(screen.getByRole('button', { name: /add question/i }));
      expect(screen.getByTestId('modal-editing-id')).toHaveTextContent('new');
      expect(screen.getByTestId('modal-subject-count')).toHaveTextContent('2');
      fireEvent.click(screen.getByRole('button', { name: 'Mock save' }));

      await waitFor(() => expect(screen.queryByTestId('question-modal')).not.toBeInTheDocument());
      expect(createQuestion).toHaveBeenCalledWith(SAVE_PAYLOAD);
      expect(updateQuestion).not.toHaveBeenCalled();
      await waitFor(() => expect(getAllQuestions).toHaveBeenCalledTimes(2));
    });

    it('keeps the form open and tells the user when saving fails, then allows a retry', async () => {
      createQuestion.mockRejectedValueOnce(new Error('disk full'));
      render(<Questions />);
      await screen.findByText('What is HTML?');
      fireEvent.click(screen.getByRole('button', { name: /add question/i }));

      fireEvent.click(screen.getByRole('button', { name: 'Mock save' }));

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Could not save the question: disk full'));
      expect(screen.getByTestId('question-modal')).toBeInTheDocument();
      expect(getAllQuestions).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Mock save' }));

      await waitFor(() => expect(screen.queryByTestId('question-modal')).not.toBeInTheDocument());
      expect(createQuestion).toHaveBeenCalledTimes(2);
    });

    it('edits the selected question', async () => {
      render(<Questions />);
      await screen.findByText('What is HTML?');

      fireEvent.click(screen.getByRole('button', { name: 'Edit question' }));
      expect(screen.getByTestId('modal-editing-id')).toHaveTextContent('q1');
      fireEvent.click(screen.getByRole('button', { name: 'Mock save' }));

      await waitFor(() => expect(updateQuestion).toHaveBeenCalledWith('q1', SAVE_PAYLOAD));
      expect(createQuestion).not.toHaveBeenCalled();
    });

    it('ignores a second submit while the first save is still running', async () => {
      let finishSave;
      createQuestion.mockReturnValue(new Promise((resolve) => { finishSave = resolve; }));
      render(<Questions />);
      await screen.findByText('What is HTML?');
      fireEvent.click(screen.getByRole('button', { name: /add question/i }));

      fireEvent.click(screen.getByRole('button', { name: 'Mock save' }));
      fireEvent.click(screen.getByRole('button', { name: 'Mock save' }));
      finishSave({ id: 'x' });

      await waitFor(() => expect(screen.queryByTestId('question-modal')).not.toBeInTheDocument());
      expect(createQuestion).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleting', () => {
    it('does nothing when the user cancels the confirmation', async () => {
      window.confirm.mockReturnValue(false);
      render(<Questions />);
      await screen.findByText('What is HTML?');

      fireEvent.click(screen.getByRole('button', { name: 'Delete question' }));

      expect(deleteQuestion).not.toHaveBeenCalled();
      expect(getAllQuestions).toHaveBeenCalledTimes(1);
    });

    it('deletes the question and reloads the list', async () => {
      render(<Questions />);
      await screen.findByText('What is HTML?');

      fireEvent.click(screen.getByRole('button', { name: 'Delete question' }));

      await waitFor(() => expect(deleteQuestion).toHaveBeenCalledWith('q1'));
      await waitFor(() => expect(getAllQuestions).toHaveBeenCalledTimes(2));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('reports a failed delete instead of hiding it', async () => {
      deleteQuestion.mockRejectedValue(new Error('disk full'));
      render(<Questions />);
      await screen.findByText('What is HTML?');

      fireEvent.click(screen.getByRole('button', { name: 'Delete question' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete the question: disk full');
    });
  });

  describe('CSV import', () => {
    it('imports valid rows into the first subject by default and reports what was skipped', async () => {
      const { container } = render(<Questions />);
      await screen.findByText('What is HTML?');

      upload(container, makeCsvFile(GOOD_SHORT, GOOD_MCQ, BAD_TYPE));

      const notice = await screen.findByRole('status');
      expect(notice).toHaveTextContent('Imported 2 questions into "Web Dev".');
      expect(notice).toHaveTextContent('1 CSV row skipped:');
      expect(notice).toHaveTextContent(/Row 4: Invalid type 'BOGUS'/);
      expect(createQuestion).toHaveBeenCalledTimes(2);
      expect(createQuestion).toHaveBeenNthCalledWith(1, expect.objectContaining({
        subject_id: 'sub1', unit: 'Unit 1', topic: 'Basics', type: 'SHORT', text: 'Define HTML.',
      }));
      expect(createQuestion).toHaveBeenNthCalledWith(2, expect.objectContaining({
        subject_id: 'sub1', type: 'MCQ', options: ['a', 'b', 'c', 'd'], correct_answer: 'a',
      }));
      await waitFor(() => expect(getAllQuestions).toHaveBeenCalledTimes(2));
    });

    it('imports into the subject the user selected', async () => {
      const { container } = render(<Questions />);
      await screen.findByText('What is HTML?');

      fireEvent.change(screen.getByLabelText(/import into/i), { target: { value: 'sub2' } });
      upload(container, makeCsvFile(GOOD_SHORT));

      expect(await screen.findByText('Imported 1 question into "Databases".')).toBeInTheDocument();
      expect(createQuestion).toHaveBeenCalledWith(expect.objectContaining({ subject_id: 'sub2' }));
    });

    it('shows a plain success message when every row imports', async () => {
      const { container } = render(<Questions />);
      await screen.findByText('What is HTML?');

      upload(container, makeCsvFile(GOOD_SHORT, GOOD_MCQ));

      const notice = await screen.findByRole('status');
      expect(notice).toHaveTextContent('Imported 2 questions into "Web Dev".');
      expect(notice).not.toHaveTextContent(/skipped|could not be saved/);
    });

    it('reports an error and creates nothing when no row is valid', async () => {
      const { container } = render(<Questions />);
      await screen.findByText('What is HTML?');

      upload(container, makeCsvFile(BAD_TYPE));

      const notice = await screen.findByRole('alert');
      expect(notice).toHaveTextContent('No questions were imported.');
      expect(notice).toHaveTextContent('Row 2:');
      expect(createQuestion).not.toHaveBeenCalled();
    });

    it('keeps importing after one row fails to save and reports the failure', async () => {
      createQuestion
        .mockResolvedValueOnce({ id: 'a' })
        .mockRejectedValueOnce(new Error('disk full'))
        .mockResolvedValueOnce({ id: 'c' });
      const { container } = render(<Questions />);
      await screen.findByText('What is HTML?');

      upload(container, makeCsvFile(GOOD_SHORT, GOOD_MCQ, 'Unit 4,More,SHORT,HARD,3,Third row,,,,,'));

      const notice = await screen.findByRole('status');
      expect(notice).toHaveTextContent('Imported 2 questions into "Web Dev".');
      expect(notice).toHaveTextContent('1 question could not be saved: disk full');
      expect(createQuestion).toHaveBeenCalledTimes(3);
    });

    it('explains the problem instead of importing when there are no subjects', async () => {
      getAllSubjects.mockResolvedValue([]);
      const { container } = render(<Questions />);
      await screen.findByText('What is HTML?');

      expect(screen.queryByLabelText(/import into/i)).not.toBeInTheDocument();
      upload(container, makeCsvFile(GOOD_SHORT));

      expect(await screen.findByRole('alert')).toHaveTextContent('Please create a subject first before importing questions.');
      expect(createQuestion).not.toHaveBeenCalled();
    });

    it('ignores a second file chosen while an import is running', async () => {
      let finishFirstRow;
      createQuestion.mockReturnValueOnce(new Promise((resolve) => { finishFirstRow = resolve; }));
      const { container } = render(<Questions />);
      await screen.findByText('What is HTML?');

      upload(container, makeCsvFile(GOOD_SHORT));
      const importButton = await screen.findByRole('button', { name: /importing/i });
      expect(importButton).toBeDisabled();
      expect(screen.getByLabelText(/import into/i)).toBeDisabled();

      upload(container, makeCsvFile(GOOD_MCQ));
      finishFirstRow({ id: 'a' });

      expect(await screen.findByText('Imported 1 question into "Web Dev".')).toBeInTheDocument();
      expect(createQuestion).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: /import csv/i })).toBeEnabled();
    });

    it('lets the user dismiss the result message', async () => {
      const { container } = render(<Questions />);
      await screen.findByText('What is HTML?');
      upload(container, makeCsvFile(GOOD_SHORT));
      await screen.findByRole('status');

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});