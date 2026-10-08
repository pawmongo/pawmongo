'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  PlusSquare,
  Calendar,
  ChevronLeft,
  Copy,
  Check,
  Pencil,
  Files,
  Play,
  Plus,
  Code
} from 'lucide-react';
import { getFieldType, MongoDocument } from '@/lib/mongodb-mock-data';
import { useDatabase } from '@/context/DatabaseContext';

interface DocumentRowCodeViewProps {
  document: MongoDocument;
  documentIndex: number;
  onUpdateDocument: (updated: MongoDocument) => void;
  onDeleteDocument: (id: string) => void;
  onCloneDocument: (doc: MongoDocument) => void;
  onFilterByField?: (key: string, value: any) => void;
}

interface FlattenedField {
  lineNum: number;
  keyPath: string[];
  key: string;
  value: any;
  type: string;
  level: number;
  isExpandable: boolean;
  isExpanded?: boolean;
  parentIsArray: boolean;
}

const DATA_TYPES = [
  'String',
  'Int32',
  'Double',
  'Boolean',
  'Date',
  'ObjectId',
  'Array',
  'Object',
  'Null'
];

function getNestedValue(obj: any, path: string[]): any {
  let curr = obj;
  for (const seg of path) {
    if (curr == null) return undefined;
    curr = curr[seg];
  }
  return curr;
}

function setNestedValue(obj: any, path: string[], value: any): any {
  if (path.length === 0) return value;
  const [head, ...tail] = path;
  const isArr = Array.isArray(obj);
  const copy = isArr ? [...obj] : { ...obj };

  if (tail.length === 0) {
    if (isArr) {
      copy[Number(head)] = value;
    } else {
      copy[head] = value;
    }
  } else {
    const nextTarget = copy[head] !== undefined ? copy[head] : isNaN(Number(tail[0])) ? {} : [];
    copy[head] = setNestedValue(nextTarget, tail, value);
  }
  return copy;
}

function renameNestedKey(obj: any, path: string[], newKey: string): any {
  if (path.length === 0 || !newKey.trim()) return obj;
  const parentPath = path.slice(0, -1);
  const oldKey = path[path.length - 1];

  if (parentPath.length === 0) {
    const newObj: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === oldKey) {
        newObj[newKey] = v;
      } else {
        newObj[k] = v;
      }
    }
    return newObj;
  }

  const parent = getNestedValue(obj, parentPath);
  if (typeof parent !== 'object' || parent === null || Array.isArray(parent)) return obj;

  const newParent: any = {};
  for (const [k, v] of Object.entries(parent)) {
    if (k === oldKey) {
      newParent[newKey] = v;
    } else {
      newParent[k] = v;
    }
  }

  return setNestedValue(obj, parentPath, newParent);
}

function deleteNestedValue(obj: any, path: string[]): any {
  if (path.length === 0) return obj;
  const [head, ...tail] = path;
  const isArr = Array.isArray(obj);
  const copy = isArr ? [...obj] : { ...obj };

  if (tail.length === 0) {
    if (isArr) {
      copy.splice(Number(head), 1);
    } else {
      delete copy[head];
    }
  } else {
    copy[head] = deleteNestedValue(copy[head], tail);
  }
  return copy;
}

function addItemInside(obj: any, path: string[]): any {
  const target = path.length === 0 ? obj : getNestedValue(obj, path);
  if (Array.isArray(target)) {
    const newArr = [...target, ''];
    return path.length === 0 ? newArr : setNestedValue(obj, path, newArr);
  } else if (typeof target === 'object' && target !== null) {
    const existingKeys = Object.keys(target);
    let counter = existingKeys.length + 1;
    let newKey = `field_${counter}`;
    while (newKey in target) {
      counter++;
      newKey = `field_${counter}`;
    }
    const newObj = { ...target, [newKey]: '' };
    return path.length === 0 ? newObj : setNestedValue(obj, path, newObj);
  }
  return obj;
}

