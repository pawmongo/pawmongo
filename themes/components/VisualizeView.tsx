'use client';

import React from 'react';
import Link from '@/lib/navigation';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Server,
  ChevronRight,
  ArrowLeft,
  Users,
  Building2,
  Calendar
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useDatabase } from '@/context/DatabaseContext';
import { MongoDocument } from '@/lib/mongodb-mock-data';

interface VisualizeViewProps {
  databaseName: string;
  collectionName: string;
  documents?: MongoDocument[];
}

export function VisualizeView({
  databaseName,
  collectionName,
  documents: suppliedDocuments,
}: VisualizeViewProps) {
  const { theme, triggerToast } = useDatabase();
  const [liveDocuments,setLiveDocuments]=React.useState<MongoDocument[]>([]);
  React.useEffect(()=>{let mounted=true;apiClient.getDocuments(databaseName,collectionName,{limit:1000}).then(data=>{if(mounted)setLiveDocuments(data.documents);}).catch(error=>triggerToast(error.message));return ()=>{mounted=false;};},[databaseName,collectionName]);
  const documents=suppliedDocuments ?? liveDocuments;
  const isDarkMode = theme === 'dark';

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

  // Employees total
  const totalEmployees = documents.reduce(
    (acc, d) => acc + (d.number_of_employees || 0),
    0
  );

  return (
    <div
      className={`flex-1 h-full flex flex-col font-sans select-text overflow-hidden transition-colors ${
        isDarkMode ? 'bg-[#001e2b] text-[#e8edeb]' : 'bg-[#f9fbfa] text-[#1c2d38]'
      }`}
    >
      {/* Breadcrumb Bar (No "Path:" text, NO green icons) */}
      <div
        className={`flex items-center justify-between px-6 py-2.5 border-b shrink-0 text-xs transition-colors ${
          isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="font-semibold hover:underline text-[#1c2d38] dark:text-[#e8edeb] flex items-center gap-1"
          >
            <Server className="w-3.5 h-3.5 text-[#5c768d]" />
            PawMongo
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8899a6] opacity-60" />
          <Link
            href={`/databases/${databaseName}`}
            className="font-medium hover:underline text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white"
          >
            {databaseName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8899a6] opacity-60" />
          <Link
            href={`/databases/${databaseName}/collections/${collectionName}`}
            className="font-medium hover:underline text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white"
          >
            {collectionName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8899a6] opacity-60" />
          <span className="font-semibold text-[#1c2d38] dark:text-white flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-[#0062d2]" />
            Visualize
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8899a6]">
          <span className="font-mono">{documents.length} analyzed documents</span>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header Banner with Back Link (Collection page button style, no green) */}
        <div
          className={`p-5 rounded-xl border transition-all ${
            isDarkMode
              ? 'bg-[#0b1a24] border-[#1c2d38]'
              : 'bg-white border-[#edf2ef] shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-[#132733] text-[#0062d2] border border-[#d8e2dc] dark:border-[#21313c] flex items-center justify-center shrink-0 shadow-xs">
                <BarChart3 className="w-6 h-6 text-[#0062d2]" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Visualize Your Data</h1>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  Distribution charts and aggregations for <code className="font-mono font-semibold">{databaseName}.{collectionName}</code>
                </p>
              </div>
            </div>

            <div>
              <Link
                href={`/databases/${databaseName}/collections/${collectionName}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#5c768d]" />
                <span>Back to Collection Documents</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick KPI stats (No green icons) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1">
              <Building2 className="w-4 h-4 text-[#5c768d]" />
              <span className="font-semibold uppercase text-[11px]">Total Companies</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight mt-1">
              {documents.length}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1 font-mono">sample dataset</div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1">
              <PieChart className="w-4 h-4 text-[#0062d2]" />
              <span className="font-semibold uppercase text-[11px]">Unique Categories</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight mt-1">
              {Object.keys(categoryCounts).length}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1 font-mono">distinct sectors</div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1">
              <Users className="w-4 h-4 text-[#7c3aed]" />
              <span className="font-semibold uppercase text-[11px]">Total Employees</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight mt-1">
              {totalEmployees.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1 font-mono">reported headcount</div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1">
              <Calendar className="w-4 h-4 text-[#d97706]" />
              <span className="font-semibold uppercase text-[11px]">Active Span</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight mt-1">2005 - 2024</div>
            <div className="text-[11px] text-[#8899a6] mt-1 font-mono">19 years represented</div>
          </div>
        </div>

        {/* Breakdown by Category and Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Breakdown by Category */}
          <div
            className={`p-5 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c2d38] dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#0062d2]" />
              <span>Category Distribution</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / documents.length) * 100);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono font-semibold text-[#1c2d38] dark:text-white">
                        {cat}
                      </span>
                      <span className="text-[#5c768d] dark:text-[#8899a6] font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#f0f4f2] dark:bg-[#132733] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-[#001e2b] dark:bg-[#38bdf8] rounded-full transition-all ${
                          pct >= 90 ? 'w-full' : pct >= 75 ? 'w-3/4' : pct >= 50 ? 'w-1/2' : pct >= 30 ? 'w-1/3' : pct >= 20 ? 'w-1/4' : 'w-1/6'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Founded Year Timeline */}
          <div
            className={`p-5 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c2d38] dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0062d2]" />
              <span>Founded Year Distribution</span>
            </h3>
            <div className="flex items-end gap-3 h-52 pt-4">
              {Object.entries(yearCounts)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([year, count]) => {
                  const maxCount = Math.max(...Object.values(yearCounts));
                  const heightPct = Math.round((count / maxCount) * 100);
                  return (
                    <div
                      key={year}
                      className="flex-1 flex flex-col items-center gap-1 h-full justify-end group"
                    >
                      <span className="text-[11px] font-semibold text-[#0062d2] dark:text-[#38bdf8] font-mono">
                        {count}
                      </span>
                      <div
                        className={`w-full bg-[#0062d2] dark:bg-[#38bdf8] hover:opacity-80 rounded-t transition-all min-h-[12px] ${
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
      </div>
    </div>
  );
}
