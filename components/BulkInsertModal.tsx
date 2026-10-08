'use client';

import React, { useState } from 'react';
import { X, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MongoDocument } from '@/lib/mongodb-mock-data';

interface BulkInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkInsert: (documents: MongoDocument[]) => void;
  isDarkMode?: boolean;
}

const SAMPLE_BULK_JSON = `[
  {
    "name": "Stripe Payments",
    "category_code": "fintech",
    "number_of_employees": 7000,
    "founded_year": 2010,
    "overview": "Financial infrastructure for the internet."
  },
  {
    "name": "Datadog",
    "category_code": "enterprise",
    "number_of_employees": 4500,
    "founded_year": 2010,
    "overview": "Monitoring and security platform for cloud applications."
  }
]`;

export function BulkInsertModal({
  isOpen,
  onClose,
  onBulkInsert,
  isDarkMode = false,
}: BulkInsertModalProps) {
  const [jsonText, setJsonText] = useState(SAMPLE_BULK_JSON);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInsert = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setError('Input must be a valid JSON array of documents: [ { ... }, { ... } ]');
        return;
      }
      if (parsed.length === 0) {
        setError('JSON array is empty. Please provide at least one document.');
        return;
      }

      // Generate ObjectId for any docs without _id
      const docsToInsert: MongoDocument[] = parsed.map((doc: any, index: number) => {
        if (typeof doc !== 'object' || doc === null) {
          throw new Error(`Item at index ${index} is not a valid JSON object`);
        }
        const randomHex = Array.from({ length: 24 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        return {
          _id: doc._id || randomHex,
          ...doc,
        };
      });

      onBulkInsert(docsToInsert);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid JSON syntax. Please verify commas and quotes.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
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
            <Layers className="w-4 h-4 text-[#5c768d]" />
            <h3 className="font-bold text-sm">Bulk Insert Documents</h3>
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
            Paste a JSON array containing multiple documents. Each document will receive an auto-generated <code className="font-mono">_id</code> if not specified.
          </p>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">
              JSON DOCUMENTS ARRAY [ ... ]
            </label>
            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
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
          <button
            type="button"
            onClick={() => setJsonText(SAMPLE_BULK_JSON)}
            className="text-xs text-[#5c768d] hover:underline cursor-pointer"
          >
            Load Sample Array
          </button>

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
              onClick={handleInsert}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-[#001e2b] dark:bg-[#132733] text-white hover:bg-[#112734] dark:hover:bg-[#1a3444] border border-[#001e2b] dark:border-[#21313c] transition-colors cursor-pointer shadow-xs"
            >
              Bulk Insert Documents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
