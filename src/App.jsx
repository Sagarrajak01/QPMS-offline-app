import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Subjects from './pages/Subjects.jsx';
import Questions from './pages/Questions.jsx';
import Papers from './pages/Papers.jsx';
import Settings from './pages/Settings.jsx'; // <-- NEW IMPORT
import { initDB } from './db/database.js';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDB();
        setDbReady(true);
      } catch (err) {
        console.warn("Native SQLite is not available in the web browser. Running UI in web-preview mode.", err);
        setError(null); 
        setDbReady(true); 
      }
    };
    setupDatabase();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow border border-red-200 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Database Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-blue-600 font-medium">Loading UI...</div>
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
          <Route path="settings" element={<Settings />} /> {/* <-- NEW ROUTE */}
          <Route path="*" element={<div className="p-8 text-center">Under Construction</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;