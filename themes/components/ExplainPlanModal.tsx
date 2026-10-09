'use client';

import React from 'react';
import { apiClient } from '@/lib/api-client';
import { useDatabase } from '@/context/DatabaseContext';
import { X, CheckCircle2, Zap, Database, ArrowRight } from 'lucide-react';

interface ExplainPlanModalProps {
  selectedDb: string;
  selectedCollection: string;
  isOpen: boolean;
  onClose: () => void;
  query: string;
  totalMatched: number;
}

export function ExplainPlanModal({
  isOpen,
  selectedDb, selectedCollection,
  onClose,
  query,
  totalMatched,
}: ExplainPlanModalProps) {
  const [explain,setExplain]=React.useState<any>(null);
  const {triggerToast}=useDatabase();
  React.useEffect(()=>{if(!isOpen)return;let mounted=true;setExplain(null);apiClient.collectionTool(selectedDb,selectedCollection,{action:'explain',query}).then(data=>{if(mounted)setExplain(data.explain);}).catch(error=>triggerToast(error.message));return ()=>{mounted=false;};},[isOpen,selectedDb,selectedCollection,query]);
  const plan=explain?.queryPlanner?.winningPlan?.queryPlan || explain?.queryPlanner?.winningPlan;
  const scan=plan?.inputStage || plan;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0b1a24] rounded-lg shadow-2xl border border-[#d8ece2] dark:border-[#1c2d38] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edeb] dark:border-[#1c2d38]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#5c768d] dark:text-[#38bdf8]" />
            <div>
              <h3 className="text-base font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Query Explain Plan</h3>
              <p className="text-xs text-[#5c768d] dark:text-[#8899a6] mt-0.5">
                Execution stats and index evaluation for current filter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white rounded-md hover:bg-[#edf2ef] dark:hover:bg-[#132733] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-[#f6faf8] dark:bg-[#132733] border border-[#d8ece2] dark:border-[#21313c] rounded-md">
              <span className="block text-[11px] text-[#5c768d] dark:text-[#8899a6] uppercase tracking-wide">Stage</span>
              <strong className="text-sm font-semibold text-[#5c768d] dark:text-[#38bdf8]">{scan?.stage || "—"}</strong>
            </div>
            <div className="p-3 bg-[#f6faf8] dark:bg-[#132733] border border-[#d8ece2] dark:border-[#21313c] rounded-md">
              <span className="block text-[11px] text-[#5c768d] dark:text-[#8899a6] uppercase tracking-wide">Execution Time</span>
              <strong className="text-sm font-semibold text-[#1c2d38] dark:text-[#e8edeb]">{explain?.executionStats?.executionTimeMillis ?? "—"} ms</strong>
            </div>
            <div className="p-3 bg-[#f6faf8] dark:bg-[#132733] border border-[#d8ece2] dark:border-[#21313c] rounded-md">
              <span className="block text-[11px] text-[#5c768d] dark:text-[#8899a6] uppercase tracking-wide">Docs Returned</span>
              <strong className="text-sm font-semibold text-[#1c2d38] dark:text-[#e8edeb]">{explain?.executionStats?.nReturned ?? "—"}</strong>
            </div>
            <div className="p-3 bg-[#f6faf8] dark:bg-[#132733] border border-[#d8ece2] dark:border-[#21313c] rounded-md">
              <span className="block text-[11px] text-[#5c768d] dark:text-[#8899a6] uppercase tracking-wide">Keys Examined</span>
              <strong className="text-sm font-semibold text-[#1c2d38] dark:text-[#e8edeb]">{explain?.executionStats?.totalKeysExamined ?? "—"}</strong>
            </div>
          </div>

          {/* Visual Execution Tree */}
          <div className="p-4 bg-[#f9fbfa] dark:bg-[#07131d] border border-[#edf2ef] dark:border-[#1c2d38] rounded-md">
            <h4 className="text-xs font-semibold text-[#1c2d38] dark:text-[#e8edeb] mb-3 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#5c768d] dark:text-[#8899a6]" />
              <span>Query Execution Pipeline</span>
            </h4>
            <div className="flex items-center gap-3 text-xs">
              <div className="p-2.5 bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded shadow-xs">
                <span className="font-semibold text-[#5c768d] dark:text-[#38bdf8]">{scan?.stage || "—"}</span>
                <p className="text-[11px] text-[#8899a6]">{scan?.indexName || "Collection scan"}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#8899a6]" />
              <div className="p-2.5 bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded shadow-xs">
                <span className="font-semibold text-[#1c2d38] dark:text-[#e8edeb]">{plan?.stage || "—"}</span>
                <p className="text-[11px] text-[#8899a6]">Retrieve matching docs</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#8899a6]" />
              <div className="p-2.5 bg-white dark:bg-[#132733] border border-[#d8e2dc] dark:border-[#21313c] rounded shadow-xs">
                <span className="font-semibold text-[#1c2d38] dark:text-[#e8edeb]">PROJECTION</span>
                <p className="text-[11px] text-[#8899a6]">Default fields projected</p>
              </div>
            </div>
          </div>

          {/* Raw JSON explain output */}
          <div>
            <h4 className="text-xs font-semibold text-[#5c768d] dark:text-[#8899a6] mb-1.5">Raw Explain Output:</h4>
            <pre className="p-3 bg-[#f8faf9] dark:bg-[#07131d] border border-[#d8e2dc] dark:border-[#21313c] text-[#1c2d38] dark:text-[#e8edeb] rounded-md text-xs font-mono max-h-48 overflow-auto leading-relaxed">
{JSON.stringify(explain, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 bg-[#f9fbfa] dark:bg-[#07131d] border-t border-[#e8edeb] dark:border-[#1c2d38]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#001e2b] dark:bg-[#132733] hover:bg-[#112734] dark:hover:bg-[#1c3344] border border-transparent dark:border-[#21313c] rounded-md transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
