'use client';

import React, { useState } from 'react';
import Link from '@/lib/navigation';
import {
  Server,
  Database,
  Activity,
  HardDrive,
  Clock,
  Layers,
  Plus,
  CheckCircle2,
  ChevronRight,
  Search,
  Radio,
  Folder,
  Eye,
  Download,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { DatabaseMeta } from '@/lib/mongodb-mock-data';
import { databaseExport, download } from '@/lib/data-export';
import { apiClient } from '@/lib/api-client';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function OverviewView() {
  const { databases, theme, setIsCreateDbModalOpen, dropDatabase, triggerToast, triggerLoading } = useDatabase();
  const isDarkMode = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [dbToDrop, setDbToDrop] = useState<string | null>(null);
  const [serverStats, setServerStats] = useState<{
    version: string;
    uptimeSeconds: number | null;
    connections: { current: number; available: number } | null;
  } | null>(null);

  React.useEffect(() => {
    apiClient.getServerOverview()
      .then((data) => {
        if (data) setServerStats(data);
      })
      .catch(() => {});
  }, []);

  const handleExportDb = async (db: DatabaseMeta) => {
    try { const data=await databaseExport(db.name,db.collections); download(JSON.stringify(data,null,2),`${db.name}_database_export.json`); triggerToast(`Exported database "${db.name}"`); }
    catch(error){triggerToast((error as Error).message);}
  };

  const totalCollections = databases.reduce((acc, db) => acc + db.collections.length, 0);
  const totalDocuments = databases.reduce(
    (acc, db) => acc + db.collections.reduce((cAcc, c) => cAcc + c.count, 0),
    0
  );
  const totalStorageBytes = databases.reduce(
    (acc, db) => acc + db.collections.reduce((cAcc, c) => cAcc + c.sizeBytes, 0),
    0
  );

  const filteredDatabases = databases.filter((db) =>
    db.name.toLowerCase().includes(searchTerm.toLowerCase())
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
            PawMongo
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8899a6] opacity-60" />
          <span className="font-semibold text-[#1c2d38] dark:text-white flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#5c768d]" />
            Overview
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8899a6]">
          <span className="flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#132733] text-[#5c768d] dark:text-[#8899a6]">
            Online (Primary)
          </span>
          <span>v{serverStats?.version || "—"}</span>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Server & Cluster Banner */}
        <div
          className={`p-5 rounded-xl border transition-all ${
            isDarkMode
              ? 'bg-[#0b1a24] border-[#1c2d38]'
              : 'bg-white border-[#edf2ef] shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-[#132733] text-[#1c2d38] dark:text-white border border-[#d8e2dc] dark:border-[#21313c] flex items-center justify-center shrink-0 shadow-xs">
                <Server className="w-6 h-6 text-[#5c768d]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight">Overview · Cluster & Server</h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-[#132733] text-[#5c768d] dark:text-[#8899a6]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5c768d]" />
                    Primary Standalone
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  MongoDB v{serverStats?.version || "—"} · Host: <code className="font-mono font-semibold">localhost:27017</code> · Storage Engine: <span className="font-medium text-[#1c2d38] dark:text-white">WiredTiger</span>
                </p>
              </div>
            </div>

            {/* Create Database */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCreateDbModalOpen(true)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-[#5c768d]" />
                <span>Create Database</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards (No green icons) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Databases */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1.5">
              <Database className="w-4 h-4 text-[#5c768d]" />
              <span className="font-medium">Databases</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">{databases.length}</div>
            <div className="text-[11px] text-[#8899a6] mt-1">all active</div>
          </div>

          {/* Collections */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1.5">
              <Layers className="w-4 h-4 text-[#5c768d]" />
              <span className="font-medium">Collections</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">{totalCollections}</div>
            <div className="text-[11px] text-[#8899a6] mt-1">across cluster</div>
          </div>

          {/* Documents */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1.5">
              <HardDrive className="w-4 h-4 text-[#5c768d]" />
              <span className="font-medium">Documents</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">
              {totalDocuments.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1">total records</div>
          </div>

          {/* Storage Size */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1.5">
              <Activity className="w-4 h-4 text-[#5c768d]" />
              <span className="font-medium">Storage Size</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">
              {formatBytes(totalStorageBytes)}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1">uncompressed</div>
          </div>

          {/* Uptime */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1.5">
              <Clock className="w-4 h-4 text-[#5c768d]" />
              <span className="font-medium">Uptime</span>
            </div>
            <div className="text-xl font-bold font-mono tracking-tight mt-0.5">
              {serverStats?.uptimeSeconds != null ? `${Math.floor(serverStats.uptimeSeconds / 86400)}d ${Math.floor((serverStats.uptimeSeconds % 86400) / 3600)}h` : '—'}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1">
              v{serverStats?.version || '—'}
            </div>
          </div>

          {/* Connections */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1.5">
              <Radio className="w-4 h-4 text-[#5c768d]" />
              <span className="font-medium">Connections</span>
            </div>
            <div className="text-xl font-bold font-mono tracking-tight mt-0.5">
              {serverStats?.connections ? `${serverStats.connections.current} / ${serverStats.connections.available + serverStats.connections.current}` : '—'}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1">Live connection metrics</div>
          </div>
        </div>

        {/* Databases Table Section */}
        <div
          className={`rounded-xl border overflow-hidden transition-all ${
            isDarkMode
              ? 'bg-[#0b1a24] border-[#1c2d38]'
              : 'bg-white border-[#edf2ef] shadow-xs'
          }`}
        >
          {/* Table Header Controls */}
          <div
            className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#fafcfb]'
            }`}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8899a6]">
                Databases in Cluster ({databases.length})
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8899a6] absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter databases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-48 sm:w-60 pl-8 pr-2.5 py-1 text-xs border rounded placeholder-[#8899a6] focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#5c768d]'
                      : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsCreateDbModalOpen(true)}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-[#5c768d]" />
                <span>New Database</span>
              </button>
            </div>
          </div>

          {/* Databases Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead
                className={`border-b font-semibold ${
                  isDarkMode
                    ? 'bg-[#132733]/60 border-[#21313c] text-[#8899a6]'
                    : 'bg-[#f5f8f6] border-[#edf2ef] text-[#5c768d]'
                }`}
              >
                <tr>
                  <th className="py-3 px-5">Database Name</th>
                  <th className="py-3 px-5">Collections</th>
                  <th className="py-3 px-5">Total Documents</th>
                  <th className="py-3 px-5">Storage Size</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-[#1c2d38]' : 'divide-[#edf2ef]'}`}>
                {filteredDatabases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#8899a6] italic">
                      No databases matching &quot;{searchTerm}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredDatabases.map((db) => {
                    const dbDocs = db.collections.reduce((acc, c) => acc + c.count, 0);
                    const dbBytes = db.collections.reduce((acc, c) => acc + c.sizeBytes, 0);
                    const dbHref = `/databases/${encodeURIComponent(db.name)}`;

                    return (
                      <tr
                        key={db.name}
                        className={`transition-colors group ${
                          isDarkMode ? 'hover:bg-[#132733] text-[#e8edeb]' : 'hover:bg-[#f0f5f2] text-[#1c2d38]'
                        }`}
                      >
                        {/* Name (High contrast on hover) */}
                        <td className="py-3.5 px-5 font-medium">
                          <Link
                            href={dbHref}
                            className={`flex items-center gap-2.5 text-left hover:underline cursor-pointer transition-colors ${
                              isDarkMode ? 'text-[#e8edeb] group-hover:text-white' : 'text-[#1c2d38] group-hover:text-[#0062d2]'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                isDarkMode
                                  ? 'bg-[#132733] border-[#21313c] text-[#8899a6] group-hover:text-white group-hover:border-[#38bdf8]/40'
                                  : 'bg-neutral-100 border-[#d8e2dc] text-[#5c768d] group-hover:text-[#0062d2] group-hover:border-[#0062d2]/40'
                              }`}
                            >
                              <Database className="w-3.5 h-3.5 transition-colors" />
                            </div>
                            <span
                              className={`font-bold text-sm block transition-colors ${
                                isDarkMode ? 'text-[#e8edeb] group-hover:text-white' : 'text-[#1c2d38] group-hover:text-[#0062d2]'
                              }`}
                            >
                              {db.name}
                            </span>
                          </Link>
                        </td>

                        {/* Collections (Total Number) */}
                        <td
                          className={`py-3.5 px-5 font-mono font-medium transition-colors ${
                            isDarkMode ? 'text-[#e8edeb] group-hover:text-white' : 'text-[#1c2d38] group-hover:text-black'
                          }`}
                        >
                          {db.collections.length}
                        </td>

                        {/* Documents */}
                        <td
                          className={`py-3.5 px-5 font-mono font-medium transition-colors ${
                            isDarkMode ? 'text-[#e8edeb] group-hover:text-white' : 'text-[#1c2d38] group-hover:text-black'
                          }`}
                        >
                          {dbDocs.toLocaleString()}
                        </td>

                        {/* Size */}
                        <td
                          className={`py-3.5 px-5 font-mono transition-colors ${
                            isDarkMode ? 'text-[#8899a6] group-hover:text-[#e8edeb]' : 'text-[#5c768d] group-hover:text-[#1c2d38]'
                          }`}
                        >
                          {formatBytes(dbBytes)}
                        </td>

                        {/* Actions: View, Download, Delete icons (High contrast on hover) */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View icon */}
                            <Link
                              href={dbHref}
                              className={`p-1.5 rounded transition-all cursor-pointer inline-flex items-center justify-center ${
                                isDarkMode
                                  ? 'text-[#8899a6] hover:text-white hover:bg-[#1c3344]'
                                  : 'text-[#5c768d] hover:text-[#0062d2] hover:bg-[#e8f1fb]'
                              }`}
                              title={`View ${db.name} database`}
                            >
                              <Eye className="w-4 h-4 transition-colors" />
                            </Link>

                            {/* Download icon */}
                            <button
                              type="button"
                              onClick={() => handleExportDb(db)}
                              className={`p-1.5 rounded transition-all cursor-pointer inline-flex items-center justify-center ${
                                isDarkMode
                                  ? 'text-[#8899a6] hover:text-white hover:bg-[#1c3344]'
                                  : 'text-[#5c768d] hover:text-[#0062d2] hover:bg-[#e8f1fb]'
                              }`}
                              title={`Download ${db.name} database export`}
                            >
                              <Download className="w-4 h-4 transition-colors" />
                            </button>

                            {/* Delete icon */}
                            <button
                              type="button"
                              onClick={() => setDbToDrop(db.name)}
                              className={`p-1.5 rounded transition-all cursor-pointer inline-flex items-center justify-center ${
                                isDarkMode
                                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              }`}
                              title={`Delete ${db.name} database`}
                            >
                              <Trash2 className="w-4 h-4 transition-colors" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm Drop Database Dialog */}
      {dbToDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden ${
              isDarkMode
                ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
                : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-3.5 border-b ${
                isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
              }`}
            >
              <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Drop Database</span>
              </div>
              <button
                type="button"
                onClick={() => setDbToDrop(null)}
                className="text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs">
                Are you sure you want to drop database <strong className="font-mono text-red-500">{dbToDrop}</strong>?
                All collections and documents in this database will be permanently deleted.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDbToDrop(null)}
                  className={`px-3 py-1.5 text-xs border rounded transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                      : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (dbToDrop) { try { await dropDatabase(dbToDrop); setDbToDrop(null); } catch {} }
                  }}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  Drop Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
