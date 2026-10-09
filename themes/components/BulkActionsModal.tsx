'use client';

import React, { useState } from 'react';
import { X, Layers, AlertTriangle, Edit3, Trash2, CheckCircle2, Code } from 'lucide-react';

export interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchingCount: number;
  initialMode?: 'update' | 'delete';
  collectionName?: string;
  currentQuery?: string;
  isDarkMode?: boolean;
  onBulkUpdateField: (fieldName: string, value: any) => void;
  onBulkUpdateQuery?: (updateDoc: Record<string, any>) => void;
  onBulkDelete: () => void;
}

export function BulkActionsModal({
  isOpen,
  onClose,
  matchingCount,
  initialMode = 'update',
  collectionName = 'documents',
  currentQuery,
  isDarkMode = false,
  onBulkUpdateField,
  onBulkUpdateQuery,
  onBulkDelete,
}: BulkActionsModalProps) {
  const [tab, setTab] = useState<'update' | 'delete'>(initialMode);
  const [updateMethod, setUpdateMethod] = useState<'field' | 'json'>('field');

  // Field-based update state
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'string' | 'number' | 'boolean' | 'json'>('string');
  const [fieldVal, setFieldVal] = useState('');

  // JSON-based update state
  const [jsonUpdateText, setJsonUpdateText] = useState('{\n  "$set": {\n    "status": "active"\n  }\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Delete confirmation
  const [confirmDeleteChecked, setConfirmDeleteChecked] = useState(false);

  if (!isOpen) return null;

  const handleExecuteUpdate = async () => {
    try {
    if (updateMethod === 'field') {
      if (!fieldName.trim()) return;

      let parsedVal: any = fieldVal;
      if (fieldType === 'number') {
        parsedVal = Number(fieldVal);
        if (isNaN(parsedVal)) parsedVal = 0;
      } else if (fieldType === 'boolean') {
        parsedVal = fieldVal === 'true';
      } else if (fieldType === 'json') {
        try {
          parsedVal = JSON.parse(fieldVal);
        } catch {
          parsedVal = fieldVal;
        }
      }

      await onBulkUpdateField(fieldName.trim(), parsedVal);
      onClose();
    } else {
      // JSON Update
      try {
        const parsed = JSON.parse(jsonUpdateText);
        if (onBulkUpdateQuery) {
          await onBulkUpdateQuery(parsed);
        } else if (parsed.$set && typeof parsed.$set === 'object') {
          Object.entries(parsed.$set).forEach(([key, val]) => {
            onBulkUpdateField(key, val);
          });
        } else {
          Object.entries(parsed).forEach(([key, val]) => {
            onBulkUpdateField(key, val);
          });
        }
        onClose();
      } catch (err: any) {
        setJsonError(err.message || 'Invalid JSON syntax');
      }
    }
    } catch (error) { setJsonError((error as Error).message); }
  };

  const handleExecuteDelete = async () => {
    try { await onBulkDelete(); onClose(); } catch (error) { setJsonError((error as Error).message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div
        className={`w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isDarkMode
            ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
            : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDarkMode ? 'border-[#1c2d38] bg-[#08151e]' : 'border-[#e8edeb] bg-[#f9fbfa]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                tab === 'update'
                  ? isDarkMode
                    ? 'bg-[#132733] text-[#e8edeb] border border-[#21313c]'
                    : 'bg-[#edf2ef] text-[#1c2d38] border border-[#d8e2dc]'
                  : isDarkMode
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}
            >
              {tab === 'update' ? <Edit3 className="w-4 h-4 text-[#5c768d]" /> : <Trash2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {tab === 'update' ? 'Bulk update document' : 'Bulk delete document'}
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'} mt-0.5`}>
                Collection: <span className="font-semibold">{collectionName}</span> ·{' '}
                <span className="font-semibold text-[#1c2d38] dark:text-white">
                  {matchingCount}
                </span>{' '}
                document{matchingCount === 1 ? '' : 's'} targeted
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isDarkMode
                ? 'text-[#8899a6] hover:text-white hover:bg-[#132733]'
                : 'text-[#8899a6] hover:text-[#1c2d38] hover:bg-[#edf2ef]'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          className={`flex border-b px-6 text-xs font-semibold ${
            isDarkMode ? 'border-[#1c2d38] bg-[#0b1a24]' : 'border-[#e8edeb] bg-[#fbfdfc]'
          }`}
        >
          <button
            type="button"
            onClick={() => setTab('update')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              tab === 'update'
                ? isDarkMode
                  ? 'border-white text-white'
                  : 'border-[#001e2b] text-[#001e2b]'
                : isDarkMode
                ? 'border-transparent text-[#8899a6] hover:text-[#e8edeb]'
                : 'border-transparent text-[#5c768d] hover:text-[#1c2d38]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#5c768d]" />
            <span>Bulk update document</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('delete')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              tab === 'delete'
                ? isDarkMode
                  ? 'border-red-400 text-red-400'
                  : 'border-[#c73e3e] text-[#c73e3e]'
                : isDarkMode
                ? 'border-transparent text-[#8899a6] hover:text-[#e8edeb]'
                : 'border-transparent text-[#5c768d] hover:text-[#1c2d38]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bulk delete document</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {tab === 'update' ? (
            <div className="space-y-4">
              {/* Filter Notice */}
              {currentQuery && (
                <div
                  className={`text-xs p-2.5 rounded-md border flex items-center gap-2 font-mono ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                      : 'bg-[#f4f7f5] border-[#d8e2dc] text-[#5c768d]'
                  }`}
                >
                  <span className="text-[11px] font-sans font-semibold uppercase text-[#1c2d38] dark:text-[#e8edeb]">
                    Filter:
                  </span>
                  <span className="truncate">{currentQuery}</span>
                </div>
              )}

              {/* Update Mode Choice */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUpdateMethod('field')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border transition-all cursor-pointer shadow-xs ${
                    updateMethod === 'field'
                      ? isDarkMode
                        ? 'bg-[#1c3344] border-[#21313c] text-white'
                        : 'bg-white border-[#001e2b] text-[#001e2b] ring-1 ring-[#001e2b]'
                      : isDarkMode
                      ? 'border-[#21313c] text-[#8899a6] hover:bg-[#132733]'
                      : 'border-[#d8e2dc] text-[#5c768d] hover:bg-[#f4f7f5]'
                  }`}
                >
                  Update Field
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateMethod('json')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
                    updateMethod === 'json'
                      ? isDarkMode
                        ? 'bg-[#1c3344] border-[#21313c] text-white'
                        : 'bg-white border-[#001e2b] text-[#001e2b] ring-1 ring-[#001e2b]'
                      : isDarkMode
                      ? 'border-[#21313c] text-[#8899a6] hover:bg-[#132733]'
                      : 'border-[#d8e2dc] text-[#5c768d] hover:bg-[#f4f7f5]'
                  }`}
                >
                  <Code className="w-3 h-3 text-[#5c768d]" />
                  <span>Update Document JSON</span>
                </button>
              </div>

              {updateMethod === 'field' ? (
                <div className="space-y-3.5">
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1 ${
                        isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                      }`}
                    >
                      Field Name:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. status, category, verified, or count"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                      className={`w-full px-3 py-2 text-xs font-mono rounded border focus:outline-none focus:ring-1 ${
                        isDarkMode
                          ? 'bg-[#0f212e] border-[#21313c] text-[#e8edeb] focus:ring-[#5c768d]'
                          : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-[#001e2b]'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label
                        className={`block text-xs font-semibold mb-1 ${
                          isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                        }`}
                      >
                        Value Type:
                      </label>
                      <select
                        value={fieldType}
                        onChange={(e) => setFieldType(e.target.value as any)}
                        className={`w-full px-2.5 py-2 text-xs rounded border focus:outline-none ${
                          isDarkMode
                            ? 'bg-[#0f212e] border-[#21313c] text-[#e8edeb]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
                        }`}
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="json">JSON Object / Array</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label
                        className={`block text-xs font-semibold mb-1 ${
                          isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                        }`}
                      >
                        New Value:
                      </label>
                      {fieldType === 'boolean' ? (
                        <select
                          value={fieldVal}
                          onChange={(e) => setFieldVal(e.target.value)}
                          className={`w-full px-3 py-2 text-xs font-mono rounded border focus:outline-none ${
                            isDarkMode
                              ? 'bg-[#0f212e] border-[#21313c] text-[#e8edeb]'
                              : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
                          }`}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          type={fieldType === 'number' ? 'number' : 'text'}
                          placeholder={
                            fieldType === 'number'
                              ? 'e.g. 100'
                              : fieldType === 'json'
                              ? '{"tier": "gold"} or ["a", "b"]'
                              : 'e.g. active'
                          }
                          value={fieldVal}
                          onChange={(e) => setFieldVal(e.target.value)}
                          className={`w-full px-3 py-2 text-xs font-mono rounded border focus:outline-none focus:ring-1 ${
                            isDarkMode
                              ? 'bg-[#0f212e] border-[#21313c] text-[#e8edeb] focus:ring-[#5c768d]'
                              : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-[#001e2b]'
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-md border text-xs font-mono ${
                      isDarkMode
                        ? 'bg-[#061118] border-[#1c2d38] text-[#8899a6]'
                        : 'bg-[#f8faf9] border-[#e8edeb] text-[#5c768d]'
                    }`}
                  >
                    <div className="text-[11px] font-sans font-semibold uppercase mb-1 text-[#1c2d38] dark:text-[#e8edeb]">
                      Equivalent Mongo Operation:
                    </div>
                    <div>
                      db.{collectionName}.updateMany(
                      <br />
                      &nbsp;&nbsp;{currentQuery || '{}'},
                      <br />
                      &nbsp;&nbsp;&#123; $set: &#123;{' '}
                      <span className="text-[#1c2d38] dark:text-white font-semibold">
                        &quot;{fieldName || 'field'}&quot;
                      </span>
                      : {fieldType === 'string' ? `"${fieldVal || 'value'}"` : fieldVal || 'value'}{' '}
                      &#125; &#125;
                      <br />)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label
                    className={`block text-xs font-semibold ${
                      isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                    }`}
                  >
                    JSON Update Document Expression:
                  </label>
                  <textarea
                    rows={6}
                    value={jsonUpdateText}
                    onChange={(e) => {
                      setJsonUpdateText(e.target.value);
                      setJsonError(null);
                    }}
                    className={`w-full px-3 py-2 text-xs font-mono rounded border focus:outline-none focus:ring-1 ${
                      isDarkMode
                        ? 'bg-[#061118] border-[#21313c] text-[#e8edeb] focus:ring-[#5c768d]'
                        : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-[#001e2b]'
                    }`}
                  />
                  {jsonError && (
                    <p className="text-xs text-red-500 font-semibold">{jsonError}</p>
                  )}
                  <p className={`text-[11px] ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                    Supports update operators like <code className="text-[#1c2d38] dark:text-white font-mono">$set</code>, <code className="text-[#1c2d38] dark:text-white font-mono">$unset</code>, or document fields directly.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border flex items-start gap-3 text-xs ${
                  isDarkMode
                    ? 'bg-red-950/30 border-red-900/60 text-red-200'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block font-bold text-sm text-red-500">
                    Destructive Action: Bulk Delete
                  </strong>
                  <p>
                    You are about to permanently delete{' '}
                    <span className="font-bold underline">
                      {matchingCount} matching document{matchingCount === 1 ? '' : 's'}
                    </span>{' '}
                    from collection <code className="font-mono font-semibold">{collectionName}</code>.
                  </p>
                  <p className="text-[11px] opacity-80">
                    This action cannot be undone. Please ensure you have backed up or verified your query filter before proceeding.
                  </p>
                </div>
              </div>

              {/* Mongo Delete Command Preview */}
              <div
                className={`p-3 rounded-md border text-xs font-mono ${
                  isDarkMode
                    ? 'bg-[#061118] border-[#1c2d38] text-[#8899a6]'
                    : 'bg-[#f8faf9] border-[#e8edeb] text-[#5c768d]'
                }`}
              >
                <div className="text-[11px] font-sans font-semibold uppercase mb-1 text-red-500">
                  Equivalent Mongo Operation:
                </div>
                <div>
                  db.{collectionName}.deleteMany({currentQuery || '{}'})
                </div>
              </div>

              {/* Safety Confirmation Checkbox */}
              <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmDeleteChecked}
                  onChange={(e) => setConfirmDeleteChecked(e.target.checked)}
                  className="rounded border-[#d8e2dc] text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <span className={isDarkMode ? 'text-[#e8edeb]' : 'text-[#1c2d38]'}>
                  I confirm that I want to permanently delete these{' '}
                  <strong className="text-red-500">{matchingCount}</strong> documents.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isDarkMode ? 'bg-[#08151e] border-[#1c2d38]' : 'bg-[#f9fbfa] border-[#e8edeb]'
          }`}
        >
          <span className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
            {matchingCount} document{matchingCount === 1 ? '' : 's'} will be affected
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-[#21313c] text-[#8899a6] hover:bg-[#132733] hover:text-white'
                  : 'border-[#d8e2dc] text-[#5c768d] hover:bg-[#edf2ef] hover:text-[#1c2d38]'
              }`}
            >
              Cancel
            </button>

            {tab === 'update' ? (
              <button
                type="button"
                onClick={handleExecuteUpdate}
                disabled={updateMethod === 'field' ? !fieldName.trim() : false}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#001e2b] dark:bg-[#132733] border border-[#001e2b] dark:border-[#21313c] hover:bg-[#112734] dark:hover:bg-[#1c3344] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Bulk update document</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={!confirmDeleteChecked}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#c73e3e] hover:bg-[#a53030] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bulk delete document</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
