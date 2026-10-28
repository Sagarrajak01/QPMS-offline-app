import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Trash2, FileText, ArrowLeft, Settings, Download, X } from 'lucide-react';
import { getAllPapers, createPaper, deletePaper } from '../repositories/paperRepository.js';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { getQuestionsBySubject } from '../repositories/questionRepository.js';
import { generatePaper } from '../services/paperEngine.js';
import { generatePaperPDF } from '../utils/pdfGenerator.js';

const createDefaultForm = () => ({
  title: '', examination_name: '', institution_name: '', subject_id: '', duration: 180, max_marks: 100, instructions: ''
});

const createDefaultSections = () => [
  { name: 'Section A', instructions: 'Attempt all.', requirements: [{ type: 'MCQ', difficulty: 'MEDIUM', count: 5, marksPerQuestion: 2 }] }
];

const createRequirement = () => ({ type: 'SHORT', difficulty: 'MEDIUM', count: 1, marksPerQuestion: 2 });

const errorMessage = (error) => error?.message || 'Unknown error.';

// Returns a message describing the first problem with the blueprint, or null if it is usable.
const validateBlueprint = (sections) => {
  if (sections.length === 0) return 'Add at least one section to the blueprint.';
  const empty = sections.findIndex((s) => s.requirements.length === 0);
  if (empty !== -1) {
    const name = sections[empty].name.trim() || `Section ${empty + 1}`;
    return `"${name}" has no requirements. Add a requirement or remove the section.`;
  }
  return null;
};


const toPdfFileName = (title) => {
  const base = String(title || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{M}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return `${base || 'question_paper'}.pdf`;
};

const isUserCancellation = (error) => /cancel/i.test(error?.message || '');

const savePaperPdf = async (paper) => {
  const printable = { ...paper, title: paper.title || 'Untitled paper' };
  const fileName = toPdfFileName(paper.title);

  if (!Capacitor.isNativePlatform()) {
    generatePaperPDF(printable, { action: 'save', filename: fileName });
    return;
  }

  const dataUri = generatePaperPDF(printable, { action: 'dataurl' });
  const marker = 'base64,';
  const markerIndex = typeof dataUri === 'string' ? dataUri.indexOf(marker) : -1;
  if (markerIndex === -1) throw new Error('The PDF could not be generated.');

  // Without an encoding, the plugin writes the base64 string as binary data.
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: dataUri.slice(markerIndex + marker.length),
    directory: Directory.Cache,
  });
  await Share.share({ title: printable.title, dialogTitle: 'Save question paper', url: uri });
};

const Papers = () => {
  const [view, setView] = useState('list');
  const [papers, setPapers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultForm);
  const [sections, setSections] = useState(createDefaultSections);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // The effect is the single place that fetches. Each run owns a `cancelled` flag, so a
  // slow earlier load can never overwrite the results of a newer one (or of an unmount).
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [subs, paps] = await Promise.all([getAllSubjects(), getAllPapers()]);
        if (cancelled) return;
        setSubjects(subs || []);
        setPapers(paps || []);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load papers:', error);
        setLoadError(errorMessage(error));
      }
      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this paper?')) return;
    setNotice(null);
    try {
      await deletePaper(id);
    } catch (error) {
      console.error('Failed to delete the paper:', error);
      setNotice(`Could not delete the paper: ${errorMessage(error)}`);
    }
    reload();
  };

  const handleDownloadPDF = async (paper) => {
    if (downloadingId) return;
    setNotice(null);
    setDownloadingId(paper.id);
    try {
      await savePaperPdf(paper);
    } catch (error) {
      if (isUserCancellation(error)) return;
      console.error('Failed to export the PDF:', error);
      setNotice(`Could not create the PDF: ${errorMessage(error)}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (isGenerating) return;
    if (!formData.subject_id) { alert('Select a subject!'); return; }
    if (!(formData.duration > 0) || !(formData.max_marks > 0)) {
      alert('Time and Max Marks must be greater than zero.');
      return;
    }
    const blueprintProblem = validateBlueprint(sections);
    if (blueprintProblem) { alert(blueprintProblem); return; }

    setIsGenerating(true);
    try {
      let bank;
      try {
        bank = await getQuestionsBySubject(formData.subject_id);
      } catch (error) {
        console.error('Failed to load the question bank:', error);
        alert(`Could not load the questions for this subject: ${errorMessage(error)}`);
        return;
      }

      const { errors, paper } = generatePaper({ sections }, bank);
      if (errors.length > 0) { alert('Failed to generate paper:\n\n' + errors.join('\n')); return; }

      // The PDF prints Max Marks from the form, so it must agree with the questions actually chosen.
      let maxMarks = formData.max_marks;
      if (paper.totalMarks !== maxMarks) {
        const useTotal = window.confirm(
          `The generated questions add up to ${paper.totalMarks} marks, but Max Marks is ${maxMarks}.\n\n` +
          `OK: save the paper with Max Marks = ${paper.totalMarks}.\nCancel: go back and adjust it.`
        );
        if (!useTotal) return;
        maxMarks = paper.totalMarks;
      }

      try {
        await createPaper({ ...formData, institution_name: formData.institution_name.trim(), max_marks: maxMarks, snapshot: paper, is_draft: 0 });
      } catch (error) {
        console.error('Failed to save the paper:', error);
        // Stay on the form so nothing the user entered is lost.
        alert(`Could not save the paper: ${errorMessage(error)}`);
        return;
      }

      setView('list');
      reload();
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSection = (sIdx, patch) => setSections((prev) => prev.map((s, i) => (i === sIdx ? { ...s, ...patch } : s)));
  const updateRequirements = (sIdx, change) => setSections((prev) => prev.map((s, i) => (i === sIdx ? { ...s, requirements: change(s.requirements) } : s)));

  const addSection = () => setSections((prev) => [...prev, { name: `Section ${String.fromCharCode(65 + prev.length)}`, instructions: '', requirements: [] }]);
  const removeSection = (sIdx) => setSections((prev) => prev.filter((_, i) => i !== sIdx));
  const addReq = (sIdx) => updateRequirements(sIdx, (reqs) => [...reqs, createRequirement()]);
  const updateReq = (sIdx, rIdx, field, val) => updateRequirements(sIdx, (reqs) => reqs.map((r, i) => (i === rIdx ? { ...r, [field]: val } : r)));
  const removeReq = (sIdx, rIdx) => updateRequirements(sIdx, (reqs) => reqs.filter((_, i) => i !== rIdx));

  const inputClass = "w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
  const reqInputClass = "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded p-1.5 text-sm";

  const loadErrorPanel = loadError && (
    <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-500/10 p-4 text-red-800 dark:text-red-300">
      <p className="flex-1 text-sm">Could not load your data: {loadError}</p>
      <button type="button" onClick={reload} className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700">Retry</button>
    </div>
  );

  if (view === 'build') {
    return (
      <div className="max-w-4xl mx-auto pb-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} aria-label="Back to saved papers" className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Generate New Paper</h1>
        </div>

        {loadErrorPanel}

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 transition-colors">
            <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-900 dark:text-white">Paper Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="paper-subject" className={labelClass}>Subject *</label>
                <select id="paper-subject" required className={inputClass} value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {!isLoading && !loadError && subjects.length === 0 && (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">No subjects yet. Create one on the Subjects page first.</p>
                )}
              </div>
              <div><label htmlFor="paper-title" className={labelClass}>Paper Title *</label><input id="paper-title" required type="text" className={inputClass} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. End Semester Exam" /></div>
              <div><label htmlFor="paper-exam" className={labelClass}>Examination Name</label><input id="paper-exam" type="text" className={inputClass} value={formData.examination_name} onChange={e => setFormData({...formData, examination_name: e.target.value})} placeholder="e.g. Spring 2026" /></div>
              <div><label htmlFor="paper-institution" className={labelClass}>Institution Name</label><input id="paper-institution" type="text" className={inputClass} value={formData.institution_name} onChange={e => setFormData({...formData, institution_name: e.target.value})} placeholder="Printed at the top of the paper" /></div>
              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <div><label htmlFor="paper-duration" className={labelClass}>Time (mins)</label><input id="paper-duration" required type="number" min="1" className={inputClass} value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 0})} /></div>
                <div><label htmlFor="paper-max-marks" className={labelClass}>Max Marks</label><input id="paper-max-marks" required type="number" min="1" className={inputClass} value={formData.max_marks} onChange={e => setFormData({...formData, max_marks: parseInt(e.target.value) || 0})} /></div>
              </div>
            </div>
            <div><label htmlFor="paper-instructions" className={labelClass}>General Instructions</label><textarea id="paper-instructions" rows="2" className={inputClass} value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} /></div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-900 dark:text-white">Paper Blueprint</h2><button type="button" onClick={addSection} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">+ Add Section</button></div>
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <input type="text" aria-label="Section name" className="font-bold text-lg border-b border-dashed border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" value={section.name} onChange={e => updateSection(sIdx, { name: e.target.value })} />
                  <button type="button" onClick={() => removeSection(sIdx)} aria-label="Remove section" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"><Trash2 size={18} /></button>
                </div>
                <input type="text" aria-label="Section instructions" placeholder="Section instructions (optional)" className={`${inputClass} mb-4 text-sm`} value={section.instructions} onChange={e => updateSection(sIdx, { instructions: e.target.value })} />
                
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase"><div className="col-span-3 sm:col-span-3">Type</div><div className="col-span-3 sm:col-span-3">Difficulty</div><div className="col-span-2 sm:col-span-2">Count</div><div className="col-span-3 sm:col-span-3">Marks</div></div>
                  {section.requirements.map((req, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-12 gap-2 items-center">
                      <select aria-label="Question type" className={`col-span-3 ${reqInputClass}`} value={req.type} onChange={e => updateReq(sIdx, rIdx, 'type', e.target.value)}><option value="MCQ">MCQ</option><option value="SHORT">Short</option><option value="LONG">Long</option><option value="DESCRIPTIVE">Desc</option></select>
                      <select aria-label="Difficulty" className={`col-span-3 ${reqInputClass}`} value={req.difficulty} onChange={e => updateReq(sIdx, rIdx, 'difficulty', e.target.value)}><option value="EASY">Easy</option><option value="MEDIUM">Med</option><option value="HARD">Hard</option></select>
                      <input type="number" min="1" aria-label="Question count" className={`col-span-2 ${reqInputClass}`} value={req.count} onChange={e => updateReq(sIdx, rIdx, 'count', parseInt(e.target.value)||1)} />
                      <input type="number" min="1" aria-label="Marks per question" className={`col-span-3 ${reqInputClass}`} value={req.marksPerQuestion} onChange={e => updateReq(sIdx, rIdx, 'marksPerQuestion', parseInt(e.target.value)||1)} />
                      <button type="button" onClick={() => removeReq(sIdx, rIdx)} aria-label="Remove requirement" className="col-span-1 text-slate-400 hover:text-red-500 text-center"><X size={16} className="mx-auto"/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addReq(sIdx)} className="text-sm text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">+ Add Requirement</button>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={isGenerating} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed">{isGenerating ? 'Generating...' : 'Generate Question Paper'}</button>
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

      {notice && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-500/10 p-4 text-red-800 dark:text-red-300">
          <p className="flex-1 text-sm">{notice}</p>
          <button onClick={() => setNotice(null)} aria-label="Dismiss message" className="shrink-0 opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      {loadErrorPanel}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {papers.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400">{p.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{p.examination_name}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-2">
                <button onClick={() => handleDownloadPDF(p)} disabled={downloadingId !== null} className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg transition disabled:opacity-60" title="Download PDF" aria-label="Download PDF"><Download size={18} /></button>
                <button onClick={() => handleDelete(p.id)} aria-label="Delete paper" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg transition"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="mt-5 flex gap-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
              <span className="flex items-center gap-1 font-medium"><FileText size={16} className="text-slate-400"/> {p.max_marks} Marks</span>
              <span className="font-medium">{Math.floor(p.duration / 60)}h {p.duration % 60}m</span>
              <span className="font-medium">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {isLoading && <div role="status" className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">Loading papers...</div>}
        {!isLoading && !loadError && papers.length === 0 && <div className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10 flex flex-col items-center"><FileText size={48} className="mb-4 opacity-20" /><p>No papers generated yet.</p></div>}
      </div>
    </div>
  );
};
export default Papers;