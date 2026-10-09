'use client';

import React, { useState } from 'react';
import { X, FileUp, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { parseDatabaseImport } from '@/lib/import-database';

interface ImportDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (documents: Record<string, unknown>[], onProgress: (imported: number) => void) => Promise<void>;
  collectionName: string;
  isDarkMode?: boolean;
}

export function ImportDocumentsModal({
  isOpen,
  onClose,
  onImport,
  collectionName,
  isDarkMode = false,
}: ImportDocumentsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [records, setRecords] = useState({ imported: 0, total: 0 });
  const [fileFormat, setFileFormat] = useState<'json' | 'csv'>('json');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (isImporting || !file) return;
    setIsImporting(true);
    setError(null);
    setRecords({ imported: 0, total: 0 });
    try {
      const inputText = await file.text();
      if (!inputText.trim()) {
        setError('The selected file is empty. Please choose a file containing records.');
        return;
      }

      let parsedDocs: Record<string, unknown>[] = [];

      if (fileFormat === 'json') {
        parsedDocs = parseDatabaseImport(inputText, file.name).flatMap(([, docs]) => docs);
      } else {
        // Simple CSV parser
        const lines = inputText.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setError('CSV must have at least a header row and one data row.');
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const docObj: any = {};
          headers.forEach((h, idx) => {
            docObj[h] = values[idx] || '';
          });
          parsedDocs.push(docObj);
        }
      }

      setRecords({ imported: 0, total: parsedDocs.length });
      await onImport(parsedDocs, (imported) => setRecords({ imported, total: parsedDocs.length }));
      setFile(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to import this file. Check its contents and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode
            ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
            : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileUp className="w-4 h-4 text-[#5c768d]" />
            <h3 className="font-bold text-sm">Import Documents ({collectionName})</h3>
          </div>
          <button
            type="button"
            disabled={isImporting}
            onClick={onClose}
            className="p-1 rounded text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-[#8899a6]">
            Choose a collection export file to import into <strong>{collectionName}</strong>.
          </p>

          {error && (
            <div role="alert" className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Format selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold">FORMAT:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => { setFileFormat('json'); setFile(null); setError(null); }}
                className={`px-3 py-1 rounded text-xs border transition-colors cursor-pointer ${
                  fileFormat === 'json'
                    ? 'border-[#001e2b] dark:border-white bg-[#f0f4f2] dark:bg-[#1a3344] font-bold'
                    : 'border-[#d8e2dc] dark:border-[#21313c]'
                }`}
              >
                JSON (.json)
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => { setFileFormat('csv'); setFile(null); setError(null); }}
                className={`px-3 py-1 rounded text-xs border transition-colors cursor-pointer ${
                  fileFormat === 'csv'
                    ? 'border-[#001e2b] dark:border-white bg-[#f0f4f2] dark:bg-[#1a3344] font-bold'
                    : 'border-[#d8e2dc] dark:border-[#21313c]'
                }`}
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          <label className={`relative flex flex-col items-center justify-center gap-2 p-8 border border-dashed rounded-lg text-center transition-colors ${isImporting ? 'opacity-50' : 'cursor-pointer hover:bg-[#edf2ef] dark:hover:bg-[#132733]'} ${isDarkMode ? 'border-[#21313c]' : 'border-[#d8e2dc]'}`}>
            <Upload className="w-6 h-6 text-[#5c768d]" aria-hidden="true" />
            <span className="text-xs font-semibold break-all">{file ? file.name : 'Choose File'}</span>
            <span className="text-[11px] text-[#8899a6]">{file ? `${file.size.toLocaleString()} bytes` : fileFormat === 'json' ? 'Select a .json, .jsonl or .ndjson export' : 'Select a .csv file'}</span>
            <input aria-label="Collection export file" disabled={isImporting} type="file" accept={fileFormat === 'json' ? '.json,.jsonl,.ndjson' : '.csv'} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default" onChange={(e) => {setFile(e.target.files?.[0] || null); setError(null);}} />
          </label>
          {(isImporting || (error && records.total > 0)) && (
            <div role="status" aria-live="polite" className="space-y-2 text-xs text-[#5c768d] dark:text-[#8899a6]">
              <div className="flex items-center gap-2">{isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}<span>{isImporting ? 'Importing records…' : 'Import stopped'}</span></div>
              <p className="tabular-nums">{records.imported.toLocaleString()} records of {records.total.toLocaleString()} records</p>
              <div role="progressbar" aria-label="Document import progress" aria-valuemin={0} aria-valuemax={records.total || 1} aria-valuenow={records.imported} className="h-1.5 rounded-full overflow-hidden bg-[#edf2ef] dark:bg-[#132733]">
                <div className="h-full bg-[#5c768d] transition-all" style={{width: `${records.total ? records.imported / records.total * 100 : 0}%`}} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end px-5 py-3.5 border-t shrink-0 ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isImporting}
            onClick={onClose}
              className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                  : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || !file}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-[#001e2b] dark:bg-[#132733] text-white hover:bg-[#112734] dark:hover:bg-[#1a3444] border border-[#001e2b] dark:border-[#21313c] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              {isImporting ? 'Importing…' : 'Import documents'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
