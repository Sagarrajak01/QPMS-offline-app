import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Upload, Trash2, Search, Edit2, Database, X } from 'lucide-react';
import QuestionModal from '../components/QuestionModal.jsx';
import { getAllQuestions, createQuestion, updateQuestion, deleteQuestion } from '../repositories/questionRepository.js';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { parseQuestionsCSV } from '../utils/csvHandler.js';

const MAX_LISTED_IMPORT_ERRORS = 5;

const NOTICE_STYLES = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  error: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300',
};

const errorMessage = (error) => error?.message || 'Unknown error.';
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const buildImportSummary = ({ subjectName, imported, parseErrors, saveFailures }) => {
  const lines = [
    imported > 0
      ? `Imported ${plural(imported, 'question')} into "${subjectName}".`
      : 'No questions were imported.',
  ];

  if (parseErrors.length > 0) {
    lines.push(`${plural(parseErrors.length, 'CSV row')} skipped:`);
    parseErrors.slice(0, MAX_LISTED_IMPORT_ERRORS).forEach(({ row, message }) => {
      lines.push(row > 0 ? `Row ${row}: ${message}` : message);
    });
    if (parseErrors.length > MAX_LISTED_IMPORT_ERRORS) {
      lines.push(`...and ${parseErrors.length - MAX_LISTED_IMPORT_ERRORS} more.`);
    }
  }

  if (saveFailures.length > 0) {
    lines.push(`${plural(saveFailures.length, 'question')} could not be saved: ${saveFailures[0]}`);
  }

  return lines.join('\n');
};

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSubjectId, setImportSubjectId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const fileInputRef = useRef(null);
  const isSavingRef = useRef(false);

  // Falls back to the first subject until the user picks one, or if the picked one was removed.
  const activeImportSubjectId = subjects.some((s) => s.id === importSubjectId) ? importSubjectId : subjects[0]?.id ?? '';

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // The effect is the single place that fetches. Each run owns a `cancelled` flag, so a
  // slow earlier load can never overwrite the results of a newer one (or of an unmount).
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [subs, qs] = await Promise.all([getAllSubjects(), getAllQuestions()]);
        if (cancelled) return;
        setSubjects(subs || []);
        setQuestions(qs || []);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load the question bank:', error);
        setLoadError(errorMessage(error));
      }
      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const showNotice = (type, text) => setNotice({ type, text });

  const handleSave = async (qData) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      if (editingQuestion) await updateQuestion(editingQuestion.id, qData);
      else await createQuestion(qData);
    } catch (error) {
      console.error('Failed to save the question:', error);
      // The modal stays open so the user's input is not lost. A banner would be hidden behind it.
      alert(`Could not save the question: ${errorMessage(error)}`);
      return;
    } finally {
      isSavingRef.current = false;
    }
    setIsModalOpen(false);
    setEditingQuestion(null);
    reload();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion(id);
    } catch (error) {
      console.error('Failed to delete the question:', error);
      showNotice('error', `Could not delete the question: ${errorMessage(error)}`);
    }
    reload();
  };

  const handleCSVUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // Checked before the try block so ignoring this file cannot reset the running import's state.
    if (isImporting) {
      input.value = '';
      return;
    }

    try {
      const subject = subjects.find((s) => s.id === activeImportSubjectId);
      if (!subject) {
        showNotice('error', 'Please create a subject first before importing questions.');
        return;
      }

      setNotice(null);
      setIsImporting(true);

      const { validQuestions, errors: parseErrors } = await parseQuestionsCSV(file);

      let imported = 0;
      const saveFailures = [];
      for (const q of validQuestions) {
        try {
          await createQuestion({ ...q, subject_id: subject.id });
          imported += 1;
        } catch (error) {
          console.error('Failed to import a question:', error);
          saveFailures.push(errorMessage(error));
        }
      }

      const hasProblems = parseErrors.length > 0 || saveFailures.length > 0;
      showNotice(
        imported === 0 ? 'error' : hasProblems ? 'warning' : 'success',
        buildImportSummary({ subjectName: subject.name, imported, parseErrors, saveFailures })
      );
      reload();
    } catch (error) {
      console.error('CSV import failed:', error);
      showNotice('error', `CSV import failed: ${errorMessage(error)}`);
    } finally {
      setIsImporting(false);
      // Clearing the input lets the same file be chosen again.
      input.value = '';
    }
  };

  const query = search.trim().toLowerCase();
  const filteredQuestions = questions.filter((q) => (q.text || '').toLowerCase().includes(query));
  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || 'Unknown';

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Question Bank</h1>
        <div className="flex flex-wrap items-center w-full sm:w-auto gap-3">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCSVUpload} />
          {subjects.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              Import into
              <select
                value={activeImportSubjectId}
                onChange={(e) => setImportSubjectId(e.target.value)}
                disabled={isImporting}
                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2 max-w-[10rem] outline-none focus:border-indigo-500"
              >
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex-1 sm:flex-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
            <Upload size={20} /> {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          <button onClick={() => { 
            if (subjects.length === 0) return alert("Create a subject first!");
            setEditingQuestion(null); setIsModalOpen(true); 
          }} className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition font-medium shadow-sm">
            <Plus size={20} /> Add Question
          </button>
        </div>
      </div>

      {notice && (
        <div role={notice.type === 'error' ? 'alert' : 'status'} className={`mb-4 flex items-start gap-3 rounded-lg border p-4 ${NOTICE_STYLES[notice.type]}`}>
          <p className="flex-1 whitespace-pre-line text-sm">{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label="Dismiss message" className="shrink-0 opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input type="text" placeholder="Search questions..." className="pl-10 w-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 md:p-6">
          {loadError && (
            <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-500/10 p-4 text-red-800 dark:text-red-300">
              <p className="flex-1 text-sm">Could not load the question bank: {loadError}</p>
              <button onClick={reload} className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700">Retry</button>
            </div>
          )}
          <div className="space-y-4">
            {filteredQuestions.map(q => (
              <div key={q.id} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 items-center mb-3">
                      <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">{getSubjectName(q.subject_id)}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded text-white ${q.difficulty === 'EASY' ? 'bg-emerald-500' : q.difficulty === 'MEDIUM' ? 'bg-amber-500' : 'bg-red-500'}`}>{q.difficulty}</span>
                      <span className="text-xs font-bold px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 rounded">{q.type}</span>
                      <span className="text-xs font-bold px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 rounded">{q.marks} Marks</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{q.text}</p>
                    {q.type === 'MCQ' && q.options && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`p-2 rounded border ${opt === q.correct_answer ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700'}`}>
                            {String.fromCharCode(97 + i)}) {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditingQuestion(q); setIsModalOpen(true); }} aria-label="Edit question" className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg transition"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(q.id)} aria-label="Delete question" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg transition"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div role="status" className="text-center text-slate-500 dark:text-slate-400 py-10">Loading questions...</div>
            )}
            {!isLoading && !loadError && filteredQuestions.length === 0 && (
              <div className="text-center text-slate-500 dark:text-slate-400 py-10 flex flex-col items-center">
                <Database size={48} className="mb-4 opacity-20" />
                <p>{questions.length === 0 ? 'No questions found. Add one or import a CSV!' : 'No questions match your search.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <QuestionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} initialData={editingQuestion} subjects={subjects} />
    </div>
  );
};
export default Questions;