'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  ChevronsDown,
  ChevronsUp,
  FileCode,
  Layers,
  Search
} from 'lucide-react';
import { MongoDocument } from '@/lib/mongodb-mock-data';
import { DocumentJsonCard } from './DocumentJsonCard';

interface DocumentJsonViewProps {
  documents: MongoDocument[];
  startIndex: number;
  totalFilteredCount: number;
  theme: 'light' | 'dark';
  onUpdateDocument: (updated: MongoDocument) => void;
  onDeleteDocument: (id: string) => void;
  onCloneDocument: (doc: MongoDocument) => void;
  onResetFilter: () => void;
}

export function DocumentJsonView({
  documents,
  startIndex,
  totalFilteredCount,
  theme,
  onUpdateDocument,
  onDeleteDocument,
  onCloneDocument,
  onResetFilter,
}: DocumentJsonViewProps) {
  const isDark = theme === 'dark';
  const [jsonDisplayMode, setJsonDisplayMode] = useState<'cards' | 'array'>('cards');
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  const [expandToggleKey, setExpandToggleKey] = useState<number>(0);
  const [filterText, setFilterText] = useState<string>('');

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(documents, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(documents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `documents_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleToggleExpandAll = () => {
    setAllExpanded(!allExpanded);
    setExpandToggleKey((k) => k + 1);
  };

  const filteredDocs = React.useMemo(() => {
    if (!filterText.trim()) return documents;
    const q = filterText.toLowerCase().trim();
    return documents.filter((doc) =>
      JSON.stringify(doc).toLowerCase().includes(q)
    );
  }, [documents, filterText]);

  return (
    <div className="space-y-3">
      {/* JSON View Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-xs ${
          isDark
            ? 'bg-[#0b1a24] border-[#1c2d38] text-[#8899a6]'
            : 'bg-[#f4f7f5] border-[#e8edeb] text-[#5c768d]'
        }`}
      >
        {/* Left: View title, document counts & mode switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${
                isDark ? 'text-[#e8edeb]' : 'text-[#1c2d38]'
              }`}
            >
              JSON View
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-medium text-[11px] border ${
                isDark
                  ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                  : 'bg-white text-[#1c2d38] border-[#d8e2dc]'
              }`}
            >
              {filteredDocs.length} {filteredDocs.length === 1 ? 'doc' : 'docs'}
            </span>
          </div>

          {/* Mode Switcher: Cards vs Full Array */}
          <div
            className={`flex items-center rounded p-0.5 border ${
              isDark
                ? 'bg-[#0f212e] border-[#1c2d38]'
                : 'bg-white border-[#d8e2dc]'
            }`}
          >
            <button
              type="button"
              onClick={() => setJsonDisplayMode('cards')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                jsonDisplayMode === 'cards'
                  ? isDark
                    ? 'bg-[#1c2d38] text-white shadow-xs'
                    : 'bg-[#001e2b] text-white shadow-xs'
                  : isDark
                  ? 'text-[#8899a6] hover:text-white'
                  : 'text-[#5c768d] hover:text-[#1c2d38]'
              }`}
              title="Individual document cards with line numbers and editing"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Document Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setJsonDisplayMode('array')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                jsonDisplayMode === 'array'
                  ? isDark
                    ? 'bg-[#1c2d38] text-white shadow-xs'
                    : 'bg-[#001e2b] text-white shadow-xs'
                  : isDark
                  ? 'text-[#8899a6] hover:text-white'
                  : 'text-[#5c768d] hover:text-[#1c2d38]'
              }`}
              title="Raw JSON array format"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Full Array [ ]</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick filter input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8899a6]" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search JSON..."
              className={`pl-8 pr-3 py-1 text-xs rounded border focus:outline-none ${
                isDark
                  ? 'bg-[#0f212e] border-[#21313c] text-[#e8edeb] placeholder:text-[#556977]'
                  : 'bg-white border-[#d8e2dc] text-[#1c2d38] placeholder:text-[#8899a6]'
              }`}
            />
          </div>

          {jsonDisplayMode === 'cards' && (
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#21313c] bg-[#132733] hover:bg-[#1c2d38] text-[#e8edeb]'
                  : 'border-[#d8e2dc] bg-white hover:bg-[#f4f7f5] text-[#21313c]'
              }`}
              title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
            >
              {allExpanded ? (
                <>
                  <ChevronsUp className="w-3.5 h-3.5 text-[#5c768d] dark:text-[#8899a6]" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3.5 h-3.5 text-[#5c768d] dark:text-[#8899a6]" />
                  <span>Expand All</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyAll}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'border-[#21313c] bg-[#132733] hover:bg-[#1c2d38] text-[#e8edeb]'
                : 'border-[#d8e2dc] bg-white hover:bg-[#f4f7f5] text-[#21313c]'
            }`}
            title="Copy all documents in JSON format"
          >
            {copiedAll ? (
              <Check className="w-3.5 h-3.5 text-[#5c768d] dark:text-[#8899a6]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#5c768d] dark:text-[#8899a6]" />
            )}
            <span>{copiedAll ? 'Copied All' : 'Copy All JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'border-[#21313c] bg-[#132733] hover:bg-[#1c2d38] text-[#e8edeb]'
                : 'border-[#d8e2dc] bg-white hover:bg-[#f4f7f5] text-[#21313c]'
            }`}
            title="Export and download JSON file"
          >
            <Download className="w-3.5 h-3.5 text-[#5c768d] dark:text-[#8899a6]" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredDocs.length === 0 ? (
        <div
          className={`p-10 text-center rounded-lg border ${
            isDark
              ? 'bg-[#0f212e] border-[#1c2d38]'
              : 'bg-white border-[#e8edeb]'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              isDark ? 'text-[#e8edeb]' : 'text-[#1c2d38]'
            }`}
          >
            No documents matched your JSON search
          </p>
          <p className="text-xs text-[#8899a6] mt-1">
            Try clearing the search filter
          </p>
          <button
            type="button"
            onClick={() => setFilterText('')}
            className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-[#001e2b] rounded-md hover:bg-[#112734] cursor-pointer shadow-xs"
          >
            Clear Filter
          </button>
        </div>
      ) : jsonDisplayMode === 'cards' ? (
        /* INDIVIDUAL DOCUMENT CARDS */
        <div className="space-y-3" key={`expand-${expandToggleKey}`}>
          {filteredDocs.map((doc, idx) => (
            <DocumentJsonCard
              key={doc._id}
              document={doc}
              documentIndex={startIndex + idx}
              theme={theme}
              onUpdateDocument={onUpdateDocument}
              onDeleteDocument={onDeleteDocument}
              onCloneDocument={onCloneDocument}
              defaultExpanded={allExpanded}
            />
          ))}
        </div>
      ) : (
        /* COMBINED ARRAY VIEW WITH LINE NUMBERS */
        <div
          className={`rounded-lg border font-mono text-xs overflow-hidden ${
            isDark
              ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
              : 'bg-white border-[#e8edeb] text-[#1c2d38]'
          }`}
        >
          <div
            className={`flex items-center justify-between px-4 py-2 border-b text-[11px] ${
              isDark
                ? 'border-[#1c2d38] bg-[#0f212e] text-[#8899a6]'
                : 'border-[#edf2ef] bg-[#f9fbfa] text-[#5c768d]'
            }`}
          >
            <span>Raw JSON Array · [ {filteredDocs.length} items ]</span>
            <span>{JSON.stringify(filteredDocs, null, 2).split('\n').length} lines</span>
          </div>

          <div className="p-3 overflow-x-auto max-h-[750px] leading-relaxed">
            <table className="w-full border-collapse">
              <tbody>
                {JSON.stringify(filteredDocs, null, 2)
                  .split('\n')
                  .map((line, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <td
                        className={`select-none text-right pr-4 py-0.5 text-[11px] align-top shrink-0 w-10 ${
                          isDark ? 'text-[#445b6b]' : 'text-[#a4b3bc]'
                        }`}
                      >
                        {idx + 1}
                      </td>
                      <td className={`py-0.5 pl-2 align-top whitespace-pre font-mono ${
                        isDark ? 'text-white' : 'text-[#1c2d38]'
                      }`}>
                        {line}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
