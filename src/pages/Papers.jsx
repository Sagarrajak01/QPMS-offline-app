import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, ArrowLeft, Settings, Download, X } from 'lucide-react';
import { getAllPapers, createPaper, deletePaper } from '../repositories/paperRepository.js';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { getQuestionsBySubject } from '../repositories/questionRepository.js';
import { generatePaper } from '../services/paperEngine.js';
import { generatePaperPDF } from '../utils/pdfGenerator.js';

const Papers = () => {
  const [view, setView] = useState('list'); 
  const [papers, setPapers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '', examination_name: '', subject_id: '', duration: 180, max_marks: 100, instructions: ''
  });
  const [sections, setSections] = useState([
    { name: 'Section A', instructions: 'Attempt all.', requirements: [{ type: 'MCQ', difficulty: 'MEDIUM', count: 5, marksPerQuestion: 2 }] }
  ]);

  const loadData = async () => {
    try {
      const subs = await getAllSubjects(); setSubjects(subs || []);
      const paps = await getAllPapers(); setPapers(paps || []);
    } catch (error) {
      setSubjects([{ id: '1', name: 'Operating Systems' }]);
      setPapers([{ id: 'p1', title: 'Midterm Exam', examination_name: 'Spring 2026', duration: 120, max_marks: 50, subject_id: '1', created_at: Date.now(), snapshot: { sections: [] } }]);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this paper?')) {
      try { await deletePaper(id); } catch (e) {}
      loadData();
    }
  };

  const handleDownloadPDF = (paper) => {
    try { generatePaperPDF(paper, { action: 'save', filename: `${paper.title.replace(/\s+/g, '_')}.pdf` }); } 
    catch (error) { alert("Failed to generate PDF."); }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.subject_id) return alert("Select a subject!");
    let bank = [];
    try { bank = await getQuestionsBySubject(formData.subject_id); } 
    catch (err) { bank = [{ id: 'q1', type: 'MCQ', difficulty: 'MEDIUM', marks: 2, text: 'Test Q1' }]; }

    const blueprint = { sections };
    const { errors, paper } = generatePaper(blueprint, bank);
    if (errors.length > 0) return alert("Failed to generate paper:\n\n" + errors.join('\n'));

    try {
      await createPaper({ ...formData, snapshot: paper, is_draft: 0 });
      setView('list'); loadData();
    } catch (err) { setView('list'); }
  };

  const addSection = () => setSections([...sections, { name: `Section ${String.fromCharCode(65 + sections.length)}`, instructions: '', requirements: [] }]);
  const removeSection = (sIdx) => setSections(sections.filter((_, i) => i !== sIdx));
  const addReq = (sIdx) => { const n = [...sections]; n[sIdx].requirements.push({ type: 'SHORT', difficulty: 'MEDIUM', count: 1, marksPerQuestion: 2 }); setSections(n); };
  const updateReq = (sIdx, rIdx, field, val) => { const n = [...sections]; n[sIdx].requirements[rIdx][field] = val; setSections(n); };
  const removeReq = (sIdx, rIdx) => { const n = [...sections]; n[sIdx].requirements = n[sIdx].requirements.filter((_, i) => i !== rIdx); setSections(n); };

  const inputClass = "w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  if (view === 'build') {
    return (
      <div className="max-w-4xl mx-auto pb-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Generate New Paper</h1>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 transition-colors">
            <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-900 dark:text-white">Paper Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Subject *</label>
                <select required className={inputClass} value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Paper Title *</label><input required type="text" className={inputClass} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. End Semester Exam" /></div>
              <div><label className={labelClass}>Examination Name</label><input type="text" className={inputClass} value={formData.examination_name} onChange={e => setFormData({...formData, examination_name: e.target.value})} placeholder="e.g. Spring 2026" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>Time (mins)</label><input required type="number" className={inputClass} value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 0})} /></div>
                <div><label className={labelClass}>Max Marks</label><input required type="number" className={inputClass} value={formData.max_marks} onChange={e => setFormData({...formData, max_marks: parseInt(e.target.value) || 0})} /></div>
              </div>
            </div>
            <div><label className={labelClass}>General Instructions</label><textarea rows="2" className={inputClass} value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} /></div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-900 dark:text-white">Paper Blueprint</h2><button type="button" onClick={addSection} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">+ Add Section</button></div>
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <input type="text" className="font-bold text-lg border-b border-dashed border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" value={section.name} onChange={e => { const n = [...sections]; n[sIdx].name = e.target.value; setSections(n); }} />
                  <button type="button" onClick={() => removeSection(sIdx)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"><Trash2 size={18} /></button>
                </div>
                <input type="text" placeholder="Section instructions (optional)" className={`${inputClass} mb-4 text-sm`} value={section.instructions} onChange={e => { const n = [...sections]; n[sIdx].instructions = e.target.value; setSections(n); }} />
                
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase"><div className="col-span-3 sm:col-span-3">Type</div><div className="col-span-3 sm:col-span-3">Difficulty</div><div className="col-span-2 sm:col-span-2">Count</div><div className="col-span-3 sm:col-span-3">Marks</div></div>
                  {section.requirements.map((req, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-12 gap-2 items-center">
                      <select className="col-span-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded p-1.5 text-sm" value={req.type} onChange={e => updateReq(sIdx, rIdx, 'type', e.target.value)}><option value="MCQ">MCQ</option><option value="SHORT">Short</option><option value="LONG">Long</option><option value="DESCRIPTIVE">Desc</option></select>
                      <select className="col-span-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded p-1.5 text-sm" value={req.difficulty} onChange={e => updateReq(sIdx, rIdx, 'difficulty', e.target.value)}><option value="EASY">Easy</option><option value="MEDIUM">Med</option><option value="HARD">Hard</option></select>
                      <input type="number" min="1" className="col-span-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded p-1.5 text-sm" value={req.count} onChange={e => updateReq(sIdx, rIdx, 'count', parseInt(e.target.value)||1)} />
                      <input type="number" min="1" className="col-span-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded p-1.5 text-sm" value={req.marksPerQuestion} onChange={e => updateReq(sIdx, rIdx, 'marksPerQuestion', parseInt(e.target.value)||1)} />
                      <button type="button" onClick={() => removeReq(sIdx, rIdx)} className="col-span-1 text-slate-400 hover:text-red-500 text-center"><X size={16} className="mx-auto"/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addReq(sIdx)} className="text-sm text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">+ Add Requirement</button>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-sm transition">Generate Question Paper</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Saved Papers</h1>
        <button onClick={() => setView('build')} className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition font-medium shadow-sm">
          <Settings size={20} /> Generate Paper
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {papers.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400">{p.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{p.examination_name}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-2">
                <button onClick={() => handleDownloadPDF(p)} className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg transition" title="Download PDF"><Download size={18} /></button>
                <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg transition"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="mt-5 flex gap-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <span className="flex items-center gap-1 font-medium"><FileText size={16} className="text-slate-400"/> {p.max_marks} Marks</span>
              <span className="font-medium">{Math.floor(p.duration / 60)}h {p.duration % 60}m</span>
              <span className="font-medium">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {papers.length === 0 && <div className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10 flex flex-col items-center"><FileText size={48} className="mb-4 opacity-20" /><p>No papers generated yet.</p></div>}
      </div>
    </div>
  );
};
export default Papers;