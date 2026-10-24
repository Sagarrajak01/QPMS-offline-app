import Papa from 'papaparse';

const ALLOWED_TYPES = ['MCQ', 'SHORT', 'LONG', 'DESCRIPTIVE'];
const ALLOWED_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

export const parseQuestionsCSV = (fileOrString) => {
  return new Promise((resolve) => {
    Papa.parse(fileOrString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validQuestions = [];
        const errors = [];

        results.data.forEach((row, index) => {
          const rowNum = index + 2; // +1 for 0-based index, +1 for header row
          
          // 1. Mandatory Text Validation
          if (!row.text || !row.text.trim()) {
            errors.push({ row: rowNum, message: 'Question text is missing.' });
            return; // Skip further validation for this row
          }
          
          // 2. Type Validation
          const type = (row.type || '').toUpperCase().trim();
          if (!ALLOWED_TYPES.includes(type)) {
            errors.push({ row: rowNum, message: `Invalid type '${row.type}'. Allowed: ${ALLOWED_TYPES.join(', ')}.` });
            return;
          }

          // 3. Difficulty Validation
          const difficulty = (row.difficulty || '').toUpperCase().trim();
          if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
            errors.push({ row: rowNum, message: `Invalid difficulty '${row.difficulty}'. Allowed: ${ALLOWED_DIFFICULTIES.join(', ')}.` });
            return;
          }

          // 4. Marks Validation
          const marks = parseInt(row.marks, 10);
          if (isNaN(marks) || marks <= 0) {
            errors.push({ row: rowNum, message: 'Marks must be a positive integer.' });
            return;
          }

          // 5. MCQ Specific Validation
          let options = null;
          let correctAnswer = (row.correct_answer || '').trim();

          if (type === 'MCQ') {
            options = [row.option_1, row.option_2, row.option_3, row.option_4]
              .map(opt => (opt || '').trim())
              .filter(opt => opt.length > 0);
            
            if (options.length < 2) {
              errors.push({ row: rowNum, message: 'MCQ must have at least 2 options (option_1, option_2).' });
              return;
            }
            if (!correctAnswer) {
              errors.push({ row: rowNum, message: 'MCQ must have a correct_answer.' });
              return;
            }
          }

          validQuestions.push({
            unit: (row.unit || '').trim(),
            topic: (row.topic || '').trim(),
            type,
            difficulty,
            marks,
            text: row.text.trim(),
            options,
            correct_answer: correctAnswer
          });
        });

        resolve({ validQuestions, errors });
      },
      error: (err) => {
        resolve({ validQuestions: [], errors: [{ row: 0, message: `CSV Parsing Error: ${err.message}` }] });
      }
    });
  });
};

export const exportQuestionsCSV = (questions) => {
  const exportData = questions.map(q => ({
    unit: q.unit || '',
    topic: q.topic || '',
    type: q.type,
    difficulty: q.difficulty,
    marks: q.marks,
    text: q.text,
    option_1: q.options && q.options[0] ? q.options[0] : '',
    option_2: q.options && q.options[1] ? q.options[1] : '',
    option_3: q.options && q.options[2] ? q.options[2] : '',
    option_4: q.options && q.options[3] ? q.options[3] : '',
    correct_answer: q.correct_answer || ''
  }));

  return Papa.unparse(exportData);
};