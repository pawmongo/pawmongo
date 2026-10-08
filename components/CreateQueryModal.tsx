'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Code2
} from 'lucide-react';

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}

interface CreateQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuery: (query: string) => void;
  initialQuery?: string;
  columns?: string[] | Array<{ field: string; type?: string }>;
}

const DEFAULT_COMMON_FIELDS = [
  { value: 'name', label: 'Company Name (name)', defaultType: 'string' },
  { value: 'category_code', label: 'Category (category_code)', defaultType: 'string' },
  { value: 'founded_year', label: 'Founded Year (founded_year)', defaultType: 'number' },
  { value: 'number_of_employees', label: 'Employees (number_of_employees)', defaultType: 'number' },
  { value: 'permalink', label: 'Permalink (permalink)', defaultType: 'string' },
  { value: 'homepage_url', label: 'Homepage URL (homepage_url)', defaultType: 'string' },
  { value: 'tag_list', label: 'Tag List (tag_list)', defaultType: 'string' },
  { value: 'deadpooled_year', label: 'Deadpooled Year (deadpooled_year)', defaultType: 'number' },
  { value: 'offices.city', label: 'Office City (offices.city)', defaultType: 'string' },
  { value: 'offices.state_code', label: 'Office State (offices.state_code)', defaultType: 'string' },
  { value: 'offices.country_code', label: 'Office Country (offices.country_code)', defaultType: 'string' }
];

const OPERATORS = [
  { value: '$eq', label: 'Equals ($eq)' },
  { value: '$ne', label: 'Not Equals ($ne)' },
  { value: '$gt', label: 'Greater Than ($gt)' },
  { value: '$gte', label: 'Greater Than or Equal ($gte)' },
  { value: '$lt', label: 'Less Than ($lt)' },
  { value: '$lte', label: 'Less Than or Equal ($lte)' },
  { value: '$regex', label: 'Contains / Regex ($regex)' },
  { value: '$in', label: 'In List ($in - comma separated)' },
  { value: '$exists', label: 'Field Exists ($exists)' }
];

