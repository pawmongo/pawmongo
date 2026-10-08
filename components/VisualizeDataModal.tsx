'use client';

import React from 'react';
import { X, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { MongoDocument } from '@/lib/mongodb-mock-data';

interface VisualizeDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: MongoDocument[];
}

export function VisualizeDataModal({
  isOpen,
  onClose,
  documents,
}: VisualizeDataModalProps) {
  if (!isOpen) return null;

  // Category counts
  const categoryCounts: Record<string, number> = {};
  documents.forEach((d) => {
    const cat = d.category_code || 'other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Founded years
  const yearCounts: Record<string, number> = {};
  documents.forEach((d) => {
    if (d.founded_year) {
      yearCounts[d.founded_year] = (yearCounts[d.founded_year] || 0) + 1;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0b1a24] rounded-lg shadow-2xl border border-[#d8ece2] dark:border-[#1c2d38] w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edeb] dark:border-[#1c2d38]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0062d2] dark:text-[#38bdf8]" />
            <div>
              <h3 className="text-base font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Visualize Your Data</h3>
              <p className="text-xs text-[#5c768d] dark:text-[#8899a6] mt-0.5">
                Charts and distribution analysis for <span className="font-mono text-[#5c768d] dark:text-[#8899a6]">sample_training.companies</span>
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

        <div className="p-6 flex-1 overflow-auto space-y-6">
          {/* Top Breakdown by Category */}
          <div className="p-4 bg-white dark:bg-[#07131d] border border-[#e8edeb] dark:border-[#1c2d38] rounded-lg">
            <h4 className="text-xs font-semibold text-[#1c2d38] dark:text-[#e8edeb] mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#0062d2] dark:text-[#38bdf8]" />
              <span>Companies by Category Code</span>
            </h4>
            <div className="space-y-2.5">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / documents.length) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono font-medium text-[#1c2d38] dark:text-[#e8edeb]">{cat}</span>
                      <span className="text-[#5c768d] dark:text-[#8899a6]">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-[#f0f4f2] dark:bg-[#132733] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-[#0062d2] dark:bg-[#38bdf8] rounded-full transition-all ${
                          pct >= 90 ? 'w-full' : pct >= 75 ? 'w-3/4' : pct >= 50 ? 'w-1/2' : pct >= 30 ? 'w-1/3' : pct >= 20 ? 'w-1/4' : 'w-1/6'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Founded Year Distribution */}
          <div className="p-4 bg-white dark:bg-[#07131d] border border-[#e8edeb] dark:border-[#1c2d38] rounded-lg">
            <h4 className="text-xs font-semibold text-[#1c2d38] dark:text-[#e8edeb] mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0062d2] dark:text-[#38bdf8]" />
              <span>Founded Year Timeline</span>
            </h4>
            <div className="flex items-end gap-3 h-36 pt-4">
              {Object.entries(yearCounts)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([year, count]) => {
                  const maxCount = Math.max(...Object.values(yearCounts));
                  const heightPct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={year} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[11px] font-semibold text-[#0062d2] dark:text-[#38bdf8]">{count}</span>
                      <div
                        className={`w-full bg-[#0062d2]/80 dark:bg-[#38bdf8]/80 hover:bg-[#0062d2] dark:hover:bg-[#38bdf8] rounded-t transition-all min-h-[10px] ${
                          heightPct >= 90 ? 'h-[90%]' : heightPct >= 75 ? 'h-[75%]' : heightPct >= 50 ? 'h-[50%]' : heightPct >= 35 ? 'h-[35%]' : 'h-[20%]'
                        }`}
                        title={`${year}: ${count} companies`}
                      />
                      <span className="text-[10px] text-[#8899a6] font-mono mt-1">{year}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 bg-[#f9fbfa] dark:bg-[#07131d] border-t border-[#e8edeb] dark:border-[#1c2d38]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#001e2b] dark:bg-[#132733] hover:bg-[#112734] dark:hover:bg-[#1c3344] border border-transparent dark:border-[#21313c] rounded-md transition-colors shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
