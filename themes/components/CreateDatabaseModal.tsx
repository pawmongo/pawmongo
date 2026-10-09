'use client';

import React, { useState } from 'react';
import { Database, FolderPlus, X, AlertCircle } from 'lucide-react';

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDatabase: (dbName: string, collectionName: string, options?:Record<string,unknown>) => void;
}

export function CreateDatabaseModal({
  isOpen,
  onClose,
  onCreateDatabase,
}: CreateDatabaseModalProps) {
  const [dbName, setDbName] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [isCapped, setIsCapped] = useState(false);
  const [cappedSize, setCappedSize] = useState('1048576');
  const [useCustomCollation, setUseCustomCollation] = useState(false);
  const [collationLocale, setCollationLocale] = useState('en');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDb = dbName.trim();
    const trimmedColl = collectionName.trim();

    if (!trimmedDb) {
      setError('Database name is required.');
      return;
    }

    if (!trimmedColl) {
      setError('Collection name is required.');
      return;
    }

    // Check illegal chars: /\. "$*<>:|?
    if (/[/\\. "$*<>:|?]/.test(trimmedDb)) {
      setError('Database name contains invalid characters (/, \\, ., ", $, *, <, >, :, |, ?).');
      return;
    }

    setError('');
    try { await onCreateDatabase(trimmedDb, trimmedColl, { ...(isCapped ? {capped:true,size:Number(cappedSize)}:{}), ...(useCustomCollation?{collation:{locale:collationLocale}}:{}) }); } catch (error) { setError((error as Error).message); return; }
    setDbName('');
    setCollectionName('');
    setIsCapped(false);
    setUseCustomCollation(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#0b1a24] rounded-lg shadow-2xl border border-[#d8e2dc] dark:border-[#1c2d38] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2ef] dark:border-[#1c2d38] bg-[#f9fbfa] dark:bg-[#0e2230]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#edf4f0] dark:bg-[#132733] text-[#001e2b] dark:text-[#38bdf8] flex items-center justify-center border border-[#d8e2dc] dark:border-[#21313c]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Create Database</h3>
              <p className="text-xs text-[#5c768d] dark:text-[#8899a6]">Create a new database with its initial collection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white rounded hover:bg-[#edf2ef] dark:hover:bg-[#132733] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 text-xs">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-[#fdf2f2] dark:bg-red-950/30 border border-[#f8b4b4] dark:border-red-900/50 text-[#c73e3e] dark:text-red-400 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Database Name */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-[#1c2d38] dark:text-[#e8edeb]">
                Database Name <span className="text-[#c73e3e]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. analytics_db"
                  value={dbName}
                  onChange={(e) => {
                    setDbName(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full px-3 py-2 border border-[#d8e2dc] dark:border-[#21313c] dark:bg-[#132733] rounded-md text-xs text-[#1c2d38] dark:text-[#e8edeb] placeholder-[#8899a6] focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#38bdf8]"
                />
              </div>
              <p className="text-[11px] text-[#5c768d] dark:text-[#8899a6]">
                Cannot be empty and cannot contain spaces or reserved characters.
              </p>
            </div>

            {/* Collection Name */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-[#1c2d38] dark:text-[#e8edeb]">
                Collection Name <span className="text-[#c73e3e]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. events"
                  value={collectionName}
                  onChange={(e) => {
                    setCollectionName(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full px-3 py-2 border border-[#d8e2dc] dark:border-[#21313c] dark:bg-[#132733] rounded-md text-xs text-[#1c2d38] dark:text-[#e8edeb] placeholder-[#8899a6] focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#38bdf8]"
                />
              </div>
              <p className="text-[11px] text-[#5c768d] dark:text-[#8899a6]">
                Databases in MongoDB require at least one collection to be created.
              </p>
            </div>

            {/* Optional Preferences */}
            <div className="pt-2 border-t border-[#edf2ef] dark:border-[#1c2d38] space-y-3">
              <span className="block font-semibold text-[#5c768d] dark:text-[#8899a6] uppercase tracking-wider text-[10px]">
                Additional Preferences
              </span>

              {/* Capped Collection */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCapped}
                  onChange={(e) => setIsCapped(e.target.checked)}
                  className="mt-0.5 rounded text-[#001e2b] dark:text-[#38bdf8] focus:ring-[#001e2b]"
                />
                <div>
                  <span className="font-semibold text-[#1c2d38] dark:text-[#e8edeb] block">Capped Collection</span>
                  <span className="text-[11px] text-[#5c768d] dark:text-[#8899a6] block">
                    Fixed-size collection that automatically overwrites older documents when full.
                  </span>
                </div>
              </label>

              {isCapped && (
                <div className="pl-6 pt-1">
                  <label className="block text-[11px] font-medium text-[#1c2d38] dark:text-[#e8edeb] mb-1">
                    Maximum Size (Bytes)
                  </label>
                  <input
                    type="number"
                    value={cappedSize}
                    onChange={(e) => setCappedSize(e.target.value)}
                    className="w-48 px-2.5 py-1.5 border border-[#d8e2dc] dark:border-[#21313c] dark:bg-[#132733] rounded text-xs text-[#1c2d38] dark:text-[#e8edeb] focus:outline-none focus:ring-1 focus:ring-[#001e2b]"
                  />
                </div>
              )}

              {/* Custom Collation */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCustomCollation}
                  onChange={(e) => setUseCustomCollation(e.target.checked)}
                  className="mt-0.5 rounded text-[#001e2b] dark:text-[#38bdf8] focus:ring-[#001e2b]"
                />
                <div>
                  <span className="font-semibold text-[#1c2d38] dark:text-[#e8edeb] block">Use Custom Collation</span>
                  <span className="text-[11px] text-[#5c768d] dark:text-[#8899a6] block">
                    Specify language-specific rules for string comparison.
                  </span>
                </div>
              </label>

              {useCustomCollation && (
                <div className="pl-6 pt-1">
                  <label className="block text-[11px] font-medium text-[#1c2d38] dark:text-[#e8edeb] mb-1">
                    Locale
                  </label>
                  <select
                    value={collationLocale}
                    onChange={(e) => setCollationLocale(e.target.value)}
                    className="w-48 px-2.5 py-1.5 border border-[#d8e2dc] dark:border-[#21313c] rounded text-xs text-[#1c2d38] dark:text-[#e8edeb] focus:outline-none focus:ring-1 focus:ring-[#001e2b] bg-white dark:bg-[#132733] cursor-pointer"
                  >
                    <option value="en">English (en)</option>
                    <option value="fr">French (fr)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="de">German (de)</option>
                    <option value="ja">Japanese (ja)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-[#f9fbfa] dark:bg-[#0e2230] border-t border-[#edf2ef] dark:border-[#1c2d38]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white hover:bg-[#edf2ef] dark:hover:bg-[#132733] rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!dbName.trim() || !collectionName.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#001e2b] dark:bg-[#1a3344] hover:bg-[#112734] dark:hover:bg-[#214358] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-xs cursor-pointer border dark:border-[#2a4d66]"
            >
              Create Database
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
