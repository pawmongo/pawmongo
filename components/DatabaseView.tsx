'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Database,
  Layers,
  HardDrive,
  Activity,
  Plus,
  Trash2,
  Folder,
  ChevronRight,
  Search,
  ArrowRight,
  Server,
  AlertTriangle,
  X,
  CheckCircle2,
  FileText,
  Upload,
  Download,
  FileCode,
  FileUp,
  FileDown,
  Eye
} from 'lucide-react';
import { DatabaseMeta } from '@/lib/mongodb-mock-data';
import { useDatabase } from '@/context/DatabaseContext';

interface DatabaseViewProps {
  database: DatabaseMeta;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function DatabaseView({ database }: DatabaseViewProps) {
  const router = useRouter();
  const { theme, createCollection, dropCollection, dropDatabase, triggerToast, triggerLoading } = useDatabase();
  const isDarkMode = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateCollOpen, setIsCreateCollOpen] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [confirmDropDb, setConfirmDropDb] = useState(false);
  const [dropCollTarget, setDropCollTarget] = useState<string | null>(null);

  // Import / Export Database Modals
  const [isImportDbOpen, setIsImportDbOpen] = useState(false);
  const [importDbText, setImportDbText] = useState('');
  const [isExportDbOpen, setIsExportDbOpen] = useState(false);
  const [exportDbFormat, setExportDbFormat] = useState<'json' | 'archive'>('json');

  // Export Collection Modal
  const [exportCollTarget, setExportCollTarget] = useState<string | null>(null);
  const [exportCollFormat, setExportCollFormat] = useState<'json' | 'csv' | 'ndjson'>('json');

  const totalDocuments = database.collections.reduce((acc, c) => acc + c.count, 0);
  const totalSizeBytes = database.collections.reduce((acc, c) => acc + c.sizeBytes, 0);
  const totalIndexes = database.collections.reduce((acc, c) => acc + c.indexes, 0);
  const avgObjSize =
    database.collections.length > 0
      ? Math.round(
          database.collections.reduce((acc, c) => acc + c.avgObjSize, 0) /
            database.collections.length
        )
      : 0;

