'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GitBranch,
  ChevronDown,
  Play,
  CheckCircle,
  Copy,
  Check,
  Search
} from 'lucide-react';
import JSON5 from 'json5';
import { apiClient } from '@/lib/api-client';
import { useDatabase } from '@/context/DatabaseContext';
import { MongoDocument } from '@/lib/mongodb-mock-data';

interface AggregationsTabProps {
  selectedDb: string;
  selectedCollection: string;
  documents: MongoDocument[];
  isDarkMode?: boolean;
}

interface StageDefinition {
  stage: string;
  label: string;
  description: string;
  defaultQuery: string;
}

const AVAILABLE_STAGES: StageDefinition[] = [
  {
    stage: '$match',
    label: '$match',
    description: 'Filter documents that meet specified criteria',
    defaultQuery: '{\n  category_code: "web"\n}'
  },
  {
    stage: '$project',
    label: '$project',
    description: 'Reshape documents, include, exclude, or rename fields',
    defaultQuery: '{\n  name: 1,\n  category_code: 1,\n  founded_year: 1\n}'
  },
  {
    stage: '$group',
    label: '$group',
    description: 'Group documents by expression and compute accumulated values',
    defaultQuery: '{\n  _id: "$founded_year",\n  total: { $sum: 1 },\n  avg_emp: { $avg: "$number_of_employees" }\n}'
  },
  {
    stage: '$sort',
    label: '$sort',
    description: 'Sort documents by specified field values',
    defaultQuery: '{\n  total: -1\n}'
  },
  {
    stage: '$limit',
    label: '$limit',
    description: 'Restrict output to specified number of documents',
    defaultQuery: '10'
  },
  {
    stage: '$skip',
    label: '$skip',
    description: 'Skip first N documents in the pipeline',
    defaultQuery: '5'
  },
  {
    stage: '$unwind',
    label: '$unwind',
    description: 'Deconstruct an array field into individual documents',
    defaultQuery: '"$offices"'
  },
  {
    stage: '$lookup',
    label: '$lookup',
    description: 'Perform left outer join with another collection',
    defaultQuery: '{\n  from: "grades",\n  localField: "name",\n  foreignField: "student_id",\n  as: "grades_data"\n}'
  },
  {
    stage: '$addFields',
    label: '$addFields',
    description: 'Add new computed or static fields to documents',
    defaultQuery: '{\n  is_established: { $lt: ["$founded_year", 2005] }\n}'
  },
  {
    stage: '$count',
    label: '$count',
    description: 'Return document count passing through previous stages',
    defaultQuery: '"total_records"'
  },
  {
    stage: '$facet',
    label: '$facet',
    description: 'Execute multi-faceted aggregation sub-pipelines',
    defaultQuery: '{\n  by_year: [{ $sort: { founded_year: -1 } }, { $limit: 5 }],\n  by_employees: [{ $sort: { number_of_employees: -1 } }, { $limit: 5 }]\n}'
  }
];

