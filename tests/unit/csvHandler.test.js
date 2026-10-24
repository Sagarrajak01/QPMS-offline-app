import { describe, it, expect } from 'vitest';
import { parseQuestionsCSV, exportQuestionsCSV } from '../../src/utils/csvHandler';

describe('CSV Handler', () => {
  const validCSV = `unit,topic,type,difficulty,marks,text,option_1,option_2,option_3,option_4,correct_answer
1,Kinematics,MCQ,EASY,1,What is speed?,Distance/Time,Time/Distance,,,Distance/Time
1,Dynamics,SHORT,MEDIUM,5,Define Newton's second law.,,,,,,`;

  const invalidCSV = `unit,topic,type,difficulty,marks,text,option_1,option_2,correct_answer
1,Kinematics,INVALID_TYPE,EASY,-1,,,,,
1,Kinematics,MCQ,EASY,1,Missing options maybe?,,,`;

  it('parses valid CSV and maps correctly to question objects', async () => {
    const { validQuestions, errors } = await parseQuestionsCSV(validCSV);
    
    expect(errors).toHaveLength(0);
    expect(validQuestions).toHaveLength(2);
    
    // Check MCQ parsing
    expect(validQuestions[0].type).toBe('MCQ');
    expect(validQuestions[0].marks).toBe(1);
    expect(validQuestions[0].options).toEqual(['Distance/Time', 'Time/Distance']);
    
    // Check SHORT answer parsing
    expect(validQuestions[1].type).toBe('SHORT');
    expect(validQuestions[1].marks).toBe(5);
    expect(validQuestions[1].options).toBeNull();
  });

  it('catches invalid rows and returns detailed validation errors', async () => {
    const { validQuestions, errors } = await parseQuestionsCSV(invalidCSV);
    
    expect(validQuestions).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
    
    // Row 2 (index 1) errors
    const row2Errors = errors.filter(e => e.row === 2);
    expect(row2Errors[0].message).toContain('Question text is missing');
    
    // Row 3 (index 2) errors
    const row3Errors = errors.filter(e => e.row === 3);
    expect(row3Errors[0].message).toContain('MCQ must have at least 2 options');
  });

  it('exports question objects accurately back to a CSV string', () => {
    const questions = [
      {
        unit: '1', topic: 'Kinematics', type: 'MCQ', difficulty: 'EASY', marks: 1,
        text: 'What is speed?', options: ['Distance/Time', 'Time/Distance'], correct_answer: 'Distance/Time'
      }
    ];
    
    const csvOut = exportQuestionsCSV(questions);
    
    expect(csvOut).toContain('What is speed?');
    expect(csvOut).toContain('Distance/Time');
    expect(csvOut).toContain('MCQ');
    expect(csvOut).toContain('EASY');
  });
});