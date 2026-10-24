import jsPDF from 'jspdf';

export const generatePaperPDF = (paperData, options = { action: 'save', filename: 'question_paper.pdf' }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  let y = 20; // Vertical cursor
  
  // Helper to add a new page if content exceeds page bounds
  const checkPageBreak = (requiredSpace = 10) => {
    if (y + requiredSpace > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // --- HEADER SECTION ---
  if (paperData.institution_name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(paperData.institution_name, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  if (paperData.examination_name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(paperData.examination_name, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(paperData.title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Metadata Row (Time and Marks)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Time Allowed: ${Math.floor(paperData.duration / 60)} hrs ${paperData.duration % 60} mins`, margin, y);
  doc.text(`Max Marks: ${paperData.max_marks}`, pageWidth - margin, y, { align: 'right' });
  y += 2;
  
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Instructions
  if (paperData.instructions) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    const splitInstructions = doc.splitTextToSize(`General Instructions: ${paperData.instructions}`, contentWidth);
    doc.text(splitInstructions, margin, y);
    y += (splitInstructions.length * 5) + 5;
  }

  // --- QUESTIONS SECTION ---
  const sections = paperData.snapshot?.sections || [];
  let globalQNum = 1;

  sections.forEach((section) => {
    checkPageBreak(20);
    
    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(section.name, pageWidth / 2, y, { align: 'center' });
    y += 6;

    if (section.instructions) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      const secInst = doc.splitTextToSize(section.instructions, contentWidth);
      doc.text(secInst, margin, y);
      y += (secInst.length * 5) + 4;
    }
    
    // Section Questions
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    section.questions.forEach((q) => {
      checkPageBreak(15);
      
      // Calculate Question Text Lines
      const qPrefix = `Q${globalQNum}. `;
      const availableQWidth = contentWidth - 15; // Reserve 15mm for marks on the right
      
      // Add text with prefix handling
      const splitQuestionText = doc.splitTextToSize(qPrefix + q.text, availableQWidth);
      doc.text(splitQuestionText, margin, y);
      
      // Add Marks
      doc.text(`[${q.marks}]`, pageWidth - margin, y, { align: 'right' });
      
      y += (splitQuestionText.length * 5) + 2;

      // Handle MCQ Options Layout
      if (q.type === 'MCQ' && q.options && q.options.length > 0) {
        doc.setFontSize(10);
        
        // 2 options per line layout
        for (let i = 0; i < q.options.length; i += 2) {
          checkPageBreak(10);
          const opt1 = `(${String.fromCharCode(97 + i)}) ${q.options[i]}`; // a)
          doc.text(opt1, margin + 10, y);
          
          if (i + 1 < q.options.length) {
            const opt2 = `(${String.fromCharCode(97 + i + 1)}) ${q.options[i + 1]}`; // b)
            doc.text(opt2, margin + 100, y); // Start second column at 100mm
          }
          y += 5;
        }
        y += 2;
        doc.setFontSize(11);
      } else {
        y += 3; // Space between non-MCQ questions
      }

      globalQNum++;
    });
    
    y += 5; // Space after section
  });

  // --- FOOTER (Page Numbers) ---
  const totalPages = doc.internal.getNumberOfPages();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // --- OUTPUT ---
  if (options.action === 'blob') {
    return doc.output('blob');
  } else if (options.action === 'dataurl') {
    return doc.output('datauristring');
  } else {
    doc.save(options.filename || 'question_paper.pdf');
  }
};