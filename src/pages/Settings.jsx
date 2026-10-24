import React, { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import { exportData, importData } from '../services/backupService.js';

const Settings = () => {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleBackup = async () => {
    try {
      const jsonData = await exportData();
      
      // Create a blob and trigger browser download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QPMS_Backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatus({ type: 'success', message: 'Database backed up successfully.' });
    } catch (error) {
      console.warn("Export failed in web preview", error);
      setStatus({ type: 'error', message: 'Export is only fully supported in the native Android app.' });
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("WARNING: Restoring a backup will erase ALL current data. Continue?")) {
      e.target.value = ''; // reset
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonString = event.target.result;
        const result = await importData(jsonString);
        
        if (result.success) {
          setStatus({ type: 'success', message: 'Database restored successfully! Please refresh the app.' });
        } else {
          setStatus({ type: 'error', message: `Restore failed: ${result.error}` });
        }
      } catch (err) {
        console.warn("Import failed in web preview", err);
        setStatus({ type: 'error', message: 'Import is only fully supported in the native Android app.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings & Data Management</h1>
      
      {status.message && (
        <div className={`p-4 mb-6 rounded-lg font-medium ${
          status.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30' 
            : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/30'
        }`}>
          {status.message}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        
        {/* Backup Section */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2 text-slate-900 dark:text-white">
            <Download className="text-indigo-600 dark:text-indigo-400" /> Backup Database
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
            Export all your subjects, questions, and saved papers into a single secure JSON file. You can use this file to transfer your data to another device.
          </p>
          <button 
            onClick={handleBackup} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Download Backup File
          </button>
        </div>

        {/* Restore Section */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2 text-slate-900 dark:text-white">
            <Upload className="text-orange-600 dark:text-orange-500" /> Restore Database
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
            Import a previously downloaded backup JSON file. 
            <span className="font-bold text-red-600 dark:text-red-400 ml-1">This will permanently overwrite your current database.</span>
          </p>
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleRestore}
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Select Backup File to Restore
          </button>
        </div>

        {/* Danger Zone Section */}
        <div className="p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2 text-red-600 dark:text-red-500">
            <AlertTriangle /> Danger Zone
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
            Clear all application data and reset the database to factory settings.
          </p>
          <button 
            onClick={() => {
              if(window.confirm('Delete ALL data? This cannot be undone.')) {
                alert('Data cleared (Simulated for Web Preview)');
              }
            }}
            className="border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Clear All Data
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;