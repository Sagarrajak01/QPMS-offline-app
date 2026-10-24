import React, { useEffect, useState } from 'react';
import { BookOpen, Database, FileText } from 'lucide-react';
import { getAllSubjects } from '../repositories/subjectRepository.js';
import { getAllPapers } from '../repositories/paperRepository.js';

const Dashboard = () => {
  const [stats, setStats] = useState({ subjects: 0, questions: 0, papers: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const subjects = await getAllSubjects();
        const papers = await getAllPapers();
        setStats({ subjects: subjects?.length || 0, questions: 0, papers: papers?.length || 0 });
      } catch (error) {
        setStats({ subjects: 2, questions: 45, papers: 3 }); // Web mock
      }
    };
    loadStats();
  }, []);

  const statCards = [
    { title: 'Total Subjects', value: stats.subjects, icon: <BookOpen size={24} className="text-indigo-600 dark:text-indigo-400" />, bgColor: 'bg-indigo-100 dark:bg-indigo-500/20' },
    { title: 'Question Bank', value: stats.questions, icon: <Database size={24} className="text-emerald-600 dark:text-emerald-400" />, bgColor: 'bg-emerald-100 dark:bg-emerald-500/20' },
    { title: 'Saved Papers', value: stats.papers, icon: <FileText size={24} className="text-purple-600 dark:text-purple-400" />, bgColor: 'bg-purple-100 dark:bg-purple-500/20' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">Dashboard Overview</h1>
      
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