import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { getAllQuestions } from '../repositories/questionRepository.js';
import { getAllPapers } from '../repositories/paperRepository.js';

export const exportDatabase = async () => {
  try {
    const subjects = await getAllSubjects();
    const questions = await getAllQuestions();
    const papers = await getAllPapers();

    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      data: { subjects, questions, papers }
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const fileName = `QPMS_Backup_${new Date().getTime()}.json`;

    // Write the file to Android Native Cache Storage
    const result = await Filesystem.writeFile({
      path: fileName,
      data: jsonStr,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    // Trigger the Native Android "Share/Save" Intent
    await Share.share({
      title: 'QPMS Database Backup',
      text: 'Here is your QPMS database backup file.',
      url: result.uri,
      dialogTitle: 'Save Backup File'
    });

    return { success: true, message: "Backup exported successfully." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const importDatabase = async (jsonString) => {
  return { success: false, message: "Import mapping requires a native file picker execution." };
};