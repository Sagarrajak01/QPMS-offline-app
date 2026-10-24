import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import Papers from '../../src/pages/Papers';

// Mock dependencies
vi.mock('../../src/repositories/paperRepository.js', () => ({
  getAllPapers: vi.fn().mockResolvedValue([
    { id: 'p1', title: 'Midterm 2026', subject_id: 'sub1', max_marks: 100 }
  ]),
  createPaper: vi.fn(),
  deletePaper: vi.fn()
}));

vi.mock('../../src/repositories/subjectRepository.js', () => ({
  getAllSubjects: vi.fn().mockResolvedValue([
    { id: 'sub1', name: 'Web Dev' }
  ])
}));

vi.mock('../../src/repositories/questionRepository.js', () => ({
  getQuestionsBySubject: vi.fn().mockResolvedValue([])
}));

describe('Papers UI', () => {
  it('renders the saved papers library', async () => {
    render(<Papers />);
    
    // Check header
    expect(screen.getByText('Saved Papers')).toBeInTheDocument();
    
    // Wait for the mocked paper to appear
    await waitFor(() => {
      expect(screen.getByText('Midterm 2026')).toBeInTheDocument();
    });
  });
});