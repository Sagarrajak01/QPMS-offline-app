import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const QuestionModal = ({ isOpen, onClose, onSave, initialData, subjects }) => {
  const [formData, setFormData] = useState({
    subject_id: '', type: 'MCQ', difficulty: 'MEDIUM', marks: 1, unit: '', topic: '', text: '', options: ['', '', '', ''], correct_answer: ''
  });

  useEffect(() => {
    if (initialData) setFormData({ ...initialData, options: initialData.options || ['', '', '', ''] });
    else setFormData({ subject_id: subjects.length > 0 ? subjects[0].id : '', type: 'MCQ', difficulty: 'MEDIUM', marks: 1, unit: '', topic: '', text: '', options: ['', '', '', ''], correct_answer: '' });
  }, [initialData, isOpen, subjects]);

  if (!isOpen) return null;

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options]; newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const inputClass = "mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{initialData ? 'Edit Question' : 'Add New Question'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Subject *</label>
              <select required className={inputClass} value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Type *</label>
              <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="MCQ">Multiple Choice (MCQ)</option><option value="SHORT">Short Answer</option><option value="LONG">Long Answer</option><option value="DESCRIPTIVE">Descriptive</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Difficulty *</label>
              <select className={inputClass} value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
              </select>
            </div>
            <div><label className={labelClass}>Marks *</label><input type="number" required min="1" className={inputClass} value={formData.marks} onChange={e => setFormData({...formData, marks: parseInt(e.target.value) || 1})} /></div>
            <div><label className={labelClass}>Unit (Optional)</label><input type="text" className={inputClass} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} /></div>
            <div><label className={labelClass}>Topic (Optional)</label><input type="text" className={inputClass} value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} /></div>
          </div>

          <div><label className={labelClass}>Question Text *</label><textarea required rows={3} className={inputClass} value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} /></div>

          {formData.type === 'MCQ' && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-medium text-sm text-slate-900 dark:text-white">MCQ Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map(i => <input key={i} type="text" placeholder={`Option ${i + 1}`} required className={inputClass} value={formData.options[i] || ''} onChange={e => handleOptionChange(i, e.target.value)} />)}
              </div>
              <div>
                <label className={labelClass}>Correct Answer *</label>
                <select required className={inputClass} value={formData.correct_answer} onChange={e => setFormData({...formData, correct_answer: e.target.value})}>
                  <option value="">Select Correct Option</option>
                  {formData.options.map((opt, i) => opt ? <option key={i} value={opt}>{opt}</option> : null)}
                </select>
              </div>
            </div>
          )}
          
          <div className="pt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium">Save Question</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default QuestionModal;