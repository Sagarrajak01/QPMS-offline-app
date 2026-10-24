import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportDatabase, importDatabase } from '../../src/services/backupService.js';
import * as subjectRepo from '../../src/repositories/subjectRepository.js';
import * as questionRepo from '../../src/repositories/questionRepository.js';
import * as paperRepo from '../../src/repositories/paperRepository.js';

vi.mock('../../src/repositories/subjectRepository.js');
vi.mock('../../src/repositories/questionRepository.js');
vi.mock('../../src/repositories/paperRepository.js');

// Mock Native Capacitor Plugins
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn().mockResolvedValue({ uri: 'file://mock/path' }) },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' }
}));

vi.mock('@capacitor/share', () => ({
  Share: { share: vi.fn().mockResolvedValue({}) }
}));

describe('Backup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports data to a native file and opens the Android share intent', async () => {
    subjectRepo.getAllSubjects.mockResolvedValue([{ id: 's1', name: 'Sub 1' }]);
    questionRepo.getAllQuestions.mockResolvedValue([{ id: 'q1', text: 'Q 1' }]);
    paperRepo.getAllPapers.mockResolvedValue([{ id: 'p1', title: 'Paper 1' }]);

    const result = await exportDatabase();

    expect(result.success).toBe(true);
    expect(subjectRepo.getAllSubjects).toHaveBeenCalled();
    expect(questionRepo.getAllQuestions).toHaveBeenCalled();
    expect(paperRepo.getAllPapers).toHaveBeenCalled();
  });

  it('fails gracefully on import since native file picker is required', async () => {
    const result = await importDatabase('{"valid":"json"}');
    expect(result.success).toBe(false);
  });
});