function insertItemAfter(obj: any, path: string[]): any {
  if (path.length === 0) return obj;
  const parentPath = path.slice(0, -1);
  const targetKey = path[path.length - 1];

  const parent = parentPath.length === 0 ? obj : getNestedValue(obj, parentPath);

  if (Array.isArray(parent)) {
    const idx = Number(targetKey);
    const newArr = [...parent];
    newArr.splice(idx + 1, 0, '');
    return parentPath.length === 0 ? newArr : setNestedValue(obj, parentPath, newArr);
  } else if (typeof parent === 'object' && parent !== null) {
    const entries = Object.entries(parent);
    const targetIdx = entries.findIndex(([k]) => k === targetKey);
    const newEntries: [string, any][] = [];
    let counter = entries.length + 1;
    let newKey = `field_${counter}`;
    while (newKey in parent) {
      counter++;
      newKey = `field_${counter}`;
    }

    entries.forEach(([k, v], i) => {
      newEntries.push([k, v]);
      if (i === targetIdx || (targetIdx === -1 && i === entries.length - 1)) {
        newEntries.push([newKey, '']);
      }
    });

    const newObj = Object.fromEntries(newEntries);
    return parentPath.length === 0 ? newObj : setNestedValue(obj, parentPath, newObj);
  }

  return obj;
}