  const filteredCollections = database.collections.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollName.trim()) return;
    createCollection(database.name, newCollName.trim());
    const coll = newCollName.trim();
    setNewCollName('');
    setIsCreateCollOpen(false);
    router.push(`/databases/${encodeURIComponent(database.name)}/collections/${encodeURIComponent(coll)}`);
  };

  const handleDropDbConfirm = () => {
    dropDatabase(database.name);
    setConfirmDropDb(false);
    router.push('/');
  };

  const handleImportDatabaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importDbText.trim()) return;
    try {
      triggerLoading?.(450, `Importing database "${database.name}" collections...`);
      const parsed = JSON.parse(importDbText);
      if (Array.isArray(parsed)) {
        createCollection(database.name, `imported_${Date.now().toString().slice(-4)}`);
      } else if (typeof parsed === 'object') {
        Object.keys(parsed).forEach((coll) => {
          createCollection(database.name, coll);
        });
      }
      triggerToast(`Database "${database.name}" imported successfully`);
      setIsImportDbOpen(false);
      setImportDbText('');
    } catch {
      triggerToast('Invalid JSON structure. Please check input syntax.');
    }
  };

  const handleExportDatabaseDownload = () => {
    triggerLoading?.(350, `Exporting database "${database.name}"...`);
    const data = {
      database: database.name,
      exportDate: new Date().toISOString(),
      collections: database.collections.map((c) => ({
        name: c.name,
        count: c.count,
        sizeBytes: c.sizeBytes,
        indexes: c.indexes,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${database.name}_database_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportDbOpen(false);
    triggerToast(`Exported database "${database.name}" (${database.collections.length} collections)`);
  };

  const handleExportCollectionDownload = () => {
    if (!exportCollTarget) return;
    triggerLoading?.(350, `Exporting collection "${exportCollTarget}"...`);
    const collMeta = database.collections.find((c) => c.name === exportCollTarget);
    const data = {
      database: database.name,
      collection: exportCollTarget,
      count: collMeta?.count || 0,
      exportDate: new Date().toISOString(),
      format: exportCollFormat,
      documents: [
        { _id: '52cdef7c4bab8bd675297d8a', sampleField: 'Sample Document Record 1', collection: exportCollTarget },
        { _id: '52cdef7c4bab8bd675297d8b', sampleField: 'Sample Document Record 2', collection: exportCollTarget }
      ]
    };
    const content = exportCollFormat === 'csv'
      ? `_id,sampleField,collection\n52cdef7c4bab8bd675297d8a,"Sample Document Record 1",${exportCollTarget}\n52cdef7c4bab8bd675297d8b,"Sample Document Record 2",${exportCollTarget}`
      : JSON.stringify(data, null, 2);

    const blob = new Blob([content], { type: exportCollFormat === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${database.name}_${exportCollTarget}_entire_collection.${exportCollFormat === 'csv' ? 'csv' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast(`Exported entire collection "${exportCollTarget}"`);
    setExportCollTarget(null);
  };

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
            className="font-semibold hover:underline text-[#1c2d38] dark:text-[#e8edeb] flex items-center gap-1 cursor-pointer"
          >
            <Server className="w-3.5 h-3.5 text-[#5c768d]" />
            phpMongo
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8899a6] opacity-60" />
          <span className="font-semibold text-[#1c2d38] dark:text-white flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#5c768d]" />
            {database.name}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8899a6]">
          <span className="flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#132733] text-[#5c768d] dark:text-[#8899a6]">
            Active Database
          </span>
          <span className="font-mono">{database.collections.length} collections</span>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Database Header Card */}
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
                <Database className="w-6 h-6 text-[#5c768d]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight">Database: {database.name}</h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-[#132733] text-[#5c768d] dark:text-[#8899a6]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5c768d]" />
                    Read & Write
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  Cluster: <span className="font-medium text-[#1c2d38] dark:text-white">localhost:27017</span> · Namespace: <code className="font-mono">{database.name}.*</code>
                </p>
              </div>
            </div>

            {/* Toolbar Buttons - EXACT collection page button style! */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Create Collection */}
              <button
                type="button"
                onClick={() => setIsCreateCollOpen(true)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-[#5c768d]" />
                <span>Create Collection</span>
              </button>

              {/* Import Database */}
              <button
                type="button"
                onClick={() => setIsImportDbOpen(true)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                }`}
                title="Import database collections and documents"
              >
                <FileUp className="w-3.5 h-3.5 text-[#5c768d]" />
                <span>Import Database</span>
              </button>

              {/* Export Database */}
              <button
                type="button"
                onClick={() => setIsExportDbOpen(true)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                }`}
                title="Export all database collections as JSON or archive"
              >
                <FileDown className="w-3.5 h-3.5 text-[#5c768d]" />
                <span>Export Database</span>
              </button>

              {/* Drop Database */}
              <button
                type="button"
                onClick={() => setConfirmDropDb(true)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'border-[#21313c] text-red-400 hover:bg-red-500/10'
                    : 'border-[#d8e2dc] text-red-600 hover:bg-red-50'
                }`}
                title="Drop this database"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Drop Database</span>
              </button>
            </div>
          </div>
        </div>

        {/* Database Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
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
            <div className="text-2xl font-bold font-mono tracking-tight">
              {database.collections.length}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1">in this database</div>
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
            <div className="text-[11px] text-[#8899a6] mt-1">across collections</div>
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
              {formatBytes(totalSizeBytes)}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1">data storage</div>
          </div>

          {/* Avg Object Size */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1.5">
              <FileText className="w-4 h-4 text-[#5c768d]" />
              <span className="font-medium">Avg Doc Size</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">
              {formatBytes(avgObjSize)}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1">average per doc</div>
          </div>

          {/* Indexes */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1.5">
              <Activity className="w-4 h-4 text-[#5c768d]" />
              <span className="font-medium">Total Indexes</span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight">{totalIndexes}</div>
            <div className="text-[11px] text-[#8899a6] mt-1">B-Tree indexes</div>
          </div>
        </div>

        {/* Collections Table Section (Table view of all collections) */}
        <div
          className={`rounded-xl border overflow-hidden transition-all ${
            isDarkMode
              ? 'bg-[#0b1a24] border-[#1c2d38]'
              : 'bg-white border-[#edf2ef] shadow-xs'
          }`}
        >
          {/* Header & Filter Controls */}
          <div
            className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#fafcfb]'
            }`}
          >
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#8899a6]">
                Collections in {database.name} ({database.collections.length})
              </h2>
              <p className="text-[11px] text-[#8899a6] mt-0.5">
                All collections listed in table view. Each collection can be explored or exported directly.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8899a6] absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter collections..."
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
                onClick={() => setIsCreateCollOpen(true)}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-[#5c768d]" />
                <span>New Collection</span>
              </button>
            </div>
          </div>

          {/* Table View of all collections */}
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
                  <th className="py-3 px-5">Collection Name</th>
                  <th className="py-3 px-5">Documents</th>
                  <th className="py-3 px-5">Storage Size</th>
                  <th className="py-3 px-5">Avg Object Size</th>
                  <th className="py-3 px-5">Indexes</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-[#1c2d38]' : 'divide-[#edf2ef]'}`}>
                {filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8899a6] italic">
                      {database.collections.length === 0
                        ? 'No collections in this database. Click "+ Create Collection" above to add one.'
                        : `No collections matching "${searchTerm}"`}
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((coll) => {
                    const collHref = `/databases/${encodeURIComponent(database.name)}/collections/${encodeURIComponent(coll.name)}`;
                    return (
                      <tr
                        key={coll.name}
                        className={`transition-colors group ${
                          isDarkMode ? 'hover:bg-[#132733] text-[#e8edeb]' : 'hover:bg-[#f0f5f2] text-[#1c2d38]'
                        }`}
                      >
                        {/* Name (High contrast on hover) */}
                        <td className="py-3.5 px-5 font-medium">
                          <Link
                            href={collHref}
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
                              <Folder className="w-3.5 h-3.5 transition-colors" />
                            </div>
                            <span
                              className={`font-bold text-sm block transition-colors ${
                                isDarkMode ? 'text-[#e8edeb] group-hover:text-white' : 'text-[#1c2d38] group-hover:text-[#0062d2]'
                              }`}
                            >
                              {coll.name}
                            </span>
                          </Link>
                        </td>

                        {/* Documents */}
                        <td
                          className={`py-3.5 px-5 font-mono font-medium transition-colors ${
                            isDarkMode ? 'text-[#e8edeb] group-hover:text-white' : 'text-[#1c2d38] group-hover:text-black'
                          }`}
                        >
                          {coll.count.toLocaleString()}
                        </td>

                        {/* Storage Size */}
                        <td
                          className={`py-3.5 px-5 font-mono transition-colors ${
                            isDarkMode ? 'text-[#8899a6] group-hover:text-[#e8edeb]' : 'text-[#5c768d] group-hover:text-[#1c2d38]'
                          }`}
                        >
                          {formatBytes(coll.sizeBytes)}
                        </td>

                        {/* Avg Size */}
                        <td
                          className={`py-3.5 px-5 font-mono transition-colors ${
                            isDarkMode ? 'text-[#8899a6] group-hover:text-[#e8edeb]' : 'text-[#5c768d] group-hover:text-[#1c2d38]'
                          }`}
                        >
                          {formatBytes(coll.avgObjSize)}
                        </td>

                        {/* Indexes */}
                        <td className="py-3.5 px-5 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-[11px] border transition-colors ${
                              isDarkMode
                                ? 'bg-[#132733] border-[#21313c] text-white group-hover:border-[#38bdf8]/40'
                                : 'bg-[#f0f4f2] border-[#d8e2dc] text-[#1c2d38] group-hover:border-[#0062d2]/40'
                            }`}
                          >
                            {coll.indexes} {coll.indexes === 1 ? 'index' : 'indexes'}
                          </span>
                        </td>

                        {/* Actions: View Collections, Export, Delete as icon (High contrast on hover) */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View collections icon */}
                            <Link
                              href={collHref}
                              className={`p-1.5 rounded transition-all cursor-pointer inline-flex items-center justify-center ${
                                isDarkMode
                                  ? 'text-[#8899a6] hover:text-white hover:bg-[#1c3344]'
                                  : 'text-[#5c768d] hover:text-[#0062d2] hover:bg-[#e8f1fb]'
                              }`}
                              title={`View collection ${coll.name}`}
                              aria-label={`View collection ${coll.name}`}
                            >
                              <Eye className="w-4 h-4 transition-colors" />
                            </Link>

                            {/* Export collection icon */}
                            <button
                              type="button"
                              onClick={() => setExportCollTarget(coll.name)}
                              className={`p-1.5 rounded transition-all cursor-pointer inline-flex items-center justify-center ${
                                isDarkMode
                                  ? 'text-[#8899a6] hover:text-white hover:bg-[#1c3344]'
                                  : 'text-[#5c768d] hover:text-[#0062d2] hover:bg-[#e8f1fb]'
                              }`}
                              title={`Export entire collection ${coll.name}`}
                              aria-label={`Export collection ${coll.name}`}
                            >
                              <Download className="w-4 h-4 transition-colors" />
                            </button>

                            {/* Delete collection icon */}
                            <button
                              type="button"
                              onClick={() => setDropCollTarget(coll.name)}
                              className={`p-1.5 rounded transition-all cursor-pointer inline-flex items-center justify-center ${
                                isDarkMode
                                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              }`}
                              title={`Delete collection ${coll.name}`}
                              aria-label={`Delete collection ${coll.name}`}
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

      {/* Create Collection Dialog Modal */}
      {isCreateCollOpen && (
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
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#5c768d]" />
                <h3 className="font-bold text-sm">Create New Collection</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCollOpen(false)}
                className="text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollectionSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8899a6] mb-1">
                  DATABASE
                </label>
                <input
                  type="text"
                  disabled
                  value={database.name}
                  className="w-full px-3 py-1.5 text-xs bg-neutral-100 dark:bg-[#132733]/50 border border-neutral-300 dark:border-[#21313c] rounded text-[#8899a6] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  COLLECTION NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. users, products, orders"
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs border rounded font-mono focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#5c768d]'
                      : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCollOpen(false)}
                  className={`px-3 py-1.5 text-xs border rounded transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                      : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCollName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#001e2b] dark:bg-[#132733] text-white hover:bg-[#112734] dark:hover:bg-[#1a3444] border border-[#001e2b] dark:border-[#21313c] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Database Modal */}
      {isImportDbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden ${
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
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 text-[#5c768d]" />
                <h3 className="font-bold text-sm">Import Database ({database.name})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportDbOpen(false)}
                className="text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportDatabaseSubmit} className="p-5 space-y-4">
              <p className="text-xs text-[#8899a6]">
                Upload or paste a JSON dump array of collections/documents to import into <strong>{database.name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  JSON DUMP / BSON DATA
                </label>
                <textarea
                  rows={7}
                  placeholder={`{\n  "collection_name": [\n    { "title": "Example Doc", "status": "active" }\n  ]\n}`}
                  value={importDbText}
                  onChange={(e) => setImportDbText(e.target.value)}
                  className={`w-full p-3 font-mono text-xs border rounded focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#5c768d]'
                      : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                    : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                }`}>
                  <Upload className="w-3.5 h-3.5 text-[#5c768d]" />
                  <span>Choose File (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setImportDbText(String(evt.target?.result || ''));
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportDbOpen(false)}
                    className={`px-3 py-1.5 text-xs border rounded transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                        : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!importDbText.trim()}
                    className="px-4 py-1.5 text-xs font-semibold rounded bg-[#001e2b] dark:bg-[#132733] text-white hover:bg-[#112734] dark:hover:bg-[#1a3444] border border-[#001e2b] dark:border-[#21313c] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  >
                    Import Database
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Database Modal */}
      {isExportDbOpen && (
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
              <div className="flex items-center gap-2">
                <FileDown className="w-4 h-4 text-[#5c768d]" />
                <h3 className="font-bold text-sm">Export Database ({database.name})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportDbOpen(false)}
                className="text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-[#8899a6]">
                Export all {database.collections.length} collections and documents from <strong>{database.name}</strong> as structured data.
              </p>

              <div>
                <label className="block text-xs font-semibold mb-2">EXPORT FORMAT</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportDbFormat('json')}
                    className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      exportDbFormat === 'json'
                        ? 'border-[#001e2b] dark:border-white bg-[#f0f4f2] dark:bg-[#1a3344] font-semibold'
                        : 'border-[#d8e2dc] dark:border-[#21313c]'
                    }`}
                  >
                    <span className="block font-bold">JSON Dump</span>
                    <span className="text-[11px] text-[#8899a6]">Single JSON file of all collections</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportDbFormat('archive')}
                    className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      exportDbFormat === 'archive'
                        ? 'border-[#001e2b] dark:border-white bg-[#f0f4f2] dark:bg-[#1a3344] font-semibold'
                        : 'border-[#d8e2dc] dark:border-[#21313c]'
                    }`}
                  >
                    <span className="block font-bold">Archive Package</span>
                    <span className="text-[11px] text-[#8899a6]">Full schema & collection metadata</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportDbOpen(false)}
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
                  onClick={handleExportDatabaseDownload}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#001e2b] dark:bg-[#132733] text-white hover:bg-[#112734] dark:hover:bg-[#1a3444] border border-[#001e2b] dark:border-[#21313c] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Entire Collection Modal */}
      {exportCollTarget && (
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
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#5c768d]" />
                <h3 className="font-bold text-sm">Export Entire Collection: {exportCollTarget}</h3>
              </div>
              <button
                type="button"
                onClick={() => setExportCollTarget(null)}
                className="text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-[#8899a6]">
                Download all documents in collection <strong>{exportCollTarget}</strong> ({database.name}) in your chosen format.
              </p>

              <div>
                <label className="block text-xs font-semibold mb-2">OUTPUT FORMAT</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportCollFormat('json')}
                    className={`p-2.5 rounded-lg border text-center text-xs transition-colors cursor-pointer ${
                      exportCollFormat === 'json'
                        ? 'border-[#001e2b] dark:border-white bg-[#f0f4f2] dark:bg-[#1a3344] font-bold'
                        : 'border-[#d8e2dc] dark:border-[#21313c]'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportCollFormat('csv')}
                    className={`p-2.5 rounded-lg border text-center text-xs transition-colors cursor-pointer ${
                      exportCollFormat === 'csv'
                        ? 'border-[#001e2b] dark:border-white bg-[#f0f4f2] dark:bg-[#1a3344] font-bold'
                        : 'border-[#d8e2dc] dark:border-[#21313c]'
                    }`}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportCollFormat('ndjson')}
                    className={`p-2.5 rounded-lg border text-center text-xs transition-colors cursor-pointer ${
                      exportCollFormat === 'ndjson'
                        ? 'border-[#001e2b] dark:border-white bg-[#f0f4f2] dark:bg-[#1a3344] font-bold'
                        : 'border-[#d8e2dc] dark:border-[#21313c]'
                    }`}
                  >
                    NDJSON
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExportCollTarget(null)}
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
                  onClick={handleExportCollectionDownload}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#001e2b] dark:bg-[#132733] text-white hover:bg-[#112734] dark:hover:bg-[#1a3444] border border-[#001e2b] dark:border-[#21313c] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download Collection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop Collection Confirmation */}
      {dropCollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-xl border p-5 shadow-2xl space-y-4 ${
              isDarkMode
                ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
                : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-red-500 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Drop Collection &quot;{dropCollTarget}&quot;?</span>
            </div>
            <p className="text-xs text-[#8899a6]">
              This will permanently delete collection <strong>{dropCollTarget}</strong> and all of its documents in database <strong>{database.name}</strong>.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDropCollTarget(null)}
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
                onClick={() => {
                  dropCollection(database.name, dropCollTarget);
                  setDropCollTarget(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Drop Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop Database Confirmation */}
      {confirmDropDb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-xl border p-5 shadow-2xl space-y-4 ${
              isDarkMode
                ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
                : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-red-500 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Drop Database &quot;{database.name}&quot;?</span>
            </div>
            <p className="text-xs text-[#8899a6]">
              This will completely remove database <strong>{database.name}</strong> and all {database.collections.length} collections. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDropDb(false)}
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
                onClick={handleDropDbConfirm}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Drop Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
