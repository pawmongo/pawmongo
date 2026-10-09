'use client';

import React from 'react';
import {
  Server,
  Database,
  Activity,
  HardDrive,
  Cpu,
  Clock,
  Layers,
  X,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { DatabaseMeta } from '@/lib/mongodb-mock-data';

interface OverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  databases: DatabaseMeta[];
  onSelectDatabase?: (dbName: string, collName: string) => void;
  onOpenCreateDatabase?: () => void;
  isDarkMode?: boolean;
}

export function OverviewModal({
  isOpen,
  onClose,
  databases,
  onSelectDatabase,
  onOpenCreateDatabase,
  isDarkMode = false,
}: OverviewModalProps) {
  if (!isOpen) return null;

  const totalCollections = databases.reduce((acc, db) => acc + db.collections.length, 0);
  const totalDocuments = databases.reduce(
    (acc, db) => acc + db.collections.reduce((cAcc, c) => cAcc + c.count, 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-3xl rounded-xl border shadow-2xl flex flex-col max-h-[88vh] overflow-hidden ${
          isDarkMode
            ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
            : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#001e2b] text-white flex items-center justify-center shadow-xs">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Overview · Cluster & Server</h2>
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#3b82f6]/15 text-[#0062d2] dark:text-[#38bdf8]">
                  <CheckCircle2 className="w-3 h-3 text-[#3b82f6]" />
                  Online (Primary)
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                MongoDB v7.0.5 Standalone Instance · localhost:27017
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isDarkMode
                ? 'hover:bg-[#132733] text-[#8899a6] hover:text-white'
                : 'hover:bg-[#e4ebf0] text-[#5c768d] hover:text-[#1c2d38]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats Cards */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`p-3.5 rounded-lg border ${
                isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-[#8899a6] mb-1">
                <Database className="w-3.5 h-3.5" />
                <span>Databases</span>
              </div>
              <div className="text-xl font-bold font-mono">{databases.length}</div>
            </div>

            <div
              className={`p-3.5 rounded-lg border ${
                isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-[#8899a6] mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Collections</span>
              </div>
              <div className="text-xl font-bold font-mono">{totalCollections}</div>
            </div>

            <div
              className={`p-3.5 rounded-lg border ${
                isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-[#8899a6] mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Documents</span>
              </div>
              <div className="text-xl font-bold font-mono">
                {totalDocuments.toLocaleString()}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-lg border ${
                isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-[#8899a6] mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Uptime</span>
              </div>
              <div className="text-sm font-bold font-mono mt-1">14d 6h 32m</div>
            </div>
          </div>

          {/* Database Breakdown Table */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8899a6]">
                Databases in this Cluster ({databases.length})
              </h3>
              {onOpenCreateDatabase && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateDatabase();
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0062d2] dark:text-[#38bdf8] hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Database</span>
                </button>
              )}
            </div>

            <div
              className={`rounded-lg border overflow-hidden ${
                isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#e4ebf0] bg-white'
              }`}
            >
              <table className="w-full text-xs text-left">
                <thead
                  className={`border-b font-semibold ${
                    isDarkMode ? 'bg-[#132733] border-[#21313c] text-[#8899a6]' : 'bg-[#f5f8f6] border-[#edf2ef] text-[#5c768d]'
                  }`}
                >
                  <tr>
                    <th className="py-2.5 px-4">Database Name</th>
                    <th className="py-2.5 px-4">Collections</th>
                    <th className="py-2.5 px-4">Primary Collection</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit font-mono">
                  {databases.map((db) => {
                    const firstColl = db.collections[0]?.name || 'none';
                    return (
                      <tr
                        key={db.name}
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-[#132733]/50' : 'hover:bg-[#f9fbfa]'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-sans font-semibold flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-[#5c768d]" />
                          <span>{db.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-[#8899a6]">
                          {db.collections.length} {db.collections.length === 1 ? 'collection' : 'collections'}
                        </td>
                        <td className="py-2.5 px-4 text-[#8899a6]">{firstColl}</td>
                        <td className="py-2.5 px-4 text-right">
                          {db.collections.length > 0 && onSelectDatabase && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectDatabase(db.name, firstColl);
                                onClose();
                              }}
                              className="px-2.5 py-1 text-[11px] font-sans font-medium rounded bg-[#001e2b] text-white hover:bg-[#005239] transition-colors cursor-pointer"
                            >
                              Explore
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end px-6 py-3.5 border-t shrink-0 ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#001e2b] hover:bg-[#005239] text-white shadow-xs transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
