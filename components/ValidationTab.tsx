'use client';

import React, { useState } from 'react';
import { ShieldCheck, Check, Plus, Trash2, Code2, SlidersHorizontal } from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';

import { MongoDocument } from '@/lib/mongodb-mock-data';

interface SchemaRule {
  field: string;
  bsonType: string;
  required: boolean;
  description: string;
}

interface ValidationTabProps {
  documents?: MongoDocument[];
  isDarkMode?: boolean;
}

export function ValidationTab({ documents = [], isDarkMode: isDarkModeProp }: ValidationTabProps) {
  const { theme } = useDatabase();
  const isDarkMode = isDarkModeProp ?? (theme === 'dark');

  const [activeMode, setActiveMode] = useState<'editor' | 'builder'>('editor');

  // Compute initial rules and schema text dynamically from collection documents
  const initialRules = React.useMemo(() => {
    if (documents && documents.length > 0) {
      const detectedFields: Record<string, string> = {};
      const requiredFields: string[] = [];

      documents.slice(0, 10).forEach((doc) => {
        Object.entries(doc).forEach(([key, val]) => {
          if (key === '_id') return;
          if (!detectedFields[key]) {
            const t = Array.isArray(val)
              ? 'array'
              : val === null
              ? 'null'
              : typeof val === 'number'
              ? Number.isInteger(val)
                ? 'int'
                : 'double'
              : typeof val === 'boolean'
              ? 'bool'
              : typeof val === 'object'
              ? 'object'
              : 'string';
            detectedFields[key] = t;
          }
        });
      });

      // Top 5 fields
      return Object.entries(detectedFields).slice(0, 5).map(([field, bsonType], idx) => ({
        field,
        bsonType,
        required: idx === 0,
        description: idx === 0 ? 'Primary identifier' : ''
      }));
    }

    return [
      { field: 'name', bsonType: 'string', required: true, description: 'Document name' },
      { field: 'status', bsonType: 'string', required: false, description: 'Status state' }
    ];
  }, [documents]);

  const [rules, setRules] = useState<SchemaRule[]>(initialRules);

  const [schemaText, setSchemaText] = useState(() => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    initialRules.forEach((r) => {
      properties[r.field] = { bsonType: r.bsonType };
      if (r.required) required.push(r.field);
    });

    return JSON.stringify(
      {
        $jsonSchema: {
          bsonType: 'object',
          required,
          properties
        }
      },
      null,
      2
    );
  });

  const [validationAction, setValidationAction] = useState('error');
  const [validationLevel, setValidationLevel] = useState('strict');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      { field: 'new_field', bsonType: 'string', required: false, description: '' }
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className={`border rounded-lg p-6 space-y-6 shadow-xs ${
        isDarkMode
          ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
          : 'bg-white border-[#e8edeb] text-[#1c2d38]'
      }`}
    >
      {/* Top Header */}
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
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
              Document Validation Rules
            </h2>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              Enforce schema validation on inserts and updates using JSON Schema ($jsonSchema)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-xs cursor-pointer ${
            isDarkMode
              ? 'bg-[#0062d2] hover:bg-[#0051b3] text-white'
              : 'bg-[#001e2b] hover:bg-[#112734] text-white'
          }`}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : null}
          <span>{saved ? 'Rules Saved' : 'Save Rules'}</span>
        </button>
      </div>

      {/* Validation Settings Bar */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-md border ${
          isDarkMode ? 'bg-[#07131d] border-[#1c2d38]' : 'bg-[#f8faf9] border-[#e8edeb]'
        }`}
      >
        <div>
          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
            Validation Action
          </label>
          <div className="flex gap-2">
            {['error', 'warn'].map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setValidationAction(action)}
                className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer font-medium ${
                  validationAction === action
                    ? isDarkMode
                      ? 'bg-[#0062d2] text-white border-[#0062d2]'
                      : 'bg-[#001e2b] text-white border-[#001e2b]'
                    : isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white'
                    : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#8899a6] mt-1 block">
            {validationAction === 'error'
              ? 'Documents that fail validation are rejected.'
              : 'Documents that fail validation are written but logged to mongod.log.'}
          </span>
        </div>

        <div>
          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
            Validation Level
          </label>
          <div className="flex gap-2">
            {['strict', 'moderate', 'off'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setValidationLevel(lvl)}
                className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer font-medium ${
                  validationLevel === lvl
                    ? isDarkMode
                      ? 'bg-[#0062d2] text-white border-[#0062d2]'
                      : 'bg-[#001e2b] text-white border-[#001e2b]'
                    : isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white'
                    : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#8899a6] mt-1 block">
            {validationLevel === 'strict'
              ? 'Apply validation rules to all inserts and updates.'
              : 'Apply rules only to existing valid documents.'}
          </span>
        </div>
      </div>

      {/* View Mode Toggle: JSON Editor vs Rule Builder */}
      <div
        className={`flex items-center justify-between border-b pb-2 ${
          isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
        }`}
      >
        <div
          className={`flex items-center gap-1 p-0.5 rounded border ${
            isDarkMode ? 'bg-[#07131d] border-[#1c2d38]' : 'bg-[#f0f4f2] border-[#d8e2dc]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveMode('editor')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeMode === 'editor'
                ? isDarkMode
                  ? 'bg-[#0062d2] text-white shadow-xs'
                  : 'bg-[#001e2b] text-white shadow-xs'
                : isDarkMode
                ? 'text-[#8899a6] hover:text-white'
                : 'text-[#5c768d] hover:text-[#1c2d38]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON Schema Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('builder')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeMode === 'builder'
                ? isDarkMode
                  ? 'bg-[#0062d2] text-white shadow-xs'
                  : 'bg-[#001e2b] text-white shadow-xs'
                : isDarkMode
                ? 'text-[#8899a6] hover:text-white'
                : 'text-[#5c768d] hover:text-[#1c2d38]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Visual Rule Builder</span>
          </button>
        </div>

        <span className="text-xs text-[#8899a6]">
          Drafting rules for{' '}
          <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
            sample_training.companies
          </span>
        </span>
      </div>

      {/* Mode 1: JSON Schema Editor */}
      {activeMode === 'editor' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              JSON Schema ($jsonSchema expression)
            </label>
            <span className="text-[11px] text-[#8899a6]">
              Formatted valid JSON required
            </span>
          </div>
          <textarea
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
            rows={15}
            className={`w-full p-4 font-mono text-xs rounded-md focus:outline-none leading-relaxed border ${
              isDarkMode
                ? 'bg-[#07131d] border-[#1c2d38] text-white focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]'
                : 'bg-[#f8faf9] border-[#d8e2dc] text-[#1c2d38] focus:ring-2 focus:ring-[#001e2b] focus:border-[#001e2b]'
            }`}
          />
        </div>
      ) : (
        /* Mode 2: Visual Rule Builder */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              Field Validation Rules ({rules.length})
            </span>
            <button
              type="button"
              onClick={handleAddRule}
              className={`flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer ${
                isDarkMode ? 'text-[#38bdf8]' : 'text-[#1c2d38]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field Rule</span>
            </button>
          </div>

          <div
            className={`border rounded-md overflow-hidden ${
              isDarkMode ? 'border-[#1c2d38] bg-[#0b1a24]' : 'border-[#e8edeb] bg-white'
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
                  <th className="py-2.5 px-3 font-semibold">Field Name</th>
                  <th className="py-2.5 px-3 font-semibold">BSON Type</th>
                  <th className="py-2.5 px-3 font-semibold">Required</th>
                  <th className="py-2.5 px-3 font-semibold">Description</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-[#1c2d38]' : 'divide-[#edf2ef]'}`}>
                {rules.map((rule, idx) => (
                  <tr
                    key={idx}
                    className={isDarkMode ? 'hover:bg-[#132733]/50' : 'hover:bg-[#fbfcfc]'}
                  >
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={rule.field}
                        onChange={(e) => {
                          const updated = [...rules];
                          updated[idx].field = e.target.value;
                          setRules(updated);
                        }}
                        className={`w-full px-2 py-1 text-xs rounded font-mono border focus:outline-none ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                        }`}
                      />
                    </td>
                    <td className="p-2.5">
                      <select
                        value={rule.bsonType}
                        onChange={(e) => {
                          const updated = [...rules];
                          updated[idx].bsonType = e.target.value;
                          setRules(updated);
                        }}
                        className={`px-2 py-1 text-xs rounded font-mono border focus:outline-none cursor-pointer ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                        }`}
                      >
                        <option value="string">string</option>
                        <option value="int">int</option>
                        <option value="double">double</option>
                        <option value="bool">bool</option>
                        <option value="array">array</option>
                        <option value="object">object</option>
                        <option value="objectId">objectId</option>
                        <option value="date">date</option>
                      </select>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="checkbox"
                        checked={rule.required}
                        onChange={(e) => {
                          const updated = [...rules];
                          updated[idx].required = e.target.checked;
                          setRules(updated);
                        }}
                        className={`w-4 h-4 rounded cursor-pointer ${
                          isDarkMode ? 'accent-[#38bdf8]' : 'accent-[#001e2b]'
                        }`}
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        placeholder="Description note"
                        value={rule.description}
                        onChange={(e) => {
                          const updated = [...rules];
                          updated[idx].description = e.target.value;
                          setRules(updated);
                        }}
                        className={`w-full px-2 py-1 text-xs rounded border focus:outline-none ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                        }`}
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          isDarkMode
                            ? 'text-[#8899a6] hover:text-red-400 hover:bg-red-950/40'
                            : 'text-[#8899a6] hover:text-[#c73e3e] hover:bg-[#edf2ef]'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
