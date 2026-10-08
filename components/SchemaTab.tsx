'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { MongoDocument, getFieldType } from '@/lib/mongodb-mock-data';
import { useDatabase } from '@/context/DatabaseContext';

interface SchemaTabProps {
  documents: MongoDocument[];
  isDarkMode?: boolean;
}

export function SchemaTab({ documents, isDarkMode: isDarkModeProp }: SchemaTabProps) {
  const { theme } = useDatabase();
  const isDarkMode = isDarkModeProp ?? (theme === 'dark');

  // Aggregate schema stats across documents
  const fieldStats: Record<string, { types: Record<string, number>; count: number }> = {};

  documents.forEach((doc) => {
    Object.entries(doc).forEach(([key, val]) => {
      const type = getFieldType(val);
      if (!fieldStats[key]) {
        fieldStats[key] = { types: {}, count: 0 };
      }
      fieldStats[key].count += 1;
      fieldStats[key].types[type] = (fieldStats[key].types[type] || 0) + 1;
    });
  });

  return (
    <div
      className={`border rounded-lg p-6 space-y-6 shadow-xs ${
        isDarkMode
          ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
          : 'bg-white border-[#e8edeb] text-[#1c2d38]'
      }`}
    >
      <div
        className={`flex items-center justify-between pb-4 border-b ${
          isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
        }`}
      >
        <div>
          <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
            Collection Schema Analysis
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
            Sampled across {documents.length} documents in{' '}
            <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
              companies
            </span>
          </p>
        </div>
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
            isDarkMode
              ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white hover:bg-[#1a3444]'
              : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38] hover:bg-[#f9fbfa]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Analyze Schema</span>
        </button>
      </div>

      <div className={`divide-y ${isDarkMode ? 'divide-[#1c2d38]' : 'divide-[#edf2ef]'}`}>
        {Object.entries(fieldStats)
          .sort(([a], [b]) => (a === '_id' ? -1 : b === '_id' ? 1 : a.localeCompare(b)))
          .map(([fieldName, stats]) => {
            const presencePct = Math.round((stats.count / documents.length) * 100);
            return (
              <div
                key={fieldName}
                className={`py-3.5 flex items-center justify-between px-2 -mx-2 rounded transition-colors ${
                  isDarkMode ? 'hover:bg-[#132733]/50' : 'hover:bg-[#fafcfb]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-medium text-xs ${
                        isDarkMode ? 'text-white' : 'text-[#1c2d38]'
                      }`}
                    >
                      {fieldName}
                    </span>
                    <span className="text-[11px] text-[#8899a6]">
                      ({presencePct}% of documents)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {Object.entries(stats.types).map(([typeName, count]) => {
                      const typePct = Math.round((count / stats.count) * 100);
                      return (
                        <span
                          key={typeName}
                          className={`px-2 py-0.5 text-[11px] font-mono rounded border ${
                            isDarkMode
                              ? 'bg-[#132733] text-[#38bdf8] border-[#21313c]'
                              : 'bg-[#f2f6f4] text-[#5c768d] border-[#d8ece2]'
                          }`}
                        >
                          {typeName} ({typePct}%)
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="w-48">
                  <div
                    className={`h-1.5 w-full rounded-full overflow-hidden ${
                      isDarkMode ? 'bg-[#132733]' : 'bg-[#f0f4f2]'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full ${
                        presencePct >= 95
                          ? 'w-full'
                          : presencePct >= 80
                          ? 'w-4/5'
                          : presencePct >= 65
                          ? 'w-2/3'
                          : presencePct >= 50
                          ? 'w-1/2'
                          : presencePct >= 30
                          ? 'w-1/3'
                          : presencePct >= 15
                          ? 'w-1/6'
                          : 'w-1/12'
                      } ${
                        isDarkMode ? 'bg-[#38bdf8]' : 'bg-[#0062d2]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
