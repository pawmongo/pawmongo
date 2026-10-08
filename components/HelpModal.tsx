'use client';

import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Code2,
  Table,
  FileCode,
  Layers,
  Keyboard,
  Check,
  Copy,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export function HelpModal({
  isOpen,
  onClose,
  isDarkMode = false,
}: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'queries' | 'views' | 'aggregation' | 'shortcuts'>('queries');
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuery(text);
    setTimeout(() => setCopiedQuery(null), 2000);
  };

  const sampleQueries = [
    {
      title: 'Find all documents',
      code: '{}',
      desc: 'Retrieves all documents in the collection without filtering.',
    },
    {
      title: 'Exact equality match',
      code: '{"category_code": "web"}',
      desc: 'Matches documents where category_code equals "web".',
    },
    {
      title: 'Greater than / Less than',
      code: '{"founded_year": {"$gte": 2008, "$lte": 2020}}',
      desc: 'Finds companies founded between 2008 and 2020 inclusive.',
    },
    {
      title: 'Array element match',
      code: '{"tag_list": "software"}',
      desc: 'Matches documents where tag_list array contains "software".',
    },
    {
      title: 'Logical OR condition',
      code: '{"$or": [{"category_code": "web"}, {"number_of_employees": {"$gt": 100}}]}',
      desc: 'Matches documents satisfying either of the conditions.',
    },
    {
      title: 'Case-insensitive Regex',
      code: '{"name": {"$regex": "^Google", "$options": "i"}}',
      desc: 'Matches company names starting with "Google" (case-insensitive).',
    },
    {
      title: 'Nested document field',
      code: '{"acquisition.price_amount": {"$gt": 10000000}}',
      desc: 'Queries nested object property within acquisition sub-document.',
    },
    {
      title: 'Field existence check',
      code: '{"deadpooled_year": {"$exists": true, "$ne": null}}',
      desc: 'Matches documents having the deadpooled_year field present and not null.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-3xl rounded-xl border shadow-2xl flex flex-col max-h-[88vh] overflow-hidden ${
          isDarkMode
            ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
            : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#001e2b] dark:bg-[#132733] text-white flex items-center justify-center shadow-xs">
              <HelpCircle className="w-5 h-5 text-[#5c768d]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">phpMongo Help & Reference</h2>
              <p className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                MongoDB query syntax, view modes, and navigation shortcuts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isDarkMode
                ? 'hover:bg-[#132733] text-[#8899a6] hover:text-white'
                : 'hover:bg-[#e4ebf0] text-[#5c768d] hover:text-[#1c2d38]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex items-center gap-2 px-6 pt-3 border-b shrink-0 ${
            isDarkMode ? 'border-[#1c2d38] bg-[#0b1a24]' : 'border-[#edf2ef] bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('queries')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'queries'
                ? 'border-[#3b82f6] text-[#001e2b] dark:text-white font-semibold'
                : 'border-transparent text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-[#e8edeb]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Query Filters</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('views')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'views'
                ? 'border-[#3b82f6] text-[#001e2b] dark:text-white font-semibold'
                : 'border-transparent text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-[#e8edeb]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>View Modes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aggregation')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'aggregation'
                ? 'border-[#3b82f6] text-[#001e2b] dark:text-white font-semibold'
                : 'border-transparent text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-[#e8edeb]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Aggregation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'border-[#3b82f6] text-[#001e2b] dark:text-white font-semibold'
                : 'border-transparent text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-[#e8edeb]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'queries' && (
            <div className="space-y-3">
              <p className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                Click on any snippet to copy it directly into your clipboard, then paste into the Filter bar:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sampleQueries.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                      isDarkMode
                        ? 'bg-[#132733]/50 border-[#21313c] hover:border-[#5c768d]'
                        : 'bg-[#f7faf8] border-[#e4ebf0] hover:border-[#001e2b]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold">{item.title}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.code)}
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white transition-colors cursor-pointer"
                          title="Copy Query"
                        >
                          {copiedQuery === item.code ? (
                            <Check className="w-3.5 h-3.5 text-[#3b82f6]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className={`text-[11px] mb-2 leading-relaxed ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                        {item.desc}
                      </p>
                    </div>
                    <code
                      onClick={() => handleCopy(item.code)}
                      className={`text-[11px] font-mono p-1.5 rounded block truncate cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#07131d] text-[#e8edeb] border border-[#1c2d38]'
                          : 'bg-white text-[#1c2d38] border border-[#d8e2dc]'
                      }`}
                      title="Click to copy"
                    >
                      {item.code}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'views' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileCode className="w-4 h-4 text-[#5c768d]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">List View (☰)</h3>
                </div>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  Hierarchical visual document tree. Allows expanding and collapsing nested objects and arrays. Displays type badges (ObjectId, String, Int32, Array, Object) with inline field editing.
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Code2 className="w-4 h-4 text-[#5c768d]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">JSON View ({'{}'})</h3>
                </div>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  Formatted JSON documents featuring gutter line numbers and syntax color coding. Includes in-place raw JSON editing with syntax validation and instant document updates.
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Table className="w-4 h-4 text-[#5c768d]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Table View (⊞)</h3>
                </div>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  Tabular spreadsheet format. Hover over any cell to reveal the quick edit button. Supports adding custom columns and clicking column headers to sort asc/desc.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'aggregation' && (
            <div className="space-y-3">
              <p className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                phpMongo supports multi-stage aggregation pipelines:
              </p>
              <div className="space-y-2 text-xs font-mono">
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#07131d] border-[#1c2d38]' : 'bg-white border-[#d8e2dc]'}`}>
                  <span className="font-bold text-[#001e2b] dark:text-[#8899a6]">$match</span>: Filters documents to pass only those matching criteria.
                </div>
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#07131d] border-[#1c2d38]' : 'bg-white border-[#d8e2dc]'}`}>
                  <span className="font-bold text-[#001e2b] dark:text-[#8899a6]">$group</span>: Groups documents by specified identifier expression.
                </div>
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#07131d] border-[#1c2d38]' : 'bg-white border-[#d8e2dc]'}`}>
                  <span className="font-bold text-[#001e2b] dark:text-[#8899a6]">$sort</span>: Reorders documents by designated field and direction.
                </div>
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#07131d] border-[#1c2d38]' : 'bg-white border-[#d8e2dc]'}`}>
                  <span className="font-bold text-[#001e2b] dark:text-[#8899a6]">$project</span>: Reshapes documents, adding or removing computed fields.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2.5 rounded border flex items-center justify-between ${isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'}`}>
                  <span>Execute Query</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[11px]">Enter</kbd>
                </div>
                <div className={`p-2.5 rounded border flex items-center justify-between ${isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'}`}>
                  <span>Close Open Modal</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[11px]">Esc</kbd>
                </div>
                <div className={`p-2.5 rounded border flex items-center justify-between ${isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'}`}>
                  <span>Toggle Theme</span>
                  <span className="text-[#8899a6] text-[11px]">Top Panel Theme Icon</span>
                </div>
                <div className={`p-2.5 rounded border flex items-center justify-between ${isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'}`}>
                  <span>Create Database</span>
                  <span className="text-[#8899a6] text-[11px]">Sidebar &quot;+&quot; Icon</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3 border-t shrink-0 ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-[#8899a6]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>phpMongo Database Explorer v1.43.0</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#001e2b] hover:bg-[#005239] text-white shadow-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
