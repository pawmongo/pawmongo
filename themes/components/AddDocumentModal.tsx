'use client';

import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { MongoDocument } from '@/lib/mongodb-mock-data';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (doc: MongoDocument) => void;
}

const DEFAULT_NEW_DOC_JSON = `{
  "_id": "52cdef7c4bab8bd675297d99",
  "name": "New Venture Inc",
  "permalink": "new-venture",
  "crunchbase_url": "http://www.crunchbase.com/company/new-venture",
  "homepage_url": "https://newventure.io",
  "category_code": "enterprise",
  "number_of_employees": 25,
  "founded_year": 2024,
  "founded_month": 3,
  "founded_day": 15,
  "deadpooled_year": null,
  "tag_list": "saas, ai, automation, cloud"
}`;

export function AddDocumentModal({ isOpen, onClose, onInsert }: AddDocumentModalProps) {
  const [jsonText, setJsonText] = useState(DEFAULT_NEW_DOC_JSON);
  const [error, setError] = useState<string | null>(null);
  const gutterRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      setJsonText(newVal);
      setError(null);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      await onInsert(parsed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0b1a24] rounded-lg shadow-2xl border border-[#d8ece2] dark:border-[#1c2d38] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edeb] dark:border-[#1c2d38]">
          <div>
            <h3 className="text-base font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Insert Document</h3>
            <p className="text-xs text-[#5c768d] dark:text-[#8899a6] mt-0.5">
              Insert a new document into collection <span className="font-mono text-[#001e2b] dark:text-[#38bdf8]">companies</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white rounded-md hover:bg-[#edf2ef] dark:hover:bg-[#132733] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-[#5c768d] dark:text-[#8899a6]">
              JSON Document Editor:
            </label>
            <span className="text-[11px] font-mono text-[#8899a6]">
              {jsonText.split('\n').length} lines
            </span>
          </div>

          <div className="relative flex rounded-md border border-[#d8e2dc] dark:border-[#21313c] bg-[#fbfcfa] dark:bg-[#07131d] font-mono text-xs overflow-hidden focus-within:ring-1 focus-within:ring-[#001e2b] dark:focus-within:ring-[#38bdf8]">
            {/* Line numbers gutter */}
            <div
              ref={gutterRef}
              className="select-none py-2.5 px-3 text-right font-mono text-[11px] shrink-0 border-r border-[#e4ebf0] dark:border-[#1c2d38] bg-[#f4f7f5] dark:bg-[#0b1a24] text-[#8899a6] overflow-hidden min-w-[3.5rem] leading-[22px]"
              aria-hidden="true"
            >
              {jsonText.split('\n').map((_, i) => (
                <div key={i} className="h-[22px] leading-[22px]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable JSON textarea */}
            <textarea
              ref={textareaRef}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              rows={14}
              wrap="off"
              className="flex-1 font-mono text-xs bg-transparent outline-none resize-y overflow-auto whitespace-pre text-[#1c2d38] dark:text-[#e8edeb] leading-[22px] p-[10px_12px]"
              placeholder="Enter valid JSON..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#f9fbfa] dark:bg-[#07131d] border-t border-[#e8edeb] dark:border-[#1c2d38]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white hover:bg-[#edf2ef] dark:hover:bg-[#132733] rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#001e2b] dark:bg-[#0062d2] hover:bg-[#112734] dark:hover:bg-[#0051b3] rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Insert</span>
          </button>
        </div>
      </div>
    </div>
  );
}
