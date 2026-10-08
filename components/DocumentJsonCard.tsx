'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  Files,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { MongoDocument } from '@/lib/mongodb-mock-data';

interface DocumentJsonCardProps {
  document: MongoDocument;
  documentIndex: number;
  theme: 'light' | 'dark';
  onUpdateDocument: (updated: MongoDocument) => void;
  onDeleteDocument: (id: string) => void;
  onCloneDocument: (doc: MongoDocument) => void;
  defaultExpanded?: boolean;
}

export function DocumentJsonCard({
  document,
  documentIndex,
  theme,
  onUpdateDocument,
  onDeleteDocument,
  onCloneDocument,
  defaultExpanded = true,
}: DocumentJsonCardProps) {
  const isDark = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [jsonString, setJsonString] = useState<string>(() => JSON.stringify(document, null, 2));
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const gutterRef = React.useRef<HTMLDivElement>(null);

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
      handleJsonChange(newVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const handleStartEdit = () => {
    setJsonString(JSON.stringify(document, null, 2));
    setValidationError(null);
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleJsonChange = (val: string) => {
    setJsonString(val);
    try {
      JSON.parse(val);
      setValidationError(null);
    } catch (err: any) {
      setValidationError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonString);
      setJsonString(JSON.stringify(parsed, null, 2));
      setValidationError(null);
    } catch (err: any) {
      setValidationError('Cannot format: invalid JSON syntax');
    }
  };

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setValidationError('Document must be a valid JSON object');
        return;
      }
      // Ensure _id is preserved
      if (!parsed._id) {
        parsed._id = document._id;
      }
      onUpdateDocument(parsed as MongoDocument);
      setIsEditing(false);
      setValidationError(null);
    } catch (err: any) {
      setValidationError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleCancelEdit = () => {
    setJsonString(JSON.stringify(document, null, 2));
    setValidationError(null);
    setIsEditing(false);
  };

  const handleCopyDoc = () => {
    navigator.clipboard.writeText(JSON.stringify(document, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(document._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  // Helper to format line numbers and highlight syntax
  const formattedJsonLines = React.useMemo(() => {
    const raw = JSON.stringify(document, null, 2);
    return raw.split('\n');
  }, [document]);

  return (
    <div
      className={`rounded-lg border transition-all duration-150 ${
        isDark
          ? 'bg-[#0f212e] border-[#1c2d38] text-[#e8edeb]'
          : 'bg-white border-[#e8edeb] text-[#1c2d38] shadow-xs'
      }`}
    >
      {/* Document Header Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b text-xs select-none ${
          isDark
            ? 'border-[#1c2d38] bg-[#0b1a24]/60'
            : 'border-[#edf2ef] bg-[#f9fbfa]'
        }`}
      >
        {/* Left: Index badge, ObjectId, expand button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
              isDark ? 'text-[#8899a6]' : 'text-[#5c768d]'
            }`}
            title={isExpanded ? 'Collapse JSON' : 'Expand JSON'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          <span
            className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
              isDark
                ? 'bg-[#132733] text-[#8899a6] border border-[#21313c]'
                : 'bg-[#edf2ef] text-[#5c768d] border border-[#d8e2dc]'
            }`}
          >
            #{documentIndex + 1}
          </span>

          {/* ObjectId tag with copy button */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className={isDark ? 'text-[#8899a6]' : 'text-[#5c768d]'}>_id:</span>
            <span
              className={`font-medium ${
                isDark ? 'text-[#e8edeb]' : 'text-[#1c2d38]'
              }`}
            >
              ObjectId(&quot;{document._id}&quot;)
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1 text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white transition-colors cursor-pointer"
              title="Copy ObjectId"
            >
              {copiedId ? (
                <Check className="w-3 h-3 text-[#5c768d] dark:text-[#8899a6]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          <span
            className={`text-[11px] font-sans px-1.5 py-0.5 rounded ${
              isDark ? 'text-[#8899a6] bg-[#132733]' : 'text-[#5c768d] bg-[#f0f4f2]'
            }`}
          >
            {Object.keys(document).length} fields
          </span>
        </div>

        {/* Right: Actions (Edit, Copy, Clone, Delete) */}
        <div className="flex items-center gap-1.5">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={handleStartEdit}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#21313c] bg-[#132733] hover:bg-[#1c3344] text-[#e8edeb]'
                    : 'border-[#d8e2dc] bg-white hover:bg-[#f4f7f5] text-[#21313c]'
                }`}
                title="Edit document JSON"
              >
                <Pencil className="w-3 h-3 text-[#5c768d] dark:text-[#8899a6]" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={handleCopyDoc}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#21313c] bg-[#132733] hover:bg-[#1c3344] text-[#e8edeb]'
                    : 'border-[#d8e2dc] bg-white hover:bg-[#f4f7f5] text-[#21313c]'
                }`}
                title="Copy document JSON"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-[#5c768d] dark:text-[#8899a6]" />
                ) : (
                  <Copy className="w-3 h-3 text-[#5c768d] dark:text-[#8899a6]" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => onCloneDocument(document)}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#21313c] bg-[#132733] hover:bg-[#1c3344] text-[#8899a6] hover:text-white'
                    : 'border-[#d8e2dc] bg-white hover:bg-[#f4f7f5] text-[#5c768d] hover:text-[#1c2d38]'
                }`}
                title="Clone Document"
              >
                <Files className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onDeleteDocument(document._id)}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#21313c] text-red-400 hover:bg-red-500/20 hover:text-red-300'
                    : 'border-[#d8e2dc] text-red-600 hover:bg-red-50'
                }`}
                title="Delete Document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFormatJson}
                className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#21313c] bg-[#132733] hover:bg-[#1c3344] text-[#e8edeb]'
                    : 'border-[#d8e2dc] bg-white hover:bg-[#f4f7f5] text-[#21313c]'
                }`}
                title="Format / Prettify JSON"
              >
                <Sparkles className="w-3 h-3 text-[#5c768d] dark:text-[#8899a6]" />
                <span>Prettify</span>
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#21313c] text-[#8899a6] hover:bg-[#132733] hover:text-white'
                    : 'border-[#d8e2dc] text-[#5c768d] hover:bg-[#f4f7f5] hover:text-[#1c2d38]'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveJson}
                disabled={validationError !== null}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold text-white transition-colors cursor-pointer ${
                  validationError !== null
                    ? 'bg-gray-400 opacity-60 cursor-not-allowed'
                    : isDark
                    ? 'bg-[#0062d2] hover:bg-[#0051b3] shadow-xs'
                    : 'bg-[#001e2b] hover:bg-[#112734] shadow-xs'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Document Body (Expanded) */}
      {isExpanded && (
        <div className="p-0">
          {isEditing ? (
            /* JSON EDIT MODE */
            <div className="p-3 space-y-2">
              {validationError ? (
                <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-mono">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Valid JSON format</span>
                </div>
              )}

              {/* JSON Editor with persistent Line Numbers */}
              <div
                className={`relative flex rounded-md border font-mono text-xs overflow-hidden ${
                  isDark
                    ? 'bg-[#0b1a24] border-[#1c2d38] focus-within:ring-1 focus-within:ring-[#57d995] focus-within:border-[#57d995]'
                    : 'bg-[#fcfdfd] border-[#d8e2dc] focus-within:ring-1 focus-within:ring-[#00684a] focus-within:border-[#00684a]'
                }`}
              >
                {/* Line number gutter - preserved during editing */}
                <div
                  ref={gutterRef}
                  className={`select-none py-2.5 px-3 text-right font-mono text-[11px] shrink-0 border-r overflow-hidden min-w-[3.5rem] leading-[22px] ${
                    isDark
                      ? 'bg-[#08151e] border-[#1c2d38] text-[#445b6b]'
                      : 'bg-[#f4f7f5] border-[#e4ebf0] text-[#a4b3bc]'
                  }`}
                  aria-hidden="true"
                >
                  {jsonString.split('\n').map((_, i) => (
                    <div key={i} className="h-[22px] leading-[22px]">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Editable textarea with synchronized scrolling */}
                <textarea
                  ref={textareaRef}
                  value={jsonString}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  onScroll={handleScroll}
                  onKeyDown={handleKeyDown}
                  rows={Math.min(26, Math.max(8, jsonString.split('\n').length))}
                  wrap="off"
                  className={`flex-1 font-mono text-xs bg-transparent outline-none resize-y overflow-auto whitespace-pre leading-[22px] p-[10px_12px] ${
                    isDark ? 'text-white' : 'text-[#1c2d38]'
                  }`}
                  placeholder="Enter valid JSON..."
                  spellCheck={false}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#8899a6] pt-1">
                <span>{jsonString.split('\n').length} lines · {jsonString.length} chars</span>
                <span>Click &quot;Prettify&quot; to auto-indent</span>
              </div>
            </div>
          ) : (
            /* JSON READ / HIGHLIGHTED CODE VIEW WITH LINE NUMBERS */
            <div
              className={`p-3 font-mono text-xs overflow-x-auto leading-relaxed ${
                isDark ? 'bg-[#0b1a24]' : 'bg-[#fcfdfd]'
              }`}
            >
              <table className="w-full border-collapse">
                <tbody>
                  {formattedJsonLines.map((line, lineIdx) => {
                    const lineNum = lineIdx + 1;
                    return (
                      <tr
                        key={lineIdx}
                        className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors`}
                      >
                        {/* Line number gutter */}
                        <td
                          className={`select-none text-right pr-4 py-0.5 text-[11px] align-top shrink-0 w-8 ${
                            isDark ? 'text-[#445b6b]' : 'text-[#a4b3bc]'
                          }`}
                        >
                          {lineNum}
                        </td>

                        {/* Highlighted line content */}
                        <td className="py-0.5 pl-2 align-top whitespace-pre">
                          {renderSyntaxHighlightedLine(line, isDark)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Syntax highlighter for a single line of formatted JSON
 */
function renderSyntaxHighlightedLine(line: string, isDark: boolean): React.ReactNode {
  // Regex pattern matching:
  // 1: Indentation
  // 2: Key: "key":
  // 3: Value: string, number, boolean, null, objectId
  const keyRegex = /^(\s*)("([^"]+)")(\s*:\s*)(.*)$/;
  const match = line.match(keyRegex);

  if (match) {
    const indent = match[1];
    const keyWithQuotes = match[2];
    const colon = match[4];
    const rest = match[5];

    return (
      <span>
        <span>{indent}</span>
        <span
          className={`font-semibold ${
            isDark ? 'text-[#93c5fd]' : 'text-[#005a9e]'
          }`}
        >
          {keyWithQuotes}
        </span>
        <span className={isDark ? 'text-[#8899a6]' : 'text-[#5c768d]'}>{colon}</span>
        {renderJsonValue(rest, isDark)}
      </span>
    );
  }

  // Bracket only line or other value
  return renderJsonValue(line, isDark);
}

function renderJsonValue(valString: string, isDark: boolean): React.ReactNode {
  // Check if string contains quotes
  if (valString.includes('"')) {
    // Has string value
    const parts = valString.split(/("[^"]*")/g);
    return (
      <>
        {parts.map((p, idx) => {
          if (p.startsWith('"') && p.endsWith('"')) {
            return (
              <span
                key={idx}
                className={isDark ? 'text-white' : 'text-[#5c768d]'}
              >
                {p}
              </span>
            );
          }
          // Highlight punctuation, brackets, commas
          return (
            <span key={idx} className={isDark ? 'text-white' : 'text-[#1c2d38]'}>
              {p}
            </span>
          );
        })}
      </>
    );
  }

  // Check for number
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?(,?)$/.test(valString.trim())) {
    return (
      <span className={isDark ? 'text-[#38bdf8] font-medium' : 'text-[#c2410c] font-medium'}>
        {valString}
      </span>
    );
  }

  // Check for boolean
  if (/^(true|false)(,?)$/.test(valString.trim())) {
    return (
      <span className={isDark ? 'text-[#c084fc] font-semibold' : 'text-[#be185d] font-semibold'}>
        {valString}
      </span>
    );
  }

  // Check for null
  if (/^null(,?)$/.test(valString.trim())) {
    return (
      <span className={`italic ${isDark ? 'text-gray-400' : 'text-[#8899a6]'}`}>
        {valString}
      </span>
    );
  }

  // Default braces / punctuation
  return (
    <span className={isDark ? 'text-white' : 'text-[#334155]'}>
      {valString}
    </span>
  );
}
