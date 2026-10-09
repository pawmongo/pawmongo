'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  X,
  Layers,
  ChevronDown,
  Check,
  Search
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { MongoDocument } from '@/lib/mongodb-mock-data';
import { apiClient } from '@/lib/api-client';

interface IndexKeyField {
  id: string;
  field: string;
  direction: '1' | '-1' | 'text' | '2dsphere' | 'hashed';
}

interface IndexItem {
  name: string;
  keys: Record<string, string | number>;
  fields?: string[];
  size: string;
  unique: boolean;
  sparse?: boolean;
  background?: boolean;
  ttlSeconds?: number;
  partialFilter?: string;
  usage: number | null;
}

interface IndexesTabProps {
  documents?: MongoDocument[];
  selectedDb?: string;
  selectedCollection?: string;
  isDarkMode?: boolean;
}

const COMMON_FIELDS = [
  '_id',
  'name',
  'category_code',
  'founded_year',
  'number_of_employees',
  'permalink',
  'crunchbase_url',
  'homepage_url',
  'blog_url',
  'twitter_username',
  'email_address',
  'phone_number',
  'description',
  'created_at',
  'updated_at',
  'overview',
  'total_money_raised',
  'deadpooled_year',
  'tag_list',
  'offices.city',
  'offices.country_code',
  'offices.address1',
  'relationships.title',
  'funding_rounds.raised_amount'
];

