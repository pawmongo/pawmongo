'use client';

import React, { useState } from 'react';
import { X, Plus, FolderPlus, Layers, Database } from 'lucide-react';

interface AddTableColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (fieldName: string, fieldType: string, defaultValue: any) => void;
  isDarkMode?: boolean;
}

export function AddTableColumnModal({
  isOpen,
  onClose,
  onAddColumn,
  isDarkMode = false,
}: AddTableColumnModalProps) {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('String');
  const [defaultValue, setDefaultValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fieldName.trim().replace(/\s+/g, '_');
    if (!cleanName) {
      setError('Field name is required');
      return;
    }

    let parsedVal: any = defaultValue;
    if (fieldType === 'Array') {
      try {
        parsedVal = defaultValue.trim() ? JSON.parse(defaultValue) : [];
        if (!Array.isArray(parsedVal)) parsedVal = [parsedVal];
      } catch {
        parsedVal = defaultValue.trim() ? defaultValue.split(',').map((s) => s.trim()) : [];
      }
    } else if (fieldType === 'Object') {
      try {
        parsedVal = defaultValue.trim() ? JSON.parse(defaultValue) : {};
      } catch {
        parsedVal = {};
      }
    } else if (fieldType === 'Int32' || fieldType === 'Double') {
      const num = Number(defaultValue);
      parsedVal = isNaN(num) ? 0 : num;
    } else if (fieldType === 'Boolean') {
      parsedVal = defaultValue === 'true';
    } else if (fieldType === 'Null') {
      parsedVal = null;
    }

    onAddColumn(cleanName, fieldType, parsedVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDarkMode
            ? 'bg-[#001e2b] border-[#1c3344] text-[#e8edeb]'
            : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDarkMode ? 'border-[#1c3344] bg-[#0b1a24]' : 'border-[#e8edeb] bg-[#f9fbfa]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#5c768d]" />
            <h3 className="text-sm font-semibold">Add New Field / Column</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8899a6] hover:text-[#1c2d38] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="text-red-500 font-medium">{error}</div>}

          <div>
            <label className="block font-semibold text-[#5c768d] mb-1">Field Name:</label>
            <input
              type="text"
              placeholder="e.g. status, tags, metadata"
              value={fieldName}
              onChange={(e) => {
                setFieldName(e.target.value);
                setError(null);
              }}
              className={`w-full px-3 py-2 font-mono rounded-md border focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#5c768d] ${
                isDarkMode
                  ? 'bg-[#0b1a24] border-[#1c3344] text-[#e8edeb]'
                  : 'bg-white border-[#d8e2dc] text-[#21313c]'
              }`}
            />
          </div>

          <div>
            <label className="block font-semibold text-[#5c768d] mb-1">Field Type:</label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              className={`w-full px-3 py-2 font-mono rounded-md border focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#5c768d] cursor-pointer ${
                isDarkMode
                  ? 'bg-[#0b1a24] border-[#1c3344] text-[#e8edeb]'
                  : 'bg-white border-[#d8e2dc] text-[#21313c]'
              }`}
            >
              <option value="String">String</option>
              <option value="Int32">Int32 (Number)</option>
              <option value="Double">Double (Decimal)</option>
              <option value="Boolean">Boolean</option>
              <option value="Array">Array [ ]</option>
              <option value="Object">Object &#123; &#125;</option>
              <option value="Date">Date</option>
              <option value="Null">Null</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#5c768d] mb-1">
              Default Value ({fieldType}):
            </label>
            {fieldType === 'Array' ? (
              <input
                type="text"
                placeholder='["item1", "item2"] or comma-separated'
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                className={`w-full px-3 py-2 font-mono rounded-md border focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#5c768d] ${
                  isDarkMode
                    ? 'bg-[#0b1a24] border-[#1c3344] text-[#e8edeb]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c]'
                }`}
              />
            ) : fieldType === 'Object' ? (
              <input
                type="text"
                placeholder='{"key": "value"}'
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                className={`w-full px-3 py-2 font-mono rounded-md border focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#5c768d] ${
                  isDarkMode
                    ? 'bg-[#0b1a24] border-[#1c3344] text-[#e8edeb]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c]'
                }`}
              />
            ) : fieldType === 'Boolean' ? (
              <select
                value={defaultValue || 'false'}
                onChange={(e) => setDefaultValue(e.target.value)}
                className={`w-full px-3 py-2 font-mono rounded-md border focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#5c768d] cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#0b1a24] border-[#1c3344] text-[#e8edeb]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c]'
                }`}
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder="Initial value..."
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                className={`w-full px-3 py-2 font-mono rounded-md border focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#5c768d] ${
                  isDarkMode
                    ? 'bg-[#0b1a24] border-[#1c3344] text-[#e8edeb]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c]'
                }`}
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-md border font-semibold cursor-pointer ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                  : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#001e2b] text-white font-semibold hover:bg-[#112734] cursor-pointer shadow-xs"
            >
              Add Field
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
