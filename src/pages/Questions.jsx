import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Trash2, Search, Edit2, Database } from 'lucide-react';
import QuestionModal from '../components/QuestionModal.jsx';
import { getAllQuestions, createQuestion, updateQuestion, deleteQuestion } from '../repositories/questionRepository.js';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { parseQuestionsCSV } from '../utils/csvHandler.js';

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      const subs = await getAllSubjects();
      setSubjects(subs || []);
      const qs = await getAllQuestions();
      setQuestions(qs || []);
    } catch (error) {
      setQuestions([{ id: '1', text: 'What is Linux?', type: 'SHORT', difficulty: 'EASY', marks: 2, subject_id: '1' }]);
      setSubjects([{ id: '1', name: 'Operating Systems' }]);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (qData) => {
    try {
      if (editingQuestion) await updateQuestion(editingQuestion.id, qData);
      else await createQuestion(qData);
    } catch (e) { } 
    finally {
      setIsModalOpen(false); setEditingQuestion(null); loadData();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try { await deleteQuestion(id); } catch (e) {}
      loadData();
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (subjects.length === 0) return alert("Please create a subject first before importing questions.");
    
    const defaultSubjectId = subjects[0].id;
    const { validQuestions, errors } = await parseQuestionsCSV(file);
    
    if (errors.length > 0) alert(`Parsed with ${errors.length} errors. Check console. Importing valid rows...`);

    try {
      for (const q of validQuestions) await createQuestion({ ...q, subject_id: defaultSubjectId });
    } catch (err) {}
    
    loadData();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredQuestions = questions.filter(q => q.text.toLowerCase().includes(search.toLowerCase()));
  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || 'Unknown';

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Question Bank</h1>
        <div className="flex w-full sm:w-auto gap-3">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCSVUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium shadow-sm">
            <Upload size={20} /> Import CSV
          </button>
          <button onClick={() => { 
            if (subjects.length === 0) return alert("Create a subject first!");
            setEditingQuestion(null); setIsModalOpen(true); 
          }} className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition font-medium shadow-sm">
            <Plus size={20} /> Add Question
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input type="text" placeholder="Search questions..." className="pl-10 w-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 md:p-6">
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
                    <button onClick={() => { setEditingQuestion(q); setIsModalOpen(true); }} className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg transition"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(q.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg transition"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredQuestions.length === 0 && (
              <div className="text-center text-slate-500 dark:text-slate-400 py-10 flex flex-col items-center">
                <Database size={48} className="mb-4 opacity-20" />
                <p>No questions found. Add one or import a CSV!</p>
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