export function IndexesTab({
  documents = [],
  selectedDb,
  selectedCollection,
  isDarkMode: isDarkModeProp
}: IndexesTabProps) {
  const { theme, triggerToast } = useDatabase();
  const isDarkMode = isDarkModeProp ?? (theme === 'dark');

  const [activeSuggestFieldId, setActiveSuggestFieldId] = useState<string | null>(null);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [apiColumns, setApiColumns] = useState<Array<{ field: string; type: string }>>([]);

  // Load all columns for collection dynamically from API
  useEffect(() => {
    if (selectedDb && selectedCollection) {
      apiClient.getCollectionColumns(selectedDb, selectedCollection)
        .then((cols) => {
          if (cols && cols.length > 0) {
            setApiColumns(cols.map((c) => ({ field: c.field, type: c.type })));
          }
        })
        .catch(() => {});
    }
  }, [selectedDb, selectedCollection]);

  // Extract all real fields and detected types from documents and API
  const currentDocumentFields = useMemo(() => {
    const fieldMap = new Map<string, string>();

    // 1. Add columns from API route
    apiColumns.forEach((c) => {
      fieldMap.set(c.field, c.type);
    });

    // 2. Add columns from current documents prop
    const traverse = (obj: any, prefix = '', depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 4) return;
      if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
          traverse(obj[0], prefix, depth + 1);
        }
        return;
      }

      for (const [key, val] of Object.entries(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const detectedType = Array.isArray(val)
          ? 'Array'
          : val === null
          ? 'Null'
          : typeof val === 'object'
          ? 'Object'
          : typeof val === 'number'
          ? Number.isInteger(val)
            ? 'Int32'
            : 'Double'
          : typeof val === 'boolean'
          ? 'Boolean'
          : typeof val === 'string' && val.length === 24 && /^[0-9a-fA-F]{24}$/.test(val)
          ? 'ObjectId'
          : 'String';

        if (!fieldMap.has(fullPath)) {
          fieldMap.set(fullPath, detectedType);
        }

        if (val && typeof val === 'object' && !Array.isArray(val)) {
          traverse(val, fullPath, depth + 1);
        }
      }
    };

    if (documents && documents.length > 0) {
      documents.forEach((d) => traverse(d));
    }

    // 3. Fallback common MongoDB columns if none found
    if (fieldMap.size === 0) {
      COMMON_FIELDS.forEach((f) => {
        fieldMap.set(f, 'String');
      });
    }

    return Array.from(fieldMap.entries())
      .map(([field, type]) => ({ field, type }))
      .sort((a, b) => (a.field === '_id' ? -1 : b.field === '_id' ? 1 : a.field.localeCompare(b.field)));
  }, [documents, apiColumns]);

  const [indexes, setIndexes] = useState<IndexItem[]>([]);

  // Load indexes from API route
  useEffect(() => {
    if (!selectedDb || !selectedCollection) return;
    let isMounted = true;
    apiClient.getIndexes(selectedDb, selectedCollection)
      .then((data) => {
        if (isMounted && data && Array.isArray(data)) {
          setIndexes(data);
        }
      })
      .catch(error => { if (isMounted) { setIndexes([]); triggerToast(error.message); } });

    return () => {
      isMounted = false;
    };
  }, [selectedDb, selectedCollection]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customIndexName, setCustomIndexName] = useState('');
  const [keyFields, setKeyFields] = useState<IndexKeyField[]>([
    { id: '1', field: '', direction: '1' }
  ]);

  const availableIndexFields = useMemo(() => {
    const usedFields = new Set([
      ...indexes.flatMap(index => index.fields ?? Object.keys(index.keys)),
      ...keyFields.map(key => key.field.trim()).filter(Boolean),
    ]);
    return currentDocumentFields.filter(({ field }) => !usedFields.has(field));
  }, [currentDocumentFields, indexes, keyFields]);

  // Index options
  const [isUnique, setIsUnique] = useState(false);
  const [isBackground, setIsBackground] = useState(true);
  const [isSparse, setIsSparse] = useState(false);
  const [isTtl, setIsTtl] = useState(false);
  const [ttlSeconds, setTtlSeconds] = useState('3600');
  const [isPartial, setIsPartial] = useState(false);
  const [partialFilter, setPartialFilter] = useState('{ number_of_employees: { $gt: 0 } }');

  const handleAddField = () => {
    setKeyFields((prev) => [
      ...prev,
      { id: String(Date.now()), field: '', direction: '1' }
    ]);
  };

  const handleRemoveField = (id: string) => {
    if (keyFields.length === 1) return;
    setKeyFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateField = (id: string, updates: Partial<IndexKeyField>) => {
    setKeyFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleCreateIndex = async (e: React.FormEvent) => {
    e.preventDefault();

    const keys: Record<string, string | number> = {};
    keyFields.forEach((kf) => {
      if (kf.field.trim()) {
        const dir = kf.direction;
        keys[kf.field.trim()] = dir === '1' ? 1 : dir === '-1' ? -1 : dir;
      }
    });

    if (Object.keys(keys).length === 0) return;

    const autoName = Object.entries(keys)
      .map(([k, v]) => `${k}_${v}`)
      .join('_');
    const finalName = customIndexName.trim() || autoName || `index_${Date.now()}`;

    const newIndex: IndexItem = {
      name: finalName,
      keys,
      size: '16 KB',
      unique: isUnique,
      sparse: isSparse,
      background: isBackground,
      ttlSeconds: isTtl ? Number(ttlSeconds) : undefined,
      partialFilter: isPartial ? partialFilter : undefined,
      usage: 0
    };

    try {
      if (selectedDb && selectedCollection) {
        const created = await apiClient.createIndex(selectedDb, selectedCollection, newIndex);
        setIndexes((prev) => [...prev, created]);
      } else {
        setIndexes((prev) => [...prev, newIndex]);
      }
    } catch (error) { triggerToast((error as Error).message); return; }

    setIsModalOpen(false);

    // Reset form with clean empty field so all columns load
    setCustomIndexName('');
    setKeyFields([{ id: String(Date.now()), field: '', direction: '1' }]);
    setColumnSearchQuery('');
    setIsUnique(false);
    setIsBackground(true);
    setIsSparse(false);
    setIsTtl(false);
    setIsPartial(false);
  };

  const handleDeleteIndex = async (indexName: string) => {
    if (indexName === '_id_') return; // Cannot drop _id_ index in MongoDB
    try {
      if (selectedDb && selectedCollection) {
        await apiClient.dropIndex(selectedDb, selectedCollection, indexName);
      }
    } catch (error) { triggerToast((error as Error).message); return; }
    setIndexes((prev) => prev.filter((i) => i.name !== indexName));
  };

  return (
    <div
      className={`border rounded-lg p-6 space-y-6 shadow-xs ${
        isDarkMode
          ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
          : 'bg-white border-[#e8edeb] text-[#1c2d38]'
      }`}
    >
      {/* Tab Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b ${
          isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center border ${
              isDarkMode
                ? 'bg-[#132733] text-white border-[#21313c]'
                : 'bg-[#f0f4f2] text-[#1c2d38] border-[#d8e2dc]'
            }`}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
              Collection Indexes ({indexes.length})
            </h2>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              Manage single-field and compound indexes for{' '}
              <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                {selectedDb && selectedCollection ? `${selectedDb}.${selectedCollection}` : 'Current Collection'}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setKeyFields([{ id: String(Date.now()), field: '', direction: '1' }]);
            setCustomIndexName('');
            setColumnSearchQuery('');
            setIsModalOpen(true);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-xs cursor-pointer ${
            isDarkMode
              ? 'bg-[#0062d2] hover:bg-[#0051b3] text-white'
              : 'bg-[#001e2b] hover:bg-[#112734] text-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Index</span>
        </button>
      </div>

      {/* Index List Table */}
      <div
        className={`overflow-x-auto border rounded-md ${
          isDarkMode ? 'border-[#1c2d38]' : 'border-[#e8edeb]'
        }`}
      >
        <table className="w-full text-left text-xs">
          <thead
            className={`border-b ${
              isDarkMode
                ? 'bg-[#07131d] border-[#1c2d38] text-[#8899a6]'
                : 'bg-[#f8faf9] border-[#e8edeb] text-[#5c768d]'
            }`}
          >
            <tr>
              <th className="py-2.5 px-3 font-semibold">Index Name</th>
              <th className="py-2.5 px-3 font-semibold">Indexed Keys</th>
              <th className="py-2.5 px-3 font-semibold">Properties</th>
              <th className="py-2.5 px-3 font-semibold">Size</th>
              <th className="py-2.5 px-3 font-semibold">Usage</th>
              <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-[#1c2d38]' : 'divide-[#edf2ef]'}`}>
            {indexes.map((idx) => (
              <tr
                key={idx.name}
                className={isDarkMode ? 'hover:bg-[#132733]/50' : 'hover:bg-[#fbfcfc]'}
              >
                <td className={`py-3 px-3 font-mono font-medium ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                  {idx.name}
                </td>
                <td className={`py-3 px-3 font-mono ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(idx.keys).map(([k, v]) => (
                      <span
                        key={k}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-white'
                            : 'bg-[#f0f4f2] border-[#d8e2dc] text-[#1c2d38]'
                        }`}
                      >
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-1">
                    {idx.unique && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          isDarkMode
                            ? 'bg-[#0d2a45] text-[#38bdf8] border-[#1d4ed8]'
                            : 'bg-[#edf3fb] text-[#0d54a2] border-[#cbdcf5]'
                        }`}
                      >
                        Unique
                      </span>
                    )}
                    {idx.background && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          isDarkMode
                            ? 'bg-[#132733] text-[#8899a6] border-[#21313c]'
                            : 'bg-[#f0f4f2] text-[#2b4352] border-[#d8e2dc]'
                        }`}
                      >
                        Background
                      </span>
                    )}
                    {idx.sparse && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          isDarkMode
                            ? 'bg-[#3d2c00] text-[#fcd34d] border-[#785400]'
                            : 'bg-[#fff8e6] text-[#b37400] border-[#fae29c]'
                        }`}
                      >
                        Sparse
                      </span>
                    )}
                    {idx.ttlSeconds && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          isDarkMode
                            ? 'bg-[#35144f] text-[#d8b4fe] border-[#6b21a8]'
                            : 'bg-[#f5eefb] text-[#6b21a8] border-[#e1c7f7]'
                        }`}
                      >
                        TTL: {idx.ttlSeconds}s
                      </span>
                    )}
                    {!idx.unique && !idx.sparse && !idx.ttlSeconds && (
                      <span className="text-[#8899a6]">Default</span>
                    )}
                  </div>
                </td>
                <td className={`py-3 px-3 font-mono ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  {idx.size}
                </td>
                <td className={`py-3 px-3 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  {idx.usage ?? "—"} queries
                </td>
                <td className="py-3 px-3 text-right">
                  {idx.name !== '_id_' ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteIndex(idx.name)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isDarkMode
                          ? 'text-[#8899a6] hover:text-red-400 hover:bg-red-950/40'
                          : 'text-[#8899a6] hover:text-[#c73e3e] hover:bg-[#edf2ef]'
                      }`}
                      title="Drop Index"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#8899a6] italic select-none">
                      Primary Key
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE INDEX MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div
            className={`rounded-lg shadow-2xl border w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 ${
              isDarkMode
                ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
                : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-b ${
                isDarkMode ? 'border-[#1c2d38] bg-[#0b1a24]' : 'border-[#e8edeb] bg-white'
              }`}
            >
              <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                  Create Index
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  Configure keys and index options for fast queries
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  isDarkMode
                    ? 'text-[#8899a6] hover:text-white hover:bg-[#132733]'
                    : 'text-[#8899a6] hover:text-[#1c2d38] hover:bg-[#edf2ef]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form
              onSubmit={handleCreateIndex}
              className={`p-6 flex-1 overflow-auto space-y-5 ${
                isDarkMode ? 'bg-[#0b1a24]' : 'bg-white'
              }`}
            >
              {/* Index Name Input */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                  Index Name
                </label>
                <input
                  type="text"
                  placeholder="Optional: leave blank to auto-generate from keys"
                  value={customIndexName}
                  onChange={(e) => setCustomIndexName(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded border focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                      : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                  }`}
                />
                <span className="text-[11px] text-[#8899a6] mt-1 block">
                  Example: {currentDocumentFields.find(c => c.field !== '_id')?.field || 'name'}_1
                </span>
              </div>

              {/* Indexed Fields Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                    Fields ({keyFields.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className={`flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer ${
                      isDarkMode ? 'text-[#38bdf8]' : 'text-[#1c2d38]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add another field</span>
                  </button>
                </div>

                <div
                  className={`space-y-2 border rounded-md p-3 ${
                    isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#e8edeb] bg-[#fbfcfc]'
                  }`}
                >
                  {keyFields.map((fieldItem, idx) => (
                    <div key={fieldItem.id} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#8899a6] w-4">
                        {idx + 1}.
                      </span>

                      {/* Field name input with Autosuggest on Click */}
                      <div className="flex-1 relative">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Select or enter column name..."
                            value={fieldItem.field}
                            onFocus={() => {
                              setColumnSearchQuery('');
                              setActiveSuggestFieldId(fieldItem.id);
                            }}
                            onClick={() => {
                              setColumnSearchQuery('');
                              setActiveSuggestFieldId(fieldItem.id);
                            }}
                            onChange={(e) => {
                              handleUpdateField(fieldItem.id, { field: e.target.value });
                              setColumnSearchQuery(e.target.value);
                              setActiveSuggestFieldId(fieldItem.id);
                            }}
                            className={`w-full pl-2.5 pr-14 py-1.5 text-xs rounded font-mono border focus:outline-none transition-colors ${
                              isDarkMode
                                ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                                : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                            }`}
                          />
                          {/* Clear field button */}
                          {fieldItem.field && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateField(fieldItem.id, { field: '' });
                                setColumnSearchQuery('');
                                setActiveSuggestFieldId(fieldItem.id);
                              }}
                              className={`absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer transition-colors ${
                                isDarkMode ? 'text-[#8899a6] hover:text-white' : 'text-[#5c768d] hover:text-[#1c2d38]'
                              }`}
                              title="Clear selection"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          {/* Dropdown toggle chevron */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setColumnSearchQuery('');
                              setActiveSuggestFieldId((prev) =>
                                prev === fieldItem.id ? null : fieldItem.id
                              );
                            }}
                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded cursor-pointer transition-colors ${
                              isDarkMode
                                ? 'text-[#8899a6] hover:text-white'
                                : 'text-[#5c768d] hover:text-[#1c2d38]'
                            }`}
                            title="Click to view all document columns"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                activeSuggestFieldId === fieldItem.id ? 'rotate-180 text-[#38bdf8]' : ''
                              }`}
                            />
                          </button>
                        </div>

                        {/* Autosuggest Dropdown List */}
                        {activeSuggestFieldId === fieldItem.id && (
                          <>
                            {/* Invisible click-away backdrop to cleanly close dropdown */}
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => {
                                setActiveSuggestFieldId(null);
                                setColumnSearchQuery('');
                              }}
                            />

                            <div
                              className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
                                isDarkMode
                                  ? 'bg-[#0b1a24] border-[#1c2d38] text-white shadow-black/70'
                                  : 'bg-white border-[#d8e2dc] text-[#1c2d38] shadow-neutral-400/30'
                              }`}
                            >
                              <div
                                className={`px-2.5 py-1.5 text-[11px] font-semibold flex items-center justify-between border-b select-none ${
                                  isDarkMode
                                    ? 'bg-[#132733] border-[#1c2d38] text-[#8899a6]'
                                    : 'bg-[#f4f7f5] border-[#edf2ef] text-[#5c768d]'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>All Document Columns ({availableIndexFields.length})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSuggestFieldId(null);
                                    setColumnSearchQuery('');
                                  }}
                                  className="hover:text-red-400 p-0.5 rounded cursor-pointer"
                                  title="Close autosuggest"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Search filter input inside dropdown */}
                              <div className={`p-1.5 border-b ${isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#fbfcfc]'}`}>
                                <div className="relative flex items-center">
                                  <Search className="w-3.5 h-3.5 absolute left-2 text-[#8899a6]" />
                                  <input
                                    type="text"
                                    placeholder="Filter all columns..."
                                    value={columnSearchQuery}
                                    onChange={(e) => setColumnSearchQuery(e.target.value)}
                                    className={`w-full pl-7 pr-6 py-1 text-xs rounded border focus:outline-none font-mono ${
                                      isDarkMode
                                        ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                                        : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                                    }`}
                                    autoFocus
                                  />
                                  {columnSearchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => setColumnSearchQuery('')}
                                      className="absolute right-2 text-[#8899a6] hover:text-white"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="max-h-56 overflow-y-auto divide-y divide-[#1c2d38]/20 dark:divide-[#1c2d38]">
                                {(() => {
                                  const query = columnSearchQuery.trim().toLowerCase();
                                  const matches = query
                                    ? availableIndexFields.filter((cf) =>
                                        cf.field.toLowerCase().includes(query)
                                      )
                                    : availableIndexFields;

                                  if (matches.length === 0) {
                                    return (
                                      <div className="p-3 text-xs text-[#8899a6] text-center">
                                        <p className="italic">{availableIndexFields.length === 0 ? 'All fields are already indexed or selected.' : <>No columns matching &quot;{columnSearchQuery}&quot;.</>}</p>
                                        {availableIndexFields.length > 0 && <button
                                          type="button"
                                          onClick={() => setColumnSearchQuery('')}
                                          className="mt-1.5 text-xs text-[#38bdf8] underline cursor-pointer"
                                        >
                                          Show all {availableIndexFields.length} columns
                                        </button>}
                                      </div>
                                    );
                                  }

                                  return matches.map((fItem) => {
                                    const isSelected = fieldItem.field === fItem.field;
                                    return (
                                      <button
                                        key={fItem.field}
                                        type="button"
                                        onClick={() => {
                                          handleUpdateField(fieldItem.id, { field: fItem.field });
                                          setActiveSuggestFieldId(null);
                                          setColumnSearchQuery('');
                                        }}
                                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer text-xs ${
                                          isSelected
                                            ? isDarkMode
                                              ? 'bg-[#1a3444] text-white font-medium'
                                              : 'bg-[#edf4f0] text-[#001e2b] font-medium'
                                            : isDarkMode
                                              ? 'hover:bg-[#132733] text-[#e8edeb]'
                                              : 'hover:bg-[#f5f8f6] text-[#1c2d38]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="font-mono text-xs truncate">
                                            {fItem.field}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span
                                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono border ${
                                              isDarkMode
                                                ? 'bg-[#07131d] border-[#21313c] text-[#38bdf8]'
                                                : 'bg-[#f0f4f2] border-[#d8ece2] text-[#00684a]'
                                            }`}
                                          >
                                            {fItem.type}
                                          </span>
                                          {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-[#38bdf8]" />
                                          )}
                                        </div>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Index Type Dropdown */}
                      <select
                        value={fieldItem.direction}
                        onChange={(e) =>
                          handleUpdateField(fieldItem.id, {
                            direction: e.target.value as any
                          })
                        }
                        className={`w-44 px-2 py-1.5 text-xs rounded border focus:outline-none cursor-pointer ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                        }`}
                      >
                        <option value="1">1 (Ascending)</option>
                        <option value="-1">-1 (Descending)</option>
                        <option value="text">text (Text search)</option>
                        <option value="2dsphere">2dsphere (Geospatial)</option>
                        <option value="hashed">hashed (Hashed)</option>
                      </select>

                      {/* Remove Field Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveField(fieldItem.id)}
                        disabled={keyFields.length === 1}
                        className={`p-1.5 rounded disabled:opacity-30 cursor-pointer transition-colors ${
                          isDarkMode
                            ? 'text-[#8899a6] hover:text-red-400 hover:bg-red-950/40'
                            : 'text-[#8899a6] hover:text-[#c73e3e] hover:bg-[#edf2ef]'
                        }`}
                        title="Remove field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options Section */}
              <div
                className={`space-y-3 pt-2 border-t ${
                  isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
                }`}
              >
                <label className={`block text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                  Options
                </label>

                {/* Unique Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnique}
                    onChange={(e) => setIsUnique(e.target.checked)}
                    className={`mt-0.5 w-4 h-4 rounded cursor-pointer ${
                      isDarkMode ? 'accent-[#38bdf8]' : 'accent-[#001e2b]'
                    }`}
                  />
                  <div>
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                      Create unique index
                    </span>
                    <span className="text-[11px] text-[#8899a6] block">
                      Prevents duplicate values for the indexed keys across the collection.
                    </span>
                  </div>
                </label>

                {/* Background Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBackground}
                    onChange={(e) => setIsBackground(e.target.checked)}
                    className={`mt-0.5 w-4 h-4 rounded cursor-pointer ${
                      isDarkMode ? 'accent-[#38bdf8]' : 'accent-[#001e2b]'
                    }`}
                  />
                  <div>
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                      Build index in the background
                    </span>
                    <span className="text-[11px] text-[#8899a6] block">
                      Builds index without locking read/write operations.
                    </span>
                  </div>
                </label>

                {/* Sparse Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSparse}
                    onChange={(e) => setIsSparse(e.target.checked)}
                    className={`mt-0.5 w-4 h-4 rounded cursor-pointer ${
                      isDarkMode ? 'accent-[#38bdf8]' : 'accent-[#001e2b]'
                    }`}
                  />
                  <div>
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                      Create sparse index
                    </span>
                    <span className="text-[11px] text-[#8899a6] block">
                      Only indexes documents that contain the indexed field.
                    </span>
                  </div>
                </label>

                {/* TTL Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTtl}
                    onChange={(e) => setIsTtl(e.target.checked)}
                    className={`mt-0.5 w-4 h-4 rounded cursor-pointer ${
                      isDarkMode ? 'accent-[#38bdf8]' : 'accent-[#001e2b]'
                    }`}
                  />
                  <div className="flex-1">
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                      Create TTL (Time To Live) index
                    </span>
                    <span className="text-[11px] text-[#8899a6] block mb-1.5">
                      Automatically purge documents after a specific number of seconds.
                    </span>
                    {isTtl && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                          Expire after:
                        </span>
                        <input
                          type="number"
                          value={ttlSeconds}
                          onChange={(e) => setTtlSeconds(e.target.value)}
                          className={`w-24 px-2 py-1 text-xs rounded border ${
                            isDarkMode
                              ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                              : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                          }`}
                        />
                        <span className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                          seconds
                        </span>
                      </div>
                    )}
                  </div>
                </label>

                {/* Partial Filter Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPartial}
                    onChange={(e) => setIsPartial(e.target.checked)}
                    className={`mt-0.5 w-4 h-4 rounded cursor-pointer ${
                      isDarkMode ? 'accent-[#38bdf8]' : 'accent-[#001e2b]'
                    }`}
                  />
                  <div className="flex-1">
                    <span className={`text-xs font-medium block ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                      Partial Filter Expression
                    </span>
                    <span className="text-[11px] text-[#8899a6] block mb-1.5">
                      Only index documents that match a specified filter expression.
                    </span>
                    {isPartial && (
                      <input
                        type="text"
                        value={partialFilter}
                        onChange={(e) => setPartialFilter(e.target.value)}
                        className={`w-full px-2.5 py-1 text-xs font-mono rounded border ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                        }`}
                      />
                    )}
                  </div>
                </label>
              </div>

              {/* Modal Footer */}
              <div
                className={`flex items-center justify-end gap-2.5 pt-4 border-t ${
                  isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white hover:bg-[#1a3444]'
                      : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#0062d2] hover:bg-[#0051b3] text-white'
                      : 'bg-[#001e2b] hover:bg-[#112734] text-white'
                  }`}
                >
                  Create Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