export function CreateQueryModal({
  isOpen,
  onClose,
  onApplyQuery,
  initialQuery = '',
  columns
}: CreateQueryModalProps) {
  const dynamicFieldOptions = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns.map((c) => {
        const fieldName = typeof c === 'string' ? c : c.field;
        const fieldType = typeof c === 'string' ? 'string' : (c.type === 'Int32' || c.type === 'Double' ? 'number' : 'string');
        return {
          value: fieldName,
          label: `${fieldName}`,
          defaultType: fieldType as 'string' | 'number'
        };
      });
    }
    return DEFAULT_COMMON_FIELDS;
  }, [columns]);

  const [matchType, setMatchType] = useState<'and' | 'or'>('and');
  const [conditions, setConditions] = useState<Condition[]>(() => [
    {
      id: '1',
      field: columns && columns.length > 0 ? (typeof columns[0] === 'string' ? columns[0] : columns[0].field) : 'name',
      operator: '$eq',
      value: '',
      type: 'string'
    }
  ]);
  const [customFieldInput, setCustomFieldInput] = useState('');
  const [useCustomField, setUseCustomField] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quick form presets (No AI - pure query templates)
  const PRESET_QUERIES = [
    {
      name: 'Web Companies',
      conds: [{ id: '1', field: 'category_code', operator: '$eq', value: 'web', type: 'string' as const }]
    },
    {
      name: 'Founded ≥ 2005 with 50+ staff',
      conds: [
        { id: '1', field: 'founded_year', operator: '$gte', value: '2005', type: 'number' as const },
        { id: '2', field: 'number_of_employees', operator: '$gte', value: '50', type: 'number' as const }
      ]
    },
    {
      name: 'Deadpooled Companies',
      conds: [{ id: '1', field: 'deadpooled_year', operator: '$ne', value: 'null', type: 'string' as const }]
    },
    {
      name: 'Wiki or Search Tags',
      conds: [{ id: '1', field: 'tag_list', operator: '$regex', value: 'wiki', type: 'string' as const }]
    }
  ];

  const handleAddCondition = () => {
    const newId = String(Date.now());
    const defaultField = dynamicFieldOptions[0]?.value || 'name';
    setConditions((prev) => [
      ...prev,
      { id: newId, field: defaultField, operator: '$eq', value: '', type: 'string' }
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    if (conditions.length === 1) {
      const defaultField = dynamicFieldOptions[0]?.value || 'name';
      setConditions([{ id: String(Date.now()), field: defaultField, operator: '$eq', value: '', type: 'string' }]);
      return;
    }
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Convert form state to MongoDB JSON query string
  const generatedQuery = useMemo(() => {
    const activeConditions = conditions.filter((c) => c.field && (c.value !== '' || c.operator === '$exists'));
    if (activeConditions.length === 0) return '{}';

    const parseValue = (c: Condition) => {
      if (c.operator === '$exists') return true;
      if (c.value.toLowerCase() === 'null') return null;
      if (c.value.toLowerCase() === 'true') return true;
      if (c.value.toLowerCase() === 'false') return false;
      if (c.operator === '$in') {
        return c.value.split(',').map((v) => {
          const trimmed = v.trim();
          const num = Number(trimmed);
          return !isNaN(num) && trimmed !== '' ? num : trimmed;
        });
      }
      if (c.type === 'number') {
        const num = Number(c.value);
        return isNaN(num) ? c.value : num;
      }
      return c.value;
    };

    if (activeConditions.length === 1) {
      const c = activeConditions[0];
      const val = parseValue(c);
      if (c.operator === '$eq') {
        return JSON.stringify({ [c.field]: val }, null, 2);
      }
      if (c.operator === '$regex') {
        return JSON.stringify({ [c.field]: { $regex: val, $options: 'i' } }, null, 2);
      }
      return JSON.stringify({ [c.field]: { [c.operator]: val } }, null, 2);
    }

    const clauses = activeConditions.map((c) => {
      const val = parseValue(c);
      if (c.operator === '$eq') {
        return { [c.field]: val };
      }
      if (c.operator === '$regex') {
        return { [c.field]: { $regex: val, $options: 'i' } };
      }
      return { [c.field]: { [c.operator]: val } };
    });

    if (matchType === 'and') {
      // Check if all fields are distinct
      const fields = clauses.map((cl) => Object.keys(cl)[0]);
      const uniqueFields = new Set(fields);
      if (uniqueFields.size === fields.length) {
        // Can merge into single object
        const merged: Record<string, any> = {};
        clauses.forEach((cl) => {
          const k = Object.keys(cl)[0];
          merged[k] = cl[k];
        });
        return JSON.stringify(merged, null, 2);
      }
      return JSON.stringify({ $and: clauses }, null, 2);
    } else {
      return JSON.stringify({ $or: clauses }, null, 2);
    }
  }, [conditions, matchType]);

  const handleApply = () => {
    onApplyQuery(generatedQuery.replace(/\n/g, ' '));
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    const defaultField = dynamicFieldOptions[0]?.value || 'name';
    setConditions([
      { id: '1', field: defaultField, operator: '$eq', value: '', type: 'string' }
    ]);
    setMatchType('and');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0b1a24] rounded-lg shadow-2xl border border-[#d8e2dc] dark:border-[#1c2d38] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edeb] dark:border-[#1c2d38] bg-white dark:bg-[#0b1a24]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#f0f4f2] dark:bg-[#132733] flex items-center justify-center text-[#1c2d38] dark:text-[#38bdf8] border border-[#d8e2dc] dark:border-[#21313c]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Create Query</h3>
              <p className="text-xs text-[#5c768d] dark:text-[#8899a6] mt-0.5">
                Construct MongoDB query filters using the visual form builder
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white rounded-md hover:bg-[#edf2ef] dark:hover:bg-[#132733] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-auto space-y-5 bg-white dark:bg-[#0b1a24]">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-[#5c768d] dark:text-[#8899a6] uppercase tracking-wider mb-2">
              Preset Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setConditions(preset.conds)}
                  className="px-2.5 py-1 text-xs bg-[#f4f7f5] dark:bg-[#132733] hover:bg-[#e8edeb] dark:hover:bg-[#1c3344] text-[#1c2d38] dark:text-[#e8edeb] rounded border border-[#d8e2dc] dark:border-[#21313c] font-medium transition-colors cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Match Rule Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#f8faf9] dark:bg-[#07131d] border border-[#e8edeb] dark:border-[#1c2d38] rounded-md">
            <span className="text-xs font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Condition Match Logic:</span>
            <div className="flex items-center bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded p-0.5">
              <button
                type="button"
                onClick={() => setMatchType('and')}
                className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer font-medium ${
                  matchType === 'and'
                    ? 'bg-[#001e2b] dark:bg-[#0062d2] text-white shadow-xs'
                    : 'text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white'
                }`}
              >
                Match ALL (AND)
              </button>
              <button
                type="button"
                onClick={() => setMatchType('or')}
                className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer font-medium ${
                  matchType === 'or'
                    ? 'bg-[#001e2b] dark:bg-[#0062d2] text-white shadow-xs'
                    : 'text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white'
                }`}
              >
                Match ANY (OR)
              </button>
            </div>
          </div>

          {/* Condition Rows Form */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#5c768d] dark:text-[#8899a6] uppercase tracking-wider">
                Query Conditions ({conditions.length})
              </label>
              <button
                type="button"
                onClick={handleAddCondition}
                className="flex items-center gap-1 text-xs font-medium text-[#1c2d38] dark:text-[#38bdf8] hover:text-[#001e2b] dark:hover:text-[#7dd3fc] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {conditions.map((cond, index) => (
                <div
                  key={cond.id}
                  className="flex flex-wrap md:flex-nowrap items-center gap-2 p-2.5 bg-[#fbfcfc] dark:bg-[#07131d] border border-[#d8e2dc] dark:border-[#21313c] rounded-md"
                >
                  <span className="text-xs font-mono font-semibold text-[#8899a6] select-none w-5">
                    {index + 1}.
                  </span>

                  {/* Field Selector */}
                  <select
                    value={cond.field}
                    onChange={(e) => {
                      const sel = dynamicFieldOptions.find((f) => f.value === e.target.value);
                      handleUpdateCondition(cond.id, {
                        field: e.target.value,
                        type: (sel?.defaultType as any) || 'string'
                      });
                    }}
                    className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded text-[#1c2d38] dark:text-[#e8edeb] focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#38bdf8] cursor-pointer"
                  >
                    {dynamicFieldOptions.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator Selector */}
                  <select
                    value={cond.operator}
                    onChange={(e) => handleUpdateCondition(cond.id, { operator: e.target.value })}
                    className="w-40 px-2.5 py-1.5 text-xs bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded text-[#1c2d38] dark:text-[#e8edeb] focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#38bdf8] cursor-pointer"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value Input */}
                  {cond.operator !== '$exists' ? (
                    <input
                      type={cond.type === 'number' && cond.operator !== '$in' ? 'number' : 'text'}
                      placeholder={
                        cond.operator === '$in'
                          ? 'val1, val2, val3'
                          : cond.operator === '$regex'
                          ? 'search pattern'
                          : 'value'
                      }
                      value={cond.value}
                      onChange={(e) => handleUpdateCondition(cond.id, { value: e.target.value })}
                      className="flex-1 min-w-[130px] px-2.5 py-1.5 text-xs bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded text-[#1c2d38] dark:text-[#e8edeb] focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#38bdf8]"
                    />
                  ) : (
                    <div className="flex-1 px-2.5 py-1.5 text-xs text-[#5c768d] dark:text-[#8899a6] italic">
                      checks if field exists
                    </div>
                  )}

                  {/* Type Selector (string vs number) */}
                  <select
                    value={cond.type}
                    onChange={(e) => handleUpdateCondition(cond.id, { type: e.target.value as any })}
                    className="w-20 px-1.5 py-1.5 text-xs bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded text-[#5c768d] dark:text-[#8899a6] focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#38bdf8] cursor-pointer"
                  >
                    <option value="string">str</option>
                    <option value="number">num</option>
                  </select>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(cond.id)}
                    className="p-1.5 text-[#8899a6] hover:text-red-400 rounded hover:bg-[#edf2ef] dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Remove Condition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Query Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5c768d] dark:text-[#8899a6] uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                MongoDB JSON Query Preview:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-medium text-[#1c2d38] dark:text-[#38bdf8] hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Query'}</span>
              </button>
            </div>
            <pre className="p-3 bg-[#f8faf9] dark:bg-[#07131d] border border-[#d8e2dc] dark:border-[#21313c] rounded-md font-mono text-xs text-[#1c2d38] dark:text-[#e8edeb] overflow-x-auto max-h-36 leading-relaxed select-all">
              {generatedQuery}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f9fbfa] dark:bg-[#07131d] border-t border-[#e8edeb] dark:border-[#1c2d38]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded-md transition-colors cursor-pointer hover:bg-[#edf2ef] dark:hover:bg-[#1c3344]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#001e2b] dark:bg-[#0062d2] hover:bg-[#112734] dark:hover:bg-[#0051b3] rounded-md shadow-xs transition-colors cursor-pointer"
            >
              Apply Query
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
