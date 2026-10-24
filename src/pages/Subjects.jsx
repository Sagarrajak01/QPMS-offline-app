import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, BookOpen } from 'lucide-react';
import SubjectModal from '../components/SubjectModal.jsx';
import { getAllSubjects, createSubject, updateSubject, deleteSubject } from '../repositories/subjectRepository.js';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const loadSubjects = async () => {
    try {
      const data = await getAllSubjects();
      setSubjects(data || []);
    } catch (error) {
      console.error("Error loading subjects:", error);
      setSubjects([]); 
    }
  };

  useEffect(() => { loadSubjects(); }, []);

  const handleSave = async (subjectData) => {
    try {
      if (editingSubject) await updateSubject(editingSubject.id, subjectData);
      else await createSubject(subjectData);
    } catch (e) { 
      console.error("Error saving subject:", e);
    } 
    finally {
      setIsModalOpen(false);
      setEditingSubject(null);
      loadSubjects();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try { 
        await deleteSubject(id); 
      } catch (e) {
        console.error("Error deleting subject:", e);
      }
      loadSubjects();
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.code && s.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Manage Subjects</h1>
        <button 
          onClick={() => { setEditingSubject(null); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition font-medium w-full sm:w-auto justify-center shadow-sm"
        >
          <Plus size={20} /> Add Subject
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search subjects..."
              className="pl-10 w-full md:w-1/2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 md:p-6">
          {filteredSubjects.length === 0 ? (
             <div className="text-center text-slate-500 dark:text-slate-400 py-10 flex flex-col items-center">
               <BookOpen size={48} className="mb-4 opacity-20" />
               <p>No subjects found. Create your first subject!</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredSubjects.map(subject => (
                <div key={subject.id} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl p-5 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{subject.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">{subject.code || 'No Code'}</p>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                      <button onClick={() => { setEditingSubject(subject); setIsModalOpen(true); }} className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg transition">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(subject.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-4 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Time</span>
                      <span className="font-bold">{subject.default_duration} mins</span>
                    </div>
                    <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Marks</span>
                      <span className="font-bold">{subject.default_marks} max</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SubjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingSubject}
      />
    </div>
  );
};

export default Subjects;