export function DocumentRowCodeView({
  document,
  onUpdateDocument,
  onDeleteDocument,
  onCloneDocument,
  onFilterByField,
}: DocumentRowCodeViewProps) {
  const { theme } = useDatabase();
  const isDarkMode = theme === 'dark';

  // Document-level states
  const [isCardCollapsed, setIsCardCollapsed] = useState<boolean>(false);
  const [isCardEditing, setIsCardEditing] = useState<boolean>(false);
  const [draftDoc, setDraftDoc] = useState<MongoDocument>(document);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Field-level states
  const [collapsedPaths, setCollapsedPaths] = useState<Record<string, boolean>>({});
  const [editingFieldPathStr, setEditingFieldPathStr] = useState<string | null>(null);
  const [isExpandedMore, setIsExpandedMore] = useState<boolean>(false);
  const [hoveredLineNum, setHoveredLineNum] = useState<number | null>(null);
  const [copiedDoc, setCopiedDoc] = useState<boolean>(false);

  // Raw JSON edit modal for specific object/array
  const [rawJsonModal, setRawJsonModal] = useState<{
    isOpen: boolean;
    path: string[];
    jsonText: string;
    error: string | null;
  }>({
    isOpen: false,
    path: [],
    jsonText: '',
    error: null,
  });

  const activeDoc = isCardEditing ? draftDoc : document;

  const handleCopyDoc = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(activeDoc, null, 2));
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 1600);
  };

  const toggleExpand = (pathStr: string) => {
    setCollapsedPaths((prev) => ({
      ...prev,
      [pathStr]: !prev[pathStr],
    }));
  };

  const handleStartEditing = (targetPathStr?: string) => {
    setIsCardEditing(true);
    setDraftDoc(document);
    setHasChanges(false);
    if (targetPathStr) {
      setEditingFieldPathStr(targetPathStr);
    }
  };

  const handleCancelEditing = () => {
    setDraftDoc(document);
    setIsCardEditing(false);
    setEditingFieldPathStr(null);
    setHasChanges(false);
  };

  const handleUpdateDocument = () => {
    onUpdateDocument(draftDoc);
    setIsCardEditing(false);
    setEditingFieldPathStr(null);
    setHasChanges(false);
  };

  // Value change for leaf fields (nested or root)
  const handleNestedValueChange = (keyPath: string[], newValueStr: string, currentType: string) => {
    let parsedVal: any = newValueStr;

    if (currentType === 'Int32') {
      const parsed = parseInt(newValueStr, 10);
      parsedVal = isNaN(parsed) ? 0 : parsed;
    } else if (currentType === 'Double') {
      const parsed = parseFloat(newValueStr);
      parsedVal = isNaN(parsed) ? 0.0 : parsed;
    } else if (currentType === 'Boolean') {
      parsedVal = newValueStr === 'true';
    } else if (currentType === 'Null') {
      parsedVal = null;
    }

    const updated = setNestedValue(draftDoc, keyPath, parsedVal);
    setDraftDoc(updated);
    setHasChanges(true);
  };

  // Key rename for object fields
  const handleNestedKeyRename = (keyPath: string[], newKey: string) => {
    if (!newKey.trim()) return;
    const updated = renameNestedKey(draftDoc, keyPath, newKey.trim());
    setDraftDoc(updated);
    setHasChanges(true);
    // Update active editing path
    const parentPath = keyPath.slice(0, -1);
    setEditingFieldPathStr([...parentPath, newKey.trim()].join('.'));
  };

  // Type change
  const handleNestedTypeChange = (keyPath: string[], newType: string, currentVal: any) => {
    let converted: any = currentVal;

    if (newType === 'String') converted = String(currentVal ?? '');
    else if (newType === 'Int32') converted = parseInt(currentVal, 10) || 0;
    else if (newType === 'Double') converted = parseFloat(currentVal) || 0.0;
    else if (newType === 'Boolean') converted = Boolean(currentVal);
    else if (newType === 'Null') converted = null;
    else if (newType === 'Array') converted = Array.isArray(currentVal) ? currentVal : [];
    else if (newType === 'Object') converted = typeof currentVal === 'object' && currentVal !== null ? currentVal : {};

    const updated = setNestedValue(draftDoc, keyPath, converted);
    setDraftDoc(updated);
    setHasChanges(true);
  };

  // Delete field/item
  const handleDeleteNestedField = (keyPath: string[]) => {
    if (keyPath.length === 1 && keyPath[0] === '_id') return; // Cannot delete _id
    const updated = deleteNestedValue(draftDoc, keyPath);
    setDraftDoc(updated);
    setHasChanges(true);
    setEditingFieldPathStr(null);
  };

  // Add field/item after current item
  const handleInsertItemAfter = (keyPath: string[]) => {
    const updated = insertItemAfter(draftDoc, keyPath);
    setDraftDoc(updated);
    setHasChanges(true);
  };

  // Add item inside an array or object
  const handleAddItemInside = (keyPath: string[]) => {
    const updated = addItemInside(draftDoc, keyPath);
    setDraftDoc(updated);
    setHasChanges(true);
    // Automatically ensure parent is expanded so user sees the newly added child
    setCollapsedPaths((prev) => ({
      ...prev,
      [keyPath.join('.')]: false,
    }));
  };

  // Open Raw JSON modal for an array or object
  const handleOpenRawJsonModal = (keyPath: string[], val: any) => {
    setRawJsonModal({
      isOpen: true,
      path: keyPath,
      jsonText: JSON.stringify(val, null, 2),
      error: null,
    });
  };

  const handleApplyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonModal.jsonText);
      const updated = setNestedValue(draftDoc, rawJsonModal.path, parsed);
      setDraftDoc(updated);
      setHasChanges(true);
      setRawJsonModal({ isOpen: false, path: [], jsonText: '', error: null });
    } catch {
      setRawJsonModal((prev) => ({
        ...prev,
        error: 'Invalid JSON format. Please correct syntax before applying.',
      }));
    }
  };

  // Flatten document fields with line numbers
  const lines: FlattenedField[] = [];
  let lineNumber = 1;

  function traverse(obj: any, currentPath: string[] = [], level = 0, parentIsArray = false) {
    if (typeof obj !== 'object' || obj === null) return;

    const entries = Object.entries(obj);
    if (level === 0) {
      entries.sort(([a], [b]) => {
        if (a === '_id') return -1;
        if (b === '_id') return 1;
        return 0;
      });
    }

    for (const [key, value] of entries) {
      const nextPath = [...currentPath, key];
      const pathStr = nextPath.join('.');
      const type = getFieldType(value);
      const isExpandable = type === 'Object' || type === 'Array';
      const isCollapsed = Boolean(collapsedPaths[pathStr]);

      lines.push({
        lineNum: lineNumber++,
        keyPath: nextPath,
        key,
        value,
        type,
        level,
        isExpandable,
        isExpanded: !isCollapsed,
        parentIsArray,
      });

      if (isExpandable && !isCollapsed) {
        traverse(value, nextPath, level + 1, type === 'Array');
      }
    }
  }

  traverse(activeDoc);

  // Field overflow cutoff (matching "▾ Show 13 more fields" from image 1)
  const MAX_INITIAL_FIELDS = 15;
  const hasOverflow = lines.length > MAX_INITIAL_FIELDS;
  const displayedLines = isExpandedMore || !hasOverflow ? lines : lines.slice(0, MAX_INITIAL_FIELDS);
  const hiddenCount = lines.length - MAX_INITIAL_FIELDS;

  return (
    <div
      className={`relative border rounded-lg mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all overflow-hidden group/card font-mono text-[13px] leading-[26px] ${
        isDarkMode
          ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb] hover:border-[#284152]'
          : 'bg-white border-[#dce3de] text-[#1c2d38] hover:border-[#b4c8be]'
      }`}
    >
      {/* 1. TOP-RIGHT ACTIONS ROW ON CARD HOVER (4 rounded buttons in screenshot) */}
      <div
        className={`absolute top-2.5 right-3.5 z-20 flex items-center gap-1.5 transition-opacity ${
          isCardEditing ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'
        }`}
      >
        {/* Button 1: Edit Document [ ✏ ] */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isCardEditing) {
              handleCancelEditing();
            } else {
              handleStartEditing(lines[1]?.keyPath.join('.'));
            }
          }}
          className={`p-1.5 rounded-md border transition-colors shadow-xs cursor-pointer ${
            isCardEditing
              ? 'bg-[#0062d2] text-white border-[#0062d2]'
              : isDarkMode
              ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
              : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f2f7f4] hover:border-[#b8cfc5]'
          }`}
          title={isCardEditing ? 'Cancel Edit' : 'Edit Document'}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {/* Button 2: Copy Document [ 📋 ] */}
        <button
          type="button"
          onClick={handleCopyDoc}
          className={`p-1.5 rounded-md border transition-colors shadow-xs cursor-pointer ${
            isDarkMode
              ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
              : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f2f7f4] hover:border-[#b8cfc5]'
          }`}
          title="Copy Document JSON"
        >
          {copiedDoc ? (
            <Check className="w-3.5 h-3.5 text-[#38bdf8]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Button 3: Clone Document [ 📑 ] */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCloneDocument(activeDoc);
          }}
          className={`p-1.5 rounded-md border transition-colors shadow-xs cursor-pointer ${
            isDarkMode
              ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
              : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f2f7f4] hover:border-[#b8cfc5]'
          }`}
          title="Clone Document"
        >
          <Files className="w-3.5 h-3.5" />
        </button>

        {/* Button 4: Delete Document [ 🗑 ] */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteDocument(activeDoc._id);
          }}
          className={`p-1.5 rounded-md border transition-colors shadow-xs cursor-pointer ${
            isDarkMode
              ? 'border-[#21313c] bg-[#132733] text-red-400 hover:bg-red-500/20 hover:text-red-300'
              : 'border-[#d8e2dc] bg-white text-[#21313c] hover:bg-[#fdeeed] hover:border-[#f5c6c6] hover:text-[#c73e3e]'
          }`}
          title="Delete Document"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. CARD CONTENT */}
      <div className="pt-2.5 pb-1">
        {displayedLines.map((item, idx) => {
          const pathStr = item.keyPath.join('.');
          const isEditingThisLine = isCardEditing && editingFieldPathStr === pathStr;
          const isHovered = hoveredLineNum === item.lineNum;
          const isFirstLine = idx === 0;

          // If collapsed, only render the first line (_id)
          if (isCardCollapsed && !isFirstLine) return null;

          return (
            <div
              key={pathStr + '-' + item.lineNum}
              onMouseEnter={() => setHoveredLineNum(item.lineNum)}
              onMouseLeave={() => setHoveredLineNum(null)}
              className={`flex items-center justify-between px-3 py-0.5 transition-colors ${
                isEditingThisLine
                  ? isDarkMode ? 'bg-[#132733] text-white' : 'bg-[#edf4f0] text-[#1c2d38]'
                  : isHovered
                  ? isDarkMode ? 'bg-[#132733]/70 text-white' : 'bg-[#edf4f0]'
                  : isDarkMode ? 'hover:bg-[#132733]/70 text-white' : 'hover:bg-[#edf4f0]'
              }`}
            >
              {/* Left Column: Play toggle / gutter + Line number (only when editing) + Key + Value */}
              <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                {/* A. Document-level Collapse Button [ ▶ ] on the first line (_id) */}
                {isFirstLine ? (
                  <button
                    type="button"
                    onClick={() => setIsCardCollapsed(!isCardCollapsed)}
                    className={`p-1 mr-2 rounded border shadow-xs shrink-0 flex items-center justify-center w-5 h-5 cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'border-[#21313c] bg-[#132733] text-white hover:bg-[#1c3344]'
                        : 'border-[#d8e2dc] bg-white text-[#21313c] hover:bg-[#f2f7f4]'
                    }`}
                    title={isCardCollapsed ? 'Expand Document' : 'Collapse Document'}
                  >
                    <Play
                      className={`w-2.5 h-2.5 transition-transform ${
                        isDarkMode ? 'fill-white text-white' : 'fill-[#21313c] text-[#21313c]'
                      } ${isCardCollapsed ? '' : 'rotate-90'}`}
                    />
                  </button>
                ) : (
                  <span className="w-7 shrink-0" />
                )}

                {/* B. Action Gutter (🗑 and [+] shown when card is in edit mode) */}
                {isCardEditing && (
                  <div className="w-10 flex items-center gap-1 shrink-0">
                    {item.key !== '_id' && (isHovered || isEditingThisLine) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNestedField(item.keyPath);
                        }}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'text-[#8899a6] hover:text-red-400 hover:bg-red-950/40'
                            : 'text-[#5c768d] hover:text-[#c73e3e] hover:bg-black/5'
                        }`}
                        title="Remove field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}

                    {(isHovered || isEditingThisLine) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsertItemAfter(item.keyPath);
                        }}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'text-[#8899a6] hover:text-white hover:bg-white/10'
                            : 'text-[#5c768d] hover:text-[#5c768d] hover:bg-black/5'
                        }`}
                        title="Add field after"
                      >
                        <PlusSquare className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                  </div>
                )}

                {/* C. Line Number: NUMBER ONLY SHOWS WHEN EDITING ANY FIELD */}
                {isCardEditing ? (
                  <span className="w-7 text-right pr-3 text-[#8899a6] select-none text-[12px] shrink-0 font-normal">
                    {item.lineNum}
                  </span>
                ) : null}

                {/* D. Indentation for nested items (inside arrays and objects) */}
                {item.level > 0 ? (
                  <div
                    className={`shrink-0 ${
                      item.level === 1
                        ? 'w-4'
                        : item.level === 2
                        ? 'w-8'
                        : item.level === 3
                        ? 'w-12'
                        : item.level === 4
                        ? 'w-16'
                        : item.level === 5
                        ? 'w-20'
                        : 'w-24'
                    }`}
                  />
                ) : null}

                {/* E. Expand / Collapse Icon for nested Objects/Arrays */}
                {item.isExpandable ? (
                  <button
                    type="button"
                    onClick={() => toggleExpand(pathStr)}
                    className="p-0.5 mr-1 text-[#5c768d] hover:text-[#5c768d] shrink-0 cursor-pointer"
                    title={item.isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {item.isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                {/* F. Key and Value Renderer */}
                {isCardEditing && isEditingThisLine ? (
                  /* INLINE EDIT MODE FOR ACTIVE LINE */
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
                    {/* Key Editor: If not an array index, allow renaming the key */}
                    {!item.parentIsArray && item.key !== '_id' ? (
                      <input
                        type="text"
                        defaultValue={item.key}
                        onBlur={(e) => {
                          if (e.target.value !== item.key) {
                            handleNestedKeyRename(item.keyPath, e.target.value);
                          }
                        }}
                        className="px-1.5 py-0.5 text-xs bg-white border border-[#00684a] rounded text-[#21313c] font-semibold w-28 focus:outline-none focus:ring-1 focus:ring-[#00684a]"
                        title="Edit key name"
                      />
                    ) : (
                      <span className={`font-medium shrink-0 select-text ${isDarkMode ? 'text-white' : 'text-[#21313c]'}`}>
                        {item.key}:
                      </span>
                    )}

                    {/* Value Editor based on type */}
                    {item.isExpandable ? (
                      /* If editing an array or object row, show action buttons rather than a raw text input */
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] ${isDarkMode ? 'text-gray-300' : 'text-[#5c768d]'}`}>
                          {item.type === 'Array'
                            ? `Array (${Array.isArray(item.value) ? item.value.length : 0})`
                            : `Object (${typeof item.value === 'object' && item.value !== null ? Object.keys(item.value).length : 0})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddItemInside(item.keyPath)}
                          className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 cursor-pointer transition-colors ${
                            isDarkMode
                              ? 'bg-[#132733] hover:bg-[#1c3344] text-[#38bdf8] border border-[#21313c]'
                              : 'bg-[#e8f4ed] hover:bg-[#d5ebd9] text-[#5c768d]'
                          }`}
                          title={item.type === 'Array' ? 'Add item into array' : 'Add field into object'}
                        >
                          <Plus className="w-3 h-3" />
                          <span>{item.type === 'Array' ? 'Add Item' : 'Add Field'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRawJsonModal(item.keyPath, item.value)}
                          className={`px-2 py-0.5 text-xs font-mono rounded flex items-center gap-1 cursor-pointer transition-colors border ${
                            isDarkMode
                              ? 'bg-[#132733] border-[#21313c] hover:bg-[#1c3344] text-[#e8edeb]'
                              : 'bg-white border-[#d8e2dc] hover:bg-[#f4f7f5] text-[#21313c]'
                          }`}
                          title="Edit full object/array as JSON"
                        >
                          <Code className="w-3 h-3" />
                          <span>Edit JSON</span>
                        </button>
                      </div>
                    ) : item.type === 'String' ? (
                      <div className="flex items-center flex-1 min-w-0">
                        <span className={`font-semibold select-none ${isDarkMode ? 'text-white' : 'text-[#5c768d]'}`}>&quot;</span>
                        <input
                          type="text"
                          value={typeof item.value === 'string' ? item.value : String(item.value ?? '')}
                          onChange={(e) => handleNestedValueChange(item.keyPath, e.target.value, 'String')}
                          autoFocus
                          className={`px-1.5 py-0.5 text-xs border rounded flex-1 min-w-[200px] focus:outline-none ${
                            isDarkMode
                              ? 'bg-[#132733] border-[#38bdf8] text-white focus:ring-1 focus:ring-[#38bdf8]'
                              : 'bg-white border-[#00684a] text-[#5c768d] focus:ring-1 focus:ring-[#00684a]'
                          }`}
                        />
                        <span className={`font-semibold select-none ${isDarkMode ? 'text-white' : 'text-[#5c768d]'}`}>&quot;</span>
                      </div>
                    ) : item.type === 'Boolean' ? (
                      <select
                        value={String(item.value)}
                        onChange={(e) => handleNestedValueChange(item.keyPath, e.target.value, 'Boolean')}
                        autoFocus
                        className={`px-2 py-0.5 text-xs border rounded font-mono focus:outline-none cursor-pointer ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#38bdf8] text-purple-300'
                            : 'bg-white border-[#00684a] text-[#7c3aed]'
                        }`}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={item.value == null ? '' : String(item.value)}
                        onChange={(e) => handleNestedValueChange(item.keyPath, e.target.value, item.type)}
                        autoFocus
                        placeholder={item.type === 'Null' ? 'null' : ''}
                        className={`px-1.5 py-0.5 text-xs border rounded flex-1 min-w-[200px] focus:outline-none ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#38bdf8] text-white focus:ring-1 focus:ring-[#38bdf8]'
                            : 'bg-white border-[#00684a] text-[#21313c] focus:ring-1 focus:ring-[#00684a]'
                        }`}
                      />
                    )}
                  </div>
                ) : (
                  /* NORMAL DISPLAY OR NON-ACTIVE LINE (CLICKABLE TO EDIT) */
                  <div
                    onClick={() => {
                      if (!isCardEditing) {
                        handleStartEditing(pathStr);
                      } else {
                        if (item.isExpandable) {
                          toggleExpand(pathStr);
                        }
                        setEditingFieldPathStr(pathStr);
                      }
                    }}
                    className="flex items-center min-w-0 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer flex-1"
                    title={isCardEditing ? 'Click to select this field' : 'Click to edit this document'}
                  >
                    {/* Key Name with colon */}
                    <span className={`font-medium select-text shrink-0 cursor-pointer ${isDarkMode ? 'text-white' : 'text-[#21313c]'}`}>
                      {item.key}:
                    </span>
                    <span className="mr-2"></span>

                    {/* Value Component (NO OPEN LINK, purely styled data) */}
                    {renderCompassValue(item, isCardEditing, isDarkMode, () => handleAddItemInside(item.keyPath))}
                  </div>
                )}
              </div>

              {/* Right Column: Data Type Tag / Selector + Hover Edit Button */}
              <div className="shrink-0 pl-4 text-right flex items-center gap-1.5">
                {!isCardEditing && isHovered && item.key !== '_id' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditing(pathStr);
                    }}
                    className={`p-1 rounded border shadow-xs cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'bg-[#132733] hover:bg-[#1c3344] border-[#21313c] text-[#8899a6] hover:text-white'
                        : 'bg-white hover:bg-[#edf2ef] border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
                    }`}
                    title={`Edit field ${item.key}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {isCardEditing && isEditingThisLine && item.key !== '_id' ? (
                  <select
                    value={item.type}
                    onChange={(e) => handleNestedTypeChange(item.keyPath, e.target.value, item.value)}
                    className={`px-1.5 py-0.5 text-[11px] rounded font-mono focus:outline-none cursor-pointer border ${
                      isDarkMode
                        ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                        : 'bg-white border-[#b8dfce] text-[#5c768d] focus:ring-1 focus:ring-[#00684a]'
                    }`}
                  >
                    {DATA_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[#8899a6] text-[12px] font-mono select-none">
                    {item.type}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* ▾ Show X more fields Toggle */}
        {!isCardCollapsed && hasOverflow && (
          <div className="px-10 pt-2 pb-1">
            <button
              type="button"
              onClick={() => setIsExpandedMore(!isExpandedMore)}
              className={`text-xs font-sans font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                isDarkMode
                  ? 'text-[#38bdf8] hover:text-[#7dd3fc]'
                  : 'text-[#0062d2] hover:text-[#004bb0]'
              }`}
            >
              {isExpandedMore ? (
                <span>▴ Show fewer fields</span>
              ) : (
                <span>▾ Show {hiddenCount} more fields</span>
              )}
            </button>
          </div>
        )}

        {/* 3. CARD-LEVEL BOTTOM BAR WITH [ CANCEL ] AND [ UPDATE ] (Exact match to screenshot!) */}
        {isCardEditing && (
          <div className={`mt-3 py-2 px-4 border-t flex items-center justify-end gap-2.5 font-sans ${
            isDarkMode ? 'bg-[#0f212e] border-[#1c2d38]' : 'bg-[#edf2ef] border-[#dce3de]'
          }`}>
            <button
              type="button"
              onClick={handleCancelEditing}
              className={`px-3.5 py-1 text-xs font-bold tracking-wider rounded border shadow-xs uppercase transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-[#21313c] bg-[#132733] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
                  : 'border-[#d8e2dc] bg-white text-[#21313c] hover:bg-[#f9fbfa]'
              }`}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleUpdateDocument}
              className={`px-3.5 py-1 text-xs font-bold tracking-wider rounded shadow-xs uppercase transition-colors cursor-pointer ${
                hasChanges
                  ? isDarkMode
                    ? 'bg-[#0062d2] text-white hover:bg-[#0051b3]'
                    : 'bg-[#001e2b] text-white hover:bg-[#112734]'
                  : isDarkMode
                  ? 'bg-[#132733] text-[#8899a6] border border-[#21313c]'
                  : 'bg-[#e0e7e2] text-[#8899a6] hover:bg-[#d8e0da]'
              }`}
            >
              UPDATE
            </button>
          </div>
        )}
      </div>

      {/* Raw JSON Editor Modal for Array/Object */}
      {rawJsonModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-lg shadow-xl border w-full max-w-lg p-5 font-sans ${
            isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]' : 'bg-white border-[#dce3de] text-[#1c2d38]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDarkMode ? 'border-[#1c2d38]' : 'border-[#e8edeb]'
            }`}>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                Edit {rawJsonModal.path[rawJsonModal.path.length - 1] || 'Field'} as JSON
              </h3>
              <button
                type="button"
                onClick={() => setRawJsonModal({ isOpen: false, path: [], jsonText: '', error: null })}
                className="text-[#8899a6] hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="mt-3">
              <div className={`relative flex rounded-md border font-mono text-xs overflow-hidden ${
                isDarkMode
                  ? 'border-[#21313c] bg-[#07131d] focus-within:ring-1 focus-within:ring-[#38bdf8]'
                  : 'border-[#d8e2dc] bg-[#fdfefd] focus-within:ring-1 focus-within:ring-[#001e2b]'
              }`}>
                <div
                  className={`select-none py-2.5 px-3 text-right font-mono text-[11px] shrink-0 border-r overflow-hidden min-w-[3rem] leading-[22px] ${
                    isDarkMode ? 'border-[#21313c] bg-[#0b1a24] text-[#8899a6]' : 'border-[#e4ebf0] bg-[#f4f7f5] text-[#8899a6]'
                  }`}
                  aria-hidden="true"
                >
                  {rawJsonModal.jsonText.split('\n').map((_, i) => (
                    <div key={i} className="h-[22px] leading-[22px]">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <textarea
                  value={rawJsonModal.jsonText}
                  onChange={(e) => setRawJsonModal((prev) => ({ ...prev, jsonText: e.target.value, error: null }))}
                  rows={10}
                  wrap="off"
                  className={`flex-1 font-mono text-xs bg-transparent outline-none resize-y overflow-auto whitespace-pre leading-[22px] p-[10px_12px] ${
                    isDarkMode ? 'text-[#e8edeb]' : 'text-[#1c2d38]'
                  }`}
                  placeholder="Enter valid JSON..."
                  spellCheck={false}
                />
              </div>
              {rawJsonModal.error && (
                <p className="text-xs text-[#c73e3e] dark:text-red-400 mt-1.5">{rawJsonModal.error}</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRawJsonModal({ isOpen: false, path: [], jsonText: '', error: null })}
                className={`px-3 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'border-[#21313c] bg-[#132733] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
                    : 'border-[#d8e2dc] bg-white text-[#21313c] hover:bg-[#f9fbfa]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRawJson}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0062d2] hover:bg-[#0051b3] rounded shadow-xs cursor-pointer transition-colors"
              >
                Apply JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderCompassValue(
  item: FlattenedField,
  isCardEditing: boolean,
  isDarkMode: boolean = false,
  onAddItemInside?: () => void
) {
  const { key, value, type, isExpanded } = item;

  // ObjectId
  if (key === '_id' || type === 'ObjectId') {
    return (
      <span className={`${isDarkMode ? 'text-[#f87171] font-medium' : 'text-[#d83737]'} select-text`}>
        ObjectId(&apos;{value}&apos;)
      </span>
    );
  }

  // Date
  if (type === 'Date' || key === 'created_at') {
    return (
      <span className={`${isDarkMode ? 'text-[#38bdf8]' : 'text-[#0062d2]'} select-text inline-flex items-center gap-1.5`}>
        <span>ISODate(&apos;{value}&apos;)</span>
        <Calendar className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'} inline`} />
        <span className={`${isDarkMode ? 'text-gray-300' : 'text-[#5c768d]'} text-[12px] underline decoration-dotted decoration-[#a0b0a8]`}>
          May 25, 2007 at 6:51:27 AM UTC
        </span>
      </span>
    );
  }

  // String (WITHOUT OPEN LINK - pure string with white text in dark mode as requested by user)
  if (type === 'String') {
    const isOverview = key === 'overview';

    return (
      <span className={`${isDarkMode ? 'text-white font-normal' : 'text-[#5c768d]'} select-text inline-flex items-center gap-1`}>
        <span>&quot;{value}&quot;</span>

        {/* If overview or large text, show pagination/slider handle from Image 1 */}
        {isOverview && (
          <span className={`inline-flex items-center gap-1 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#8899a6]'} ml-2 text-[11px] font-sans`}>
            <ChevronLeft className="w-3 h-3 text-[#8899a6]" />
            <span className="w-6 h-2 bg-[#8899a6]/60 rounded-full inline-block" />
            <ChevronRight className="w-3 h-3 text-[#8899a6]" />
            <span className="text-[10px] ml-1">⤡</span>
          </span>
        )}
      </span>
    );
  }

  // Int32 / Double
  if (type === 'Int32' || type === 'Double') {
    return <span className={`${isDarkMode ? 'text-[#38bdf8] font-medium' : 'text-[#0062d2]'} select-text`}>{value}</span>;
  }

  // Boolean
  if (type === 'Boolean') {
    return <span className={`${isDarkMode ? 'text-[#c084fc] font-medium' : 'text-[#7c3aed]'} select-text`}>{String(value)}</span>;
  }

  // Null
  if (type === 'Null') {
    return <span className={`${isDarkMode ? 'text-gray-400' : 'text-[#8899a6]'} italic select-text`}>null</span>;
  }

  // Array
  if (type === 'Array') {
    const len = Array.isArray(value) ? value.length : 0;
    return (
      <span className={`${isDarkMode ? 'text-gray-200' : 'text-[#5c768d]'} select-none text-[12px] inline-flex items-center gap-2`}>
        <span>Array ({len})</span>
        {isCardEditing && onAddItemInside && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddItemInside();
            }}
            className={`text-[11px] font-sans px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer transition-colors ${
              isDarkMode
                ? 'bg-[#132733] hover:bg-[#1c3344] text-[#38bdf8] border border-[#21313c]'
                : 'bg-[#edf4f0] hover:bg-[#d8ece2] text-[#5c768d]'
            }`}
            title="Add item into array"
          >
            <Plus className="w-3 h-3" />
            <span>Add Item</span>
          </button>
        )}
      </span>
    );
  }

  // Object
  if (type === 'Object') {
    const keysCount = Object.keys(value || {}).length;
    return (
      <span className={`${isDarkMode ? 'text-gray-200' : 'text-[#5c768d]'} select-none text-[12px] inline-flex items-center gap-2`}>
        <span>Object ({keysCount})</span>
        {isCardEditing && onAddItemInside && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddItemInside();
            }}
            className={`text-[11px] font-sans px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer transition-colors ${
              isDarkMode
                ? 'bg-[#132733] hover:bg-[#1c3344] text-[#38bdf8] border border-[#21313c]'
                : 'bg-[#edf4f0] hover:bg-[#d8ece2] text-[#5c768d]'
            }`}
            title="Add field into object"
          >
            <Plus className="w-3 h-3" />
            <span>Add Field</span>
          </button>
        )}
      </span>
    );
  }

  return <span className={`${isDarkMode ? 'text-white' : 'text-[#21313c]'} select-text`}>{String(value)}</span>;
}
