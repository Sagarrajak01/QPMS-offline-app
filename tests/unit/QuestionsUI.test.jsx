import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import Questions from '../../src/pages/Questions';

// Mock dependencies
vi.mock('../../src/repositories/questionRepository.js', () => ({
  getAllQuestions: vi.fn().mockResolvedValue([
    { id: 'q1', text: 'What is HTML?', type: 'SHORT', marks: 2, subject_id: 'sub1' }
  ]),
  createQuestion: vi.fn(),
  deleteQuestion: vi.fn()
}));

vi.mock('../../src/repositories/subjectRepository.js', () => ({
  getAllSubjects: vi.fn().mockResolvedValue([
    { id: 'sub1', name: 'Web Dev' }
  ])
}));

describe('Questions UI', () => {
  it('renders the question bank and loads questions', async () => {
    render(<Questions />);
    
    // Check header
    expect(screen.getByText('Question Bank')).toBeInTheDocument();
    
    // Wait for the mocked question to appear
    await waitFor(() => {
      expect(screen.getByText('What is HTML?')).toBeInTheDocument();
    });
  });
});