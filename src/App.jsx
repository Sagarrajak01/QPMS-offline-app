import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Subjects from './pages/Subjects.jsx';
import Questions from './pages/Questions.jsx';
import Papers from './pages/Papers.jsx';
import Settings from './pages/Settings.jsx';
import { initDB } from './db/database.js';

const FALLBACK_ERROR_MESSAGE = 'The local database could not be opened.';

const screenClass = 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4';

const NotFound = () => (
  <div className="p-8 text-center text-slate-700 dark:text-slate-300">
    <h2 className="text-xl font-bold mb-2">Page not found</h2>
    <Link to="/" className="text-indigo-600 dark:text-indigo-400 underline">Back to Dashboard</Link>
  </div>
);

function App() {
  // The app never renders its pages until local storage is confirmed usable, so a
  // storage failure is reported once, clearly, instead of every page failing quietly.
  const [init, setInit] = useState({ status: 'loading', message: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    initDB()
      .then(() => {
        if (!cancelled) setInit({ status: 'ready', message: '' });
      })
      .catch((err) => {
        console.error('Database initialization failed:', err);
        if (!cancelled) setInit({ status: 'error', message: err?.message || FALLBACK_ERROR_MESSAGE });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setInit({ status: 'loading', message: '' });
    setAttempt((n) => n + 1);
  };

  if (init.status === 'error') {
    return (
      <div className={screenClass}>
        <div
          role="alert"
          className="max-w-md bg-white dark:bg-slate-800 p-8 rounded-lg shadow border border-red-200 dark:border-red-900 text-center"
        >
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Storage unavailable</h2>
          <p className="text-gray-600 dark:text-slate-300 mb-4">{init.message}</p>
          <button
            type="button"
            onClick={retry}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (init.status === 'loading') {
    return (
      <div className={screenClass}>
        <div role="status" className="animate-pulse text-blue-600 dark:text-blue-400 font-medium">Loading UI...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="questions" element={<Questions />} />
          <Route path="papers" element={<Papers />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;