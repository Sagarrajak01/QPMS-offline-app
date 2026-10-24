const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const generatePaper = (blueprint, questionBank) => {
  const errors = [];
  let totalMarks = 0;
  const sections = [];
  
  // Track used IDs to ensure a question is never selected twice in the same paper
  const usedQuestionIds = new Set();

  for (const sectionReq of blueprint.sections) {
    const section = {
      name: sectionReq.name,
      instructions: sectionReq.instructions || '',
      questions: [],
      sectionMarks: 0
    };

    for (const req of sectionReq.requirements) {
      // 1. Filter bank to find matching, unused questions
      const available = questionBank.filter(q => 
        q.type === req.type &&
        q.difficulty === req.difficulty &&
        q.marks === req.marksPerQuestion &&
        !usedQuestionIds.has(q.id) &&
        (!req.unit || q.unit === req.unit) // Optional unit filtering
      );

      // 2. Validate availability
      if (available.length < req.count) {
        errors.push(
          `Not enough questions for ${sectionReq.name}: Need ${req.count} of type ${req.type} ` +
          `(${req.difficulty}, ${req.marksPerQuestion} marks), but only found ${available.length} available.`
        );
        continue;
      }

      // 3. Shuffle and select
      const selected = shuffleArray(available).slice(0, req.count);
      
      selected.forEach(q => {
        usedQuestionIds.add(q.id);
        section.questions.push({ ...q });
        section.sectionMarks += q.marks;
        totalMarks += q.marks;
      });
    }

    sections.push(section);
  }

  // If blueprint requirements cannot be met, halt and return errors
  if (errors.length > 0) {
    return { errors, paper: null };
  }

  return {
    errors: [],
    paper: {
      totalMarks,
      sections
    }
  };
};

export const generateSets = (basePaper, numSets) => {
  const sets = [];
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; 

  for (let i = 0; i < numSets; i++) {
    const setLabel = labels[i] || `${i + 1}`;
    
    // Deep clone sections and shuffle questions to avoid mutating the base reference
    const shuffledSections = basePaper.sections.map(section => ({
      ...section,
      questions: shuffleArray(section.questions)
    }));

    sets.push({
      ...basePaper,
      setName: `Set ${setLabel}`,
      sections: shuffledSections
    });
  }
  
  return sets;
};