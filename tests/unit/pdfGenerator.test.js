import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePaperPDF } from '../../src/utils/pdfGenerator';

// Extract mock functions so we can assert on them globally
const mockText = vi.fn();
const mockAddPage = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFont = vi.fn();
const mockSplitTextToSize = vi.fn((text) => [text]);
const mockSave = vi.fn();
const mockOutput = vi.fn().mockReturnValue(new Blob(['mock pdf'], { type: 'application/pdf' }));
const mockLine = vi.fn();
const mockSetPage = vi.fn();

// Provide an actual ES6 class to the jsPDF mock
vi.mock('jspdf', () => {
  return {
    default: class MockJSPDF {
      constructor() {
        this.setFontSize = mockSetFontSize;
        this.setFont = mockSetFont;
        this.text = mockText;
        this.addPage = mockAddPage;
        this.internal = {
          pageSize: { getWidth: () => 210, getHeight: () => 297 },
          getNumberOfPages: () => 1
        };
        this.splitTextToSize = mockSplitTextToSize;
        this.save = mockSave;
        this.output = mockOutput;
        this.line = mockLine;
        this.setPage = mockSetPage;
      }
    }
  };
});

describe('PDF Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPaperData = {
    institution_name: 'NIT Trichy',
    examination_name: 'Mid Semester Exam',
    title: 'Operating Systems',
    duration: 120,
    max_marks: 50,
    instructions: 'Attempt all questions.',
    snapshot: {
      sections: [
        {
          name: 'Section A',
          sectionMarks: 10,
          questions: [
            { id: 'q1', type: 'MCQ', text: 'What is a process?', marks: 2, options: ['Program', 'Hardware'] }
          ]
        }
      ]
    }
  };

  it('initializes jsPDF and generates header details', () => {
    const doc = generatePaperPDF(mockPaperData, { action: 'blob' });
    
    expect(doc).toBeInstanceOf(Blob);
    
    // Verify text method was called with our data
    const textCalls = mockText.mock.calls;
    const allText = textCalls.map(call => call[0]).flat().join(' ');
    
    expect(allText).toContain('NIT Trichy');
    expect(allText).toContain('Operating Systems');
    expect(allText).toContain('Max Marks: 50');
    expect(allText).toContain('Section A');
    expect(allText).toContain('What is a process?');
  });
});