export function AggregationsTab({ documents, selectedDb, selectedCollection, isDarkMode = false }: AggregationsTabProps) {
  const [stages, setStages] = useState<Array<{ stage: string; query: string; isEnabled: boolean }>>([
    { stage: '$match', query: '{\n  category_code: "web"\n}', isEnabled: true },
    {
      stage: '$group',
      query: '{\n  _id: "$founded_year",\n  total: { $sum: 1 },\n  avg_emp: { $avg: "$number_of_employees" }\n}',
      isEnabled: true
    },
    { stage: '$sort', query: '{\n  total: -1\n}', isEnabled: true }
  ]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [result, setResult] = useState<any[]>([]);
  const { triggerToast } = useDatabase();
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const pipeline = stages.filter(s=>s.isEnabled).map(s=>({[s.stage]:JSON5.parse(s.query)}));
        const data = await apiClient.collectionTool(selectedDb, selectedCollection, {action:'aggregate',pipeline:JSON.stringify(pipeline)});
        if (mounted) setResult(data.documents);
      } catch (error) { if (mounted) {setResult([]); triggerToast((error as Error).message);} }
    }, 500);
    return () => {mounted=false; clearTimeout(timer);};
  }, [stages,selectedDb,selectedCollection]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStage = (stageDef: StageDefinition) => {
    setStages([
      ...stages,
      {
        stage: stageDef.stage,
        query: stageDef.defaultQuery,
        isEnabled: true
      }
    ]);
    setIsDropdownOpen(false);
    setStageFilter('');
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleStageTypeChange = (index: number, newStageName: string) => {
    const stageDef = AVAILABLE_STAGES.find((s) => s.stage === newStageName);
    const updated = [...stages];
    updated[index] = {
      stage: newStageName,
      query: stageDef ? stageDef.defaultQuery : updated[index].query,
      isEnabled: updated[index].isEnabled
    };
    setStages(updated);
  };

  const handleCopyPipeline = () => {
    const pipelineJson = stages
      .filter((s) => s.isEnabled)
      .map((s) => {
        try {
          return { [s.stage]: JSON.parse(s.query) };
        } catch {
          return { [s.stage]: s.query };
        }
      });
    navigator.clipboard.writeText(JSON.stringify(pipelineJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredStages = AVAILABLE_STAGES.filter((s) =>
    s.stage.toLowerCase().includes(stageFilter.toLowerCase()) ||
    s.description.toLowerCase().includes(stageFilter.toLowerCase())
  );

  return (
    <div
      className={`border rounded-lg p-6 space-y-6 shadow-xs ${
        isDarkMode
          ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
          : 'bg-white border-[#e8edeb] text-[#1c2d38]'
      }`}
    >
      {/* Header Row */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b ${
          isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center border ${
              isDarkMode
                ? 'bg-[#132733] text-[#e8edeb] border-[#21313c]'
                : 'bg-[#f0f4f2] text-[#1c2d38] border-[#d8e2dc]'
            }`}
          >
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Aggregation Pipeline Builder</h2>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              Build multi-stage aggregation pipelines with live stage previews
            </p>
          </div>
        </div>

        {/* Action Buttons: Add Stage Dropdown & Copy Pipeline */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyPipeline}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
              isDarkMode
                ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
            }`}
            title="Copy Pipeline as JSON"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#5c768d]" />
                <span className="text-[#5c768d]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#5c768d]" />
                <span>Export Pipeline</span>
              </>
            )}
          </button>

          {/* ADD STAGE DROPDOWN BUTTON - Styled like Bulk (NO SOLID BG) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                  : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-[#5c768d]" />
              <span>Add Stage</span>
              <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className={`absolute right-0 top-full mt-1.5 z-40 w-72 border rounded-lg shadow-xl overflow-hidden py-1.5 animate-in fade-in duration-100 ${
                  isDarkMode
                    ? 'bg-[#0f212e] border-[#21313c] text-[#e8edeb]'
                    : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
                }`}
              >
                {/* Search input in dropdown */}
                <div className={`p-2 border-b ${isDarkMode ? 'border-[#21313c]' : 'border-[#edf2ef]'}`}>
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-2 text-[#8899a6] pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Filter stages..."
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className={`w-full pl-7 pr-2 py-1 text-xs rounded border focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#132733] border-[#21313c] text-white focus:border-[#5c768d]'
                          : 'bg-[#fbfcfc] border-[#d8e2dc] text-[#1c2d38] focus:border-[#001e2b]'
                      }`}
                    />
                  </div>
                </div>

                {/* Stages List */}
                <div className="max-h-64 overflow-y-auto py-1">
                  {filteredStages.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-[#8899a6]">No matching stages found</div>
                  ) : (
                    filteredStages.map((stageDef) => (
                      <button
                        type="button"
                        key={stageDef.stage}
                        onClick={() => handleSelectStage(stageDef)}
                        className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'hover:bg-[#1a3344] text-[#e8edeb]'
                            : 'hover:bg-[#f4f7f5] text-[#1c2d38]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-[#5c768d] dark:text-[#8899a6]">
                            {stageDef.stage}
                          </span>
                        </div>
                        <span className={`text-[11px] leading-tight line-clamp-1 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                          {stageDef.description}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stages Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              Pipeline Stages ({stages.length})
            </span>
          </div>

          {stages.length === 0 ? (
            <div
              className={`p-8 border border-dashed rounded-lg text-center space-y-2 ${
                isDarkMode ? 'border-[#21313c] text-[#8899a6]' : 'border-[#d8e2dc] text-[#5c768d]'
              }`}
            >
              <GitBranch className="w-6 h-6 mx-auto opacity-50" />
              <p className="text-xs">No stages in pipeline yet.</p>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(true)}
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs border rounded transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-white hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#1c2d38] hover:bg-[#f4f7f5]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add first stage</span>
              </button>
            </div>
          ) : (
            stages.map((stg, i) => (
              <div
                key={i}
                className={`p-3.5 border rounded-md space-y-2.5 transition-colors ${
                  isDarkMode
                    ? 'bg-[#0f212e] border-[#21313c]'
                    : 'bg-[#fbfcfc] border-[#d8e2dc]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                      isDarkMode
                        ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                        : 'bg-[#f0f4f2] border-[#d8e2dc] text-[#5c768d]'
                    }`}>
                      Stage {i + 1}
                    </span>

                    {/* Change Stage Dropdown */}
                    <select
                      value={stg.stage}
                      onChange={(e) => handleStageTypeChange(i, e.target.value)}
                      className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border focus:outline-none cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#132733] border-[#21313c] text-white'
                          : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
                      }`}
                    >
                      {AVAILABLE_STAGES.map((s) => (
                        <option key={s.stage} value={s.stage}>
                          {s.stage}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => removeStage(i)}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        isDarkMode
                          ? 'text-[#8899a6] hover:text-red-400 hover:bg-red-950/40'
                          : 'text-[#8899a6] hover:text-[#c73e3e] hover:bg-[#edf2ef]'
                      }`}
                      title="Remove Stage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  value={stg.query}
                  onChange={(e) => {
                    const updated = [...stages];
                    updated[i].query = e.target.value;
                    setStages(updated);
                  }}
                  rows={3}
                  className={`w-full p-2.5 font-mono text-xs rounded border focus:outline-none leading-relaxed ${
                    isDarkMode
                      ? 'bg-[#08151e] border-[#21313c] text-white focus:border-[#5c768d]'
                      : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:border-[#001e2b]'
                  }`}
                />
              </div>
            ))
          )}
        </div>

        {/* Output Preview Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              Output Preview ({result.length} documents)
            </span>
            <span className={`text-[11px] font-mono ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              Status: 200 OK (3.4ms)
            </span>
          </div>
          <pre
            className={`p-4 border rounded-md text-xs font-mono h-96 overflow-auto leading-relaxed shadow-xs ${
              isDarkMode
                ? 'bg-[#08151e] border-[#21313c] text-[#e8edeb]'
                : 'bg-[#f8faf9] border-[#d8e2dc] text-[#1c2d38]'
            }`}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
