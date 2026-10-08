'use client';

import React, { useState } from 'react';
import { X, FileUp, Upload, AlertCircle } from 'lucide-react';
import { MongoDocument } from '@/lib/mongodb-mock-data';

interface ImportDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (documents: MongoDocument[]) => void;
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
  const [inputText, setInputText] = useState('');
  const [fileFormat, setFileFormat] = useState<'json' | 'csv'>('json');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    try {
      if (!inputText.trim()) {
        setError('Please provide data to import by choosing a file or pasting text.');
        return;
      }

      let parsedDocs: MongoDocument[] = [];

      if (fileFormat === 'json') {
        const parsed = JSON.parse(inputText);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        parsedDocs = arr.map((doc: any) => {
          const randomHex = Array.from({ length: 24 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('');
          return {
            _id: doc._id || randomHex,
            ...doc,
          };
        });
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
          const randomHex = Array.from({ length: 24 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('');
          docObj._id = docObj._id || randomHex;
          parsedDocs.push(docObj);
        }
      }

      onImport(parsedDocs);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to parse import content.');
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
            onClick={onClose}
            className="p-1 rounded text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-[#8899a6]">
            Select a file (.json or .csv) or paste records directly to import into <strong>{collectionName}</strong>.
          </p>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs flex items-center gap-2">
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
                onClick={() => setFileFormat('json')}
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
                onClick={() => setFileFormat('csv')}
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

          <div>
            <textarea
              rows={8}
              placeholder={
                fileFormat === 'json'
                  ? `[\n  { "name": "Example Corp", "founded_year": 2024 }\n]`
                  : `name,founded_year,category_code\nExample Corp,2024,software`
              }
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full p-3 font-mono text-xs border rounded-lg focus:outline-none ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#5c768d]'
                  : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
              }`}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-t shrink-0 ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <label
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
              isDarkMode
                ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-[#5c768d]" />
            <span>Select File</span>
            <input
              type="file"
              accept={fileFormat === 'json' ? '.json' : '.csv'}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    setInputText(String(evt.target?.result || ''));
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
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
              disabled={!inputText.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-[#001e2b] dark:bg-[#132733] text-white hover:bg-[#112734] dark:hover:bg-[#1a3444] border border-[#001e2b] dark:border-[#21313c] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              Import documents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
