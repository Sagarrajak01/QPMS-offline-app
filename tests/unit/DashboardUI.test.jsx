import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dashboard from '../../src/pages/Dashboard';
import { getAllSubjects } from '../../src/repositories/subjectRepository.js';
import { getAllQuestions } from '../../src/repositories/questionRepository.js';
import { getAllPapers } from '../../src/repositories/paperRepository.js';

vi.mock('../../src/repositories/subjectRepository.js', () => ({ getAllSubjects: vi.fn() }));
vi.mock('../../src/repositories/questionRepository.js', () => ({ getAllQuestions: vi.fn() }));
vi.mock('../../src/repositories/paperRepository.js', () => ({ getAllPapers: vi.fn() }));

const rows = (count) => Array.from({ length: count }, (_, i) => ({ id: `id${i}` }));

// Reads the number shown on the card with the given title.
const cardValue = (title) => within(screen.getByText(title).closest('div').parentElement).getByRole('heading', { level: 3 });

describe('Dashboard UI', () => {
  beforeEach(() => {
    getAllSubjects.mockReset().mockResolvedValue(rows(3));
    getAllQuestions.mockReset().mockResolvedValue(rows(12));
    getAllPapers.mockReset().mockResolvedValue(rows(2));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the real count for subjects, questions and papers', async () => {
    render(<Dashboard />);

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    await waitFor(() => expect(cardValue('Total Subjects')).toHaveTextContent('3'));
    expect(cardValue('Question Bank')).toHaveTextContent('12');
    expect(cardValue('Saved Papers')).toHaveTextContent('2');
    expect(getAllQuestions).toHaveBeenCalledTimes(1);
  });

  it('shows a placeholder, not zero, until the counts have loaded', async () => {
    let resolveQuestions;
    getAllQuestions.mockReturnValue(new Promise((resolve) => { resolveQuestions = resolve; }));

    render(<Dashboard />);

    for (const title of ['Total Subjects', 'Question Bank', 'Saved Papers']) {
      expect(cardValue(title)).toHaveTextContent('–');
    }

    resolveQuestions(rows(12));

    await waitFor(() => expect(cardValue('Question Bank')).toHaveTextContent('12'));
  });

  it('shows genuine zeros for an empty database', async () => {
    getAllSubjects.mockResolvedValue([]);
    getAllQuestions.mockResolvedValue([]);
    getAllPapers.mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => expect(cardValue('Total Subjects')).toHaveTextContent('0'));
    expect(cardValue('Question Bank')).toHaveTextContent('0');
    expect(cardValue('Saved Papers')).toHaveTextContent('0');
  });

  it('treats a missing result as zero instead of crashing', async () => {
    getAllSubjects.mockResolvedValue(undefined);
    getAllQuestions.mockResolvedValue(null);

    render(<Dashboard />);

    await waitFor(() => expect(cardValue('Total Subjects')).toHaveTextContent('0'));
    expect(cardValue('Question Bank')).toHaveTextContent('0');
    expect(cardValue('Saved Papers')).toHaveTextContent('2');
  });

  describe('when loading fails', () => {
    it('shows the real error and no invented numbers', async () => {
      getAllQuestions.mockRejectedValue(new Error('database is locked'));

      render(<Dashboard />);

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the dashboard: database is locked');
      for (const title of ['Total Subjects', 'Question Bank', 'Saved Papers']) {
        expect(cardValue(title)).toHaveTextContent('–');
      }
      expect(screen.queryByText('45')).not.toBeInTheDocument();
    });

    it('falls back to a generic message when the error has none', async () => {
      getAllPapers.mockRejectedValue(undefined);

      render(<Dashboard />);

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the dashboard: Unknown error.');
    });

    it('recovers when the user retries', async () => {
      getAllSubjects.mockRejectedValueOnce(new Error('temporary failure'));

      render(<Dashboard />);
      const alert = await screen.findByRole('alert');

      fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

      await waitFor(() => expect(cardValue('Total Subjects')).toHaveTextContent('3'));
      expect(cardValue('Question Bank')).toHaveTextContent('12');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(getAllSubjects).toHaveBeenCalledTimes(2);
    });

    it('keeps showing an error if the retry fails too', async () => {
      getAllSubjects.mockRejectedValueOnce(new Error('first failure')).mockRejectedValueOnce(new Error('second failure'));

      render(<Dashboard />);
      fireEvent.click(within(await screen.findByRole('alert')).getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText(/second failure/)).toBeInTheDocument();
      expect(screen.queryByText(/first failure/)).not.toBeInTheDocument();
    });
  });
});