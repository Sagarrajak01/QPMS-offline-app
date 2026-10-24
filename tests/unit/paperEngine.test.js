import { describe, it, expect } from 'vitest';
import { generatePaper, generateSets } from '../../src/services/paperEngine';

describe('Paper Generation Engine', () => {
  const mockBank = [
    { id: '1', type: 'MCQ', difficulty: 'EASY', marks: 1 },
    { id: '2', type: 'MCQ', difficulty: 'EASY', marks: 1 },
    { id: '3', type: 'SHORT', difficulty: 'MEDIUM', marks: 5 },
    { id: '4', type: 'SHORT', difficulty: 'MEDIUM', marks: 5 },
    { id: '5', type: 'LONG', difficulty: 'HARD', marks: 10 },
  ];

  const validBlueprint = {
    sections: [
      {
        name: 'Section A',
        requirements: [
          { type: 'MCQ', difficulty: 'EASY', count: 2, marksPerQuestion: 1 }
        ]
      },
      {
        name: 'Section B',
        requirements: [
          { type: 'SHORT', difficulty: 'MEDIUM', count: 1, marksPerQuestion: 5 }
        ]
      }
    ]
  };

  it('generates a paper matching the blueprint requirements and calculates marks', () => {
    const result = generatePaper(validBlueprint, mockBank);
    
    expect(result.errors).toHaveLength(0);
    expect(result.paper.sections).toHaveLength(2);
    expect(result.paper.totalMarks).toBe(7); // (2*1) + (1*5)
    
    // Verify Section A
    expect(result.paper.sections[0].questions).toHaveLength(2);
    expect(result.paper.sections[0].sectionMarks).toBe(2);
    expect(result.paper.sections[0].questions[0].type).toBe('MCQ');
    
    // Verify Section B
    expect(result.paper.sections[1].questions).toHaveLength(1);
    expect(result.paper.sections[1].sectionMarks).toBe(5);
    expect(result.paper.sections[1].questions[0].type).toBe('SHORT');
  });

  it('returns detailed validation errors if question bank lacks required questions', () => {
    const impossibleBlueprint = {
      sections: [
        {
          name: 'Section A',
          requirements: [
            { type: 'MCQ', difficulty: 'HARD', count: 5, marksPerQuestion: 1 } // None exist
          ]
        }
      ]
    };

    const result = generatePaper(impossibleBlueprint, mockBank);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Not enough questions');
    expect(result.paper).toBeNull();
  });

  it('generates multiple sets by shuffling questions within sections', () => {
    const result = generatePaper(validBlueprint, mockBank);
    const sets = generateSets(result.paper, 2); // Request 2 sets
    
    expect(sets).toHaveLength(2);
    expect(sets[0].setName).toBe('Set A');
    expect(sets[1].setName).toBe('Set B');
    
    // Both sets should have the same total marks and structure
    expect(sets[0].totalMarks).toBe(sets[1].totalMarks);
    expect(sets[0].sections[0].questions.length).toBe(sets[1].sections[0].questions.length);
  });
});