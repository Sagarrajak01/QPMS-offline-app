import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SubjectModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    name: '', code: '', description: '', default_duration: 180, default_marks: 100
  });

  useEffect(() => {
    if (initialData) setFormData(initialData);
    else setFormData({ name: '', code: '', description: '', default_duration: 180, default_marks: 100 });
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass = "mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {initialData ? 'Edit Subject' : 'Add New Subject'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Subject Name *</label>
            <input type="text" required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label className={labelClass}>Subject Code</label>
            <input type="text" className={inputClass} value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. MAT101" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Duration (mins)</label>
              <input type="number" required min="1" className={inputClass} value={formData.default_duration} onChange={e => setFormData({...formData, default_duration: parseInt(e.target.value) || 0})} />
            </div>
            <div>
              <label className={labelClass}>Default Marks</label>
              <input type="number" required min="1" className={inputClass} value={formData.default_marks} onChange={e => setFormData({...formData, default_marks: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          
          <div className="pt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium">
              Save Subject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectModal;