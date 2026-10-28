import { useEffect, useState } from 'react';
import { BookOpen, Database, FileText } from 'lucide-react';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { getAllQuestions } from '../repositories/questionRepository.js';
import { getAllPapers } from '../repositories/paperRepository.js';

const PLACEHOLDER = '–';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Each run owns a `cancelled` flag, so a response arriving after unmount or after a
  // newer request is ignored.
  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const [subjects, questions, papers] = await Promise.all([getAllSubjects(), getAllQuestions(), getAllPapers()]);
        if (cancelled) return;
        setStats({ subjects: subjects?.length ?? 0, questions: questions?.length ?? 0, papers: papers?.length ?? 0 });
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load dashboard statistics:', error);
        setLoadError(error?.message || 'Unknown error.');
      }
    };

    loadStats();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const retry = () => {
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const display = (count) => (stats ? count : PLACEHOLDER);

  const statCards = [
    { title: 'Total Subjects', value: display(stats?.subjects), icon: <BookOpen size={24} className="text-indigo-600 dark:text-indigo-400" />, bgColor: 'bg-indigo-100 dark:bg-indigo-500/20' },
    { title: 'Question Bank', value: display(stats?.questions), icon: <Database size={24} className="text-emerald-600 dark:text-emerald-400" />, bgColor: 'bg-emerald-100 dark:bg-emerald-500/20' },
    { title: 'Saved Papers', value: display(stats?.papers), icon: <FileText size={24} className="text-purple-600 dark:text-purple-400" />, bgColor: 'bg-purple-100 dark:bg-purple-500/20' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">Dashboard Overview</h1>

      {loadError && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-500/10 p-4 text-red-800 dark:text-red-300">
          <p className="flex-1 text-sm">Could not load the dashboard: {loadError}</p>
          <button onClick={retry} className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700">Retry</button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-5 transition-all hover:shadow-md">
            <div className={`p-4 rounded-xl ${card.bgColor}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.title}</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;