'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from '@/lib/navigation';
import {
  ChevronRight,
  ChevronDown,
  History,
  RefreshCw,
  Plus,
  FileCode,
  Layers,
  Code2,
  Table as TableIcon,
  AlignLeft,
  ChevronLeft,
  Activity,
  BarChart3,
  Search,
  SlidersHorizontal,
  X,
  Copy,
  Check,
  RotateCcw,
  Pencil,
  Files,
  Trash2,
  Edit3,
  Sun,
  Moon,
  Database,
  Folder,
  FileUp,
  Download,
  HardDrive
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { MongoDocument } from '@/lib/mongodb-mock-data';
import { exportDocument, collectionText } from '@/lib/data-export';
import { apiClient } from '@/lib/api-client';
import { DocumentRowCodeView } from './DocumentRowCodeView';
import { AddDocumentModal } from './AddDocumentModal';
import { ExportCodeModal } from './ExportCodeModal';
import { ExplainPlanModal } from './ExplainPlanModal';
import { CreateQueryModal } from './CreateQueryModal';
import { MonitoringModal } from './MonitoringModal';
import { VisualizeDataModal } from './VisualizeDataModal';
import { BulkActionsModal } from './BulkActionsModal';
import { BulkInsertModal } from './BulkInsertModal';
import { ImportDocumentsModal } from './ImportDocumentsModal';
import { AggregationsTab } from './AggregationsTab';
import { SchemaTab } from './SchemaTab';
import { IndexesTab } from './IndexesTab';
import { ValidationTab } from './ValidationTab';
import { TableFieldEditModal } from './TableFieldEditModal';
import { AddTableColumnModal } from './AddTableColumnModal';
import { DocumentJsonView } from './DocumentJsonView';

interface DocumentSectionProps {
  selectedDb?: string;
  selectedCollection?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: (newTheme: 'light' | 'dark') => void;
  onOpenCreateDatabase?: () => void;
  onNavigateOverview?: () => void;
  onNavigateDatabase?: () => void;
}

function renderTableCellValue(
  val: any,
  colKey: string,
  isDarkMode: boolean = false,
  onOpenEdit?: () => void
) {
  if (val === undefined || val === null) {
    return <span className="text-[#8899a6] italic select-none">null</span>;
  }

  if (colKey === '_id') {
    return (
      <span className={`font-mono whitespace-nowrap ${isDarkMode ? 'text-[#f87171]' : 'text-[#d83737]'}`}>
        ObjectId(&apos;{String(val)}&apos;)
      </span>
    );
  }

  if (typeof val === 'boolean') {
    return <span className={`font-mono font-medium ${isDarkMode ? 'text-[#c084fc]' : 'text-[#7c3aed]'}`}>{String(val)}</span>;
  }

  if (typeof val === 'number') {
    return <span className={`font-mono ${isDarkMode ? 'text-[#38bdf8]' : 'text-[#0062d2]'}`}>{val}</span>;
  }

  if (Array.isArray(val)) {
    const preview = val
      .slice(0, 3)
      .map((item) => (typeof item === 'object' && item !== null ? '{...}' : String(item)))
      .join(', ');

    return (
      <button
        type="button"
        onClick={onOpenEdit}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border whitespace-nowrap cursor-pointer transition-colors ${
          isDarkMode
            ? 'bg-[#132733] text-[#e8edeb] border-[#21313c] hover:bg-[#1a3444]'
            : 'bg-[#f0f4f2] text-[#5c768d] border-[#d8e2dc] hover:bg-[#e4ece7]'
        }`}
        title={`Array with ${val.length} items. Click to edit.`}
      >
        <span className="font-semibold">Array ({val.length})</span>
        {val.length > 0 && (
          <span className={`${isDarkMode ? 'text-[#8899a6]' : 'text-[#8899a6]'} max-w-[130px] truncate`}>
            [{preview}{val.length > 3 ? '...' : ''}]
          </span>
        )}
      </button>
    );
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    const preview = keys.slice(0, 3).join(', ');

    return (
      <button
        type="button"
        onClick={onOpenEdit}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border whitespace-nowrap cursor-pointer transition-colors ${
          isDarkMode
            ? 'bg-[#132733] text-[#e8edeb] border-[#21313c] hover:bg-[#1a3444]'
            : 'bg-[#f0f4f2] text-[#5c768d] border-[#d8e2dc] hover:bg-[#e4ece7]'
        }`}
        title={`Object with ${keys.length} fields. Click to edit.`}
      >
        <span className="font-semibold">Object ({keys.length})</span>
        {keys.length > 0 && (
          <span className={`${isDarkMode ? 'text-[#8899a6]' : 'text-[#8899a6]'} max-w-[130px] truncate`}>
            &#123;{preview}{keys.length > 3 ? '...' : ''}&#125;
          </span>
        )}
      </button>
    );
  }

  // Pure string
  const str = String(val);
  return (
    <span
      className={`${isDarkMode ? 'text-white' : 'text-[#1c2d38]'} font-medium max-w-[260px] truncate block font-mono`}
      title={str}
    >
      &quot;{str}&quot;
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function generateCloneId(prevId: string, docCount: number): string {
  const base = prevId || '52cdef7c4bab8bd675297d8a';
  const prefix = base.substring(0, 18);
  const counterHex = ((docCount + 1) * 7919).toString(16).padStart(6, '0');
  return `${prefix}${counterHex}`.slice(0, 24);
}

export function DocumentSection({
  selectedDb = 'sample_training',
  selectedCollection = 'companies',
  theme = 'light',
  onToggleTheme,
  onOpenCreateDatabase,
  onNavigateOverview,
  onNavigateDatabase,
}: DocumentSectionProps) {
  const { databases = [], triggerToast, triggerLoading, isLoading, refreshDatabases, isConnected } = useDatabase();
  const isDarkMode = theme === 'dark';

  const currentDbMeta = databases.find((d) => d.name === selectedDb);
  const currentCollMeta = currentDbMeta?.collections.find((c) => c.name === selectedCollection);

  // Summary stats for top panel
  const docCount = currentCollMeta?.count ?? 0;
  const storageSizeBytes = currentCollMeta?.sizeBytes ?? 0;
  const indexCount = currentCollMeta?.indexes ?? 0;
  const indexSizeBytes = (currentCollMeta as {indexSizeBytes?:number} | undefined)?.indexSizeBytes ?? 0;
  const avgDocSizeBytes = currentCollMeta?.avgObjSize ?? 0;

  // Export entire collection
  const [isExportEntireCollectionOpen, setIsExportEntireCollectionOpen] = useState(false);
  const [exportCollectionFormat, setExportCollectionFormat] = useState<'json' | 'csv' | 'ndjson'>('json');
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'documents' | 'aggregations' | 'schema' | 'indexes' | 'validation'>('documents');
  const [viewMode, setViewMode] = useState<'list' | 'json' | 'table'>('list');

  // Query & Filters
  const [queryInput, setQueryInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [projectOption, setProjectOption] = useState('');
  const [sortOption, setSortOption] = useState('{ founded_year: -1 }');
  const [skipOption, setSkipOption] = useState('0');
  const [maxTimeOption, setMaxTimeOption] = useState('60000');
  const [collationOption, setCollationOption] = useState('');

  // History
  const [queryHistory, setQueryHistory] = useState<string[]>([
    '{ category_code: "web" }',
    '{ founded_year: { $gte: 2004 } }',
    '{ number_of_employees: { $gt: 50 } }',
    '{ "offices.city": "Seattle" }'
  ]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [documents, setDocuments] = useState<MongoDocument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [reload, setReload] = useState(0);
  const refreshDocuments = () => setReload(value => value + 1);
  useEffect(() => {
    if (!selectedDb || !selectedCollection || !isConnected) { setDocuments([]); setTotalCount(0); return; }
    let mounted = true;
    setDocuments([]);
    apiClient.getDocuments(selectedDb, selectedCollection, {
      query: activeQuery, sort: sortOption, project: projectOption,
      skip: Number(skipOption) + (currentPage - 1) * pageSize, limit: pageSize,
      maxTimeMS: Number(maxTimeOption), collation: collationOption,
    }).then(data => { if (mounted) { setDocuments(data.documents); setTotalCount(data.totalCount); } })
      .catch(error => { if (mounted) {setDocuments([]); setTotalCount(0); triggerToast(error.message);} });
    return () => { mounted = false; };
  }, [selectedDb, selectedCollection, activeQuery, sortOption, projectOption, skipOption, currentPage, pageSize, maxTimeOption, collationOption, reload, isConnected]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const [isCreateQueryModalOpen, setIsCreateQueryModalOpen] = useState(false);
  const [isMonitoringModalOpen, setIsMonitoringModalOpen] = useState(false);
  const [isVisualizeModalOpen, setIsVisualizeModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'update' | 'delete'>('update');
  const [isBulkInsertOpen, setIsBulkInsertOpen] = useState(false);
  const [isImportDocumentsOpen, setIsImportDocumentsOpen] = useState(false);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState(false);

  const handleBulkInsertDocuments = async (newDocs: MongoDocument[]) => {
    for (let offset = 0; offset < newDocs.length; offset += 500) {
      await apiClient.bulkInsertDocuments(selectedDb, selectedCollection, newDocs.slice(offset, offset + 500));
    }
    refreshDocuments(); await refreshDatabases();
    triggerToast(`Inserted ${newDocs.length} documents`);
  };
  const handleImportDocuments = async (newDocs: Record<string, unknown>[], onProgress: (imported: number) => void) => {
    let imported = 0;
    try {
      for (let offset = 0; offset < newDocs.length; offset += 500) {
        try {
          const inserted = await apiClient.bulkInsertDocuments(selectedDb, selectedCollection, newDocs.slice(offset, offset + 500));
          imported += inserted.length;
          onProgress(imported);
        } catch (error) {
          imported += (error as Error & { insertedCount?: number }).insertedCount || 0;
          onProgress(imported);
          throw error;
        }
      }
      refreshDocuments();
      await refreshDatabases();
      triggerToast(`Imported ${imported.toLocaleString()} records`);
    } catch (error) {
      refreshDocuments();
      throw new Error(`${(error as Error).message}${imported ? ` (${imported.toLocaleString()} records already imported; retrying the same file may create duplicates.)` : ''}`);
    }
  };

  const handleExportEntireCollectionDownload = async () => {
    try {
    triggerLoading?.(350, `Exporting collection "${selectedCollection}"...`);
    const dataToExport = (await apiClient.allDocuments(selectedDb, selectedCollection)).map(exportDocument);
    let content = '';
    if (exportCollectionFormat === 'csv') {
      content = collectionText(dataToExport, 'csv');
    } else if (exportCollectionFormat === 'ndjson') {
      content = dataToExport.map((doc) => JSON.stringify(doc)).join('\n');
    } else {
      const exportEnvelope = {
        database: selectedDb,
        collection: selectedCollection,
        totalDocuments: docCount,
        storageSizeBytes,
        indexCount,
        indexSizeBytes,
        exportedAt: new Date().toISOString(),
        documents: dataToExport,
      };
      content = JSON.stringify(exportEnvelope, null, 2);
    }

    const mimeType = exportCollectionFormat === 'csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDb}_${selectedCollection}_entire_collection.${exportCollectionFormat === 'csv' ? 'csv' : exportCollectionFormat === 'ndjson' ? 'ndjson' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportEntireCollectionOpen(false);
    triggerToast(`Exported entire collection "${selectedCollection}" as ${exportCollectionFormat.toUpperCase()}`);
    } catch (error) { triggerToast((error as Error).message); }
  };

  const filteredDocuments = documents;
  const displayTotal = totalCount;
  const startIndex = Number(skipOption) + (currentPage - 1) * pageSize;
  const paginatedDocs = documents;
  const rangeStart = documents.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = startIndex + documents.length;

  // Table view columns dynamically collected from documents
  const [tableColumnSearch, setTableColumnSearch] = useState('');
  const allColumns = useMemo(() => {
    const primaryOrder = [
      '_id',
      'name',
      'category_code',
      'number_of_employees',
      'founded_year',
      'tag_list',
      'permalink',
      'crunchbase_url',
      'homepage_url',
      'blog_url',
      'blog_feed_url',
      'twitter_username',
      'founded_month',
      'founded_day',
      'deadpooled_year',
      'email_address',
      'phone_number',
      'description',
      'created_at',
      'updated_at',
      'overview',
      'total_money_raised',
      'offices',
      'funding_rounds',
      'relationships',
      'acquisition',
      'image',
    ];

    const seen = new Set<string>();
    const cols: string[] = [];

    // Add ordered columns if present in any document
    primaryOrder.forEach((col) => {
      if (documents.some((d) => (d as any)[col] !== undefined)) {
        cols.push(col);
        seen.add(col);
      }
    });

    // Add any remaining fields dynamically
    documents.forEach((d) => {
      Object.keys(d).forEach((k) => {
        if (!seen.has(k)) {
          cols.push(k);
          seen.add(k);
        }
      });
    });

    return cols;
  }, [documents]);

  const displayedColumns = useMemo(() => {
    if (!tableColumnSearch.trim()) return allColumns;
    return allColumns.filter((col) =>
      col.toLowerCase().includes(tableColumnSearch.toLowerCase().trim())
    );
  }, [allColumns, tableColumnSearch]);

  // Handlers
  const handleFind = () => {
    triggerLoading?.(350, 'Executing find query...');
    setActiveQuery(queryInput);
    if (queryInput && !queryHistory.includes(queryInput)) {
      setQueryHistory([queryInput, ...queryHistory.slice(0, 7)]);
    }
    setCurrentPage(1);
  };

  const handleReset = () => {
    triggerLoading?.(250, 'Resetting query filter...');
    setQueryInput('');
    setActiveQuery('');
    setProjectOption('');
    setSortOption('');
    setSkipOption('0');
    setCurrentPage(1);
  };

  const handleFilterByField = (key: string, value: any) => {
    triggerLoading?.(300, `Filtering documents by ${key}...`);
    const formatted = typeof value === 'string' ? `"${value}"` : value;
    const newQuery = `{ ${key}: ${formatted} }`;
    setQueryInput(newQuery);
    setActiveQuery(newQuery);
    setCurrentPage(1);
  };

  const mutation = async (action: () => Promise<unknown>) => {
    try { await action(); refreshDocuments(); await refreshDatabases(); }
    catch (error) { triggerToast((error as Error).message); throw error; }
  };
  const handleUpdateDocument = async (updated: MongoDocument) => {
    if(projectOption.trim() && projectOption.replace(/\s/g, '') !== '{}') {
      const error=new Error('Clear the projection before editing documents so hidden fields are preserved.');
      triggerToast(error.message);throw error;
    }
    await mutation(() => apiClient.updateDocument(selectedDb, selectedCollection, updated._id, updated));
  };
  const handleDeleteDocument = async (id: string) => { try { await mutation(() => apiClient.deleteDocument(selectedDb, selectedCollection, id)); } catch {} };
  const handleCloneDocument = async (doc: MongoDocument) => {
    const { _id, ...cloned } = doc;
    try { await mutation(() => apiClient.createDocument(selectedDb, selectedCollection, cloned as MongoDocument)); } catch {}
  };
  const handleInsertDocument = (doc: MongoDocument) => mutation(() => apiClient.createDocument(selectedDb, selectedCollection, doc));
  const handleBulkUpdateField = (fieldName: string, value: any) => mutation(() => apiClient.bulkUpdate(selectedDb, selectedCollection, activeQuery, {$set:{[fieldName]:value}}));
  const handleBulkUpdateQuery = (updateDoc: Record<string, any>) => mutation(() => apiClient.bulkUpdate(selectedDb, selectedCollection, activeQuery, Object.keys(updateDoc).some(k=>k.startsWith('$')) ? updateDoc : {$set:updateDoc}));
  const handleBulkDelete = () => mutation(() => apiClient.deleteMatching(selectedDb, selectedCollection, activeQuery));

  // Table View Edit States & Handlers
  const [editingCellModal, setEditingCellModal] = useState<{
    isOpen: boolean;
    docId: string;
    docIndex: number;
    fieldName: string;
    initialValue: any;
  }>({
    isOpen: false,
    docId: '',
    docIndex: 0,
    fieldName: '',
    initialValue: null,
  });
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);

  const handleOpenEditCell = (docId: string, fieldName: string, initialValue: any, docIndex: number) => {
    setEditingCellModal({
      isOpen: true,
      docId,
      docIndex,
      fieldName,
      initialValue,
    });
  };

  const handleSaveTableCell = async (docId: string, fieldName: string, newValue: any) => {
    const doc = documents.find(d => d._id === docId);
    if (doc) await handleUpdateDocument({...doc,[fieldName]:newValue});
  };
  const handleAddTableColumn = (fieldName: string, fieldType: string, defaultValue: any) => handleBulkUpdateField(fieldName, defaultValue);

  return (
    <div
      className={`flex-1 min-w-0 min-h-0 h-full flex flex-col font-sans select-text overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-[#001e2b] text-[#e8edeb]' : 'bg-[#f9fbfa] text-[#1c2d38]'
      }`}
    >
      {/* 1. TOP BREADCRUMB & UTILITY BAR (No Path: text, Next.js routing) */}
      <div
        className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 transition-colors ${
          theme === 'dark' ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef]'
        }`}
      >
        {/* Breadcrumb: PawMongo > Selected DB > Selected Collection */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Link
            href="/"
            className={`font-semibold cursor-pointer hover:underline ${
              theme === 'dark' ? 'text-[#e8edeb]' : 'text-[#1c2d38]'
            }`}
            title="Navigate to PawMongo Overview"
          >
            PawMongo
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8899a6]" />
          <Link
            href={`/databases/${encodeURIComponent(selectedDb)}`}
            className={`font-semibold cursor-pointer hover:underline flex items-center gap-1 ${
              theme === 'dark' ? 'text-[#e8edeb]' : 'text-[#1c2d38]'
            }`}
            title={`Navigate to ${selectedDb} database`}
          >
            <Database className="w-3.5 h-3.5 text-[#5c768d]" />
            <span>{selectedDb}</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8899a6]" />
          <span className="font-semibold flex items-center gap-1 text-[#1c2d38] dark:text-[#e8edeb]">
            <Folder className="w-3.5 h-3.5 text-[#5c768d]" />
            <span>{selectedCollection}</span>
          </span>
        </div>

        {/* Right utility controls: Individual routes for Monitoring + Visualize */}
        <div className="flex items-center gap-2.5">
          <Link
            href={`/databases/${encodeURIComponent(selectedDb)}/collections/${encodeURIComponent(selectedCollection)}/monitoring`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors shadow-xs cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
            }`}
            title="Open real-time monitoring view"
          >
            <Activity className="w-3.5 h-3.5 text-[#5c768d]" />
            <span>View monitoring</span>
          </Link>
          <Link
            href={`/databases/${encodeURIComponent(selectedDb)}/collections/${encodeURIComponent(selectedCollection)}/visualize`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors shadow-xs cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
            }`}
            title="Open data visualization view"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#0062d2]" />
            <span>Visualize Your Data</span>
          </Link>
        </div>
      </div>

      {/* 2. SUMMARY STATS PANEL AT THE TOP OF THE COLLECTION VIEW */}
      <div
        className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 transition-colors select-none ${
          isDarkMode
            ? 'bg-[#07131d] border-[#1c2d38]'
            : 'bg-[#fafcfb] border-[#edf2ef]'
        }`}
      >
        <div className="flex items-center gap-4 sm:gap-7 flex-wrap">
          {/* 1. Document Count */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                  : 'bg-neutral-100 border-[#d8e2dc] text-[#5c768d]'
              }`}
            >
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#8899a6]">
                Document Count
              </div>
              <div
                className={`text-sm font-bold font-mono ${
                  isDarkMode ? 'text-white' : 'text-[#1c2d38]'
                }`}
              >
                {docCount.toLocaleString()}
              </div>
            </div>
          </div>

          <div className={`h-6 w-px hidden sm:block ${isDarkMode ? 'bg-[#21313c]' : 'bg-[#d8e2dc]'}`} />

          {/* 2. Total Storage Size */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                  : 'bg-neutral-100 border-[#d8e2dc] text-[#5c768d]'
              }`}
            >
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#8899a6]">
                Total Storage Size
              </div>
              <div
                className={`text-sm font-bold font-mono ${
                  isDarkMode ? 'text-white' : 'text-[#1c2d38]'
                }`}
              >
                {formatBytes(storageSizeBytes)}
              </div>
            </div>
          </div>

          <div className={`h-6 w-px hidden sm:block ${isDarkMode ? 'bg-[#21313c]' : 'bg-[#d8e2dc]'}`} />

          {/* 3. Index Size */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                  : 'bg-neutral-100 border-[#d8e2dc] text-[#5c768d]'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#8899a6]">
                Index Size
              </div>
              <div
                className={`text-sm font-bold font-mono flex items-center gap-1.5 ${
                  isDarkMode ? 'text-white' : 'text-[#1c2d38]'
                }`}
              >
                <span>{formatBytes(indexSizeBytes)}</span>
                <span className="text-[10px] font-normal text-[#8899a6] font-sans">
                  ({indexCount} {indexCount === 1 ? 'index' : 'indexes'})
                </span>
              </div>
            </div>
          </div>

          <div className={`h-6 w-px hidden md:block ${isDarkMode ? 'bg-[#21313c]' : 'bg-[#d8e2dc]'}`} />

          {/* 4. Avg Document Size */}
          <div className="hidden md:flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                  : 'bg-neutral-100 border-[#d8e2dc] text-[#5c768d]'
              }`}
            >
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#8899a6]">
                Avg Doc Size
              </div>
              <div
                className={`text-sm font-bold font-mono ${
                  isDarkMode ? 'text-white' : 'text-[#1c2d38]'
                }`}
              >
                {formatBytes(avgDocSizeBytes)}
              </div>
            </div>
          </div>
        </div>

        {/* Export Collection Action Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportEntireCollectionOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
              isDarkMode
                ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
                : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
            }`}
            title="Export the entire collection as JSON, CSV, or NDJSON"
          >
            <Download className="w-3.5 h-3.5 text-[#5c768d]" />
            <span>Export Collection</span>
          </button>
        </div>
      </div>

      {/* 3. COLLECTION NAVIGATION TABS (image.png Second Row) */}
      <div
        className={`flex items-center px-6 border-b shrink-0 gap-6 overflow-x-auto transition-colors ${
          isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef]'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'documents'
              ? isDarkMode
                ? 'border-[#38bdf8] text-white'
                : 'border-[#001e2b] text-[#001e2b]'
              : isDarkMode
              ? 'border-transparent text-[#8899a6] hover:text-[#e8edeb]'
              : 'border-transparent text-[#5c768d] hover:text-[#1c2d38]'
          }`}
        >
          <span>Documents</span>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors ${
              isDarkMode
                ? 'bg-[#132733] text-white border-[#21313c]'
                : 'bg-[#f0f4f2] text-[#1c2d38] border-[#d8e2dc]'
            }`}
          >
            {docCount.toLocaleString()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aggregations')}
          className={`py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'aggregations'
              ? isDarkMode
                ? 'border-[#38bdf8] text-white font-semibold'
                : 'border-[#001e2b] text-[#001e2b] font-semibold'
              : isDarkMode
              ? 'border-transparent text-[#8899a6] hover:text-[#e8edeb]'
              : 'border-transparent text-[#5c768d] hover:text-[#1c2d38]'
          }`}
        >
          Aggregations
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'schema'
              ? isDarkMode
                ? 'border-[#38bdf8] text-white font-semibold'
                : 'border-[#001e2b] text-[#001e2b] font-semibold'
              : isDarkMode
              ? 'border-transparent text-[#8899a6] hover:text-[#e8edeb]'
              : 'border-transparent text-[#5c768d] hover:text-[#1c2d38]'
          }`}
        >
          Schema
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('indexes')}
          className={`flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'indexes'
              ? isDarkMode
                ? 'border-[#38bdf8] text-white font-semibold'
                : 'border-[#001e2b] text-[#001e2b] font-semibold'
              : isDarkMode
              ? 'border-transparent text-[#8899a6] hover:text-[#e8edeb]'
              : 'border-transparent text-[#5c768d] hover:text-[#1c2d38]'
          }`}
        >
          <span>Indexes</span>
          <span
            className={`px-1.5 py-0.2 text-[11px] font-medium rounded-full ${
              isDarkMode
                ? 'bg-[#132733] text-white'
                : 'bg-[#f0f4f2] text-[#5c768d]'
            }`}
          >
            1
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('validation')}
          className={`py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'validation'
              ? isDarkMode
                ? 'border-[#38bdf8] text-white font-semibold'
                : 'border-[#001e2b] text-[#001e2b] font-semibold'
              : isDarkMode
              ? 'border-transparent text-[#8899a6] hover:text-[#e8edeb]'
              : 'border-transparent text-[#5c768d] hover:text-[#1c2d38]'
          }`}
        >
          Validation
        </button>
      </div>

      {/* MAIN BODY AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
        {activeTab === 'documents' ? (
          <>
            {/* 3. QUERY FILTER BAR (image.png Query Input Box) */}
            <div
              className={`rounded-lg shadow-xs overflow-visible border transition-colors ${
                isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#d8e2dc]'
              }`}
            >
              <div className="flex items-center p-2.5 gap-2 relative">
                {/* History dropdown toggle */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'text-[#8899a6] hover:text-white hover:bg-[#132733]'
                        : 'text-[#5c768d] hover:text-[#1c2d38] hover:bg-[#edf2ef]'
                    }`}
                    title="Query History"
                  >
                    <History className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3 text-[#8899a6]" />
                  </button>

                  {/* History Menu */}
                  {isHistoryOpen && (
                    <div
                      className={`absolute top-full left-0 mt-1 z-30 w-72 rounded-md shadow-xl py-1 text-xs border ${
                        isDarkMode
                          ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
                          : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
                      }`}
                    >
                      <div
                        className={`px-3 py-1.5 text-[11px] font-semibold text-[#8899a6] uppercase tracking-wide border-b ${
                          isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
                        }`}
                      >
                        Recent Queries
                      </div>
                      {queryHistory.map((item, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => {
                            setQueryInput(item);
                            setActiveQuery(item);
                            setIsHistoryOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 font-mono text-[11px] truncate block cursor-pointer transition-colors ${
                            isDarkMode
                              ? 'text-[#e8edeb] hover:bg-[#132733] hover:text-white'
                              : 'text-[#21313c] hover:bg-[#f2f7f4] hover:text-[#5c768d]'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Query Input Field */}
                <div className="flex-1 relative flex items-center">
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFind();
                    }}
                    placeholder="Type a query: { field: 'value' }"
                    className={`w-full pl-2 pr-3 py-1 text-xs font-mono bg-transparent focus:outline-none ${
                      isDarkMode
                        ? 'text-[#e8edeb] placeholder-[#5c768d]'
                        : 'text-[#1c2d38] placeholder-[#8899a6]'
                    }`}
                  />
                </div>

                {/* Right Query Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateQueryModalOpen(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer shadow-xs ${
                      isDarkMode
                        ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
                        : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                    }`}
                    title="Open visual query builder form"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#5c768d]" />
                    <span>Create query</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExplainModalOpen(true)}
                    className={`px-3 py-1 text-xs font-medium rounded border transition-colors cursor-pointer shadow-xs ${
                      isDarkMode
                        ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
                        : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                    }`}
                  >
                    Explain
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className={`px-3 py-1 text-xs font-medium rounded border transition-colors cursor-pointer shadow-xs ${
                      isDarkMode
                        ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344] hover:text-white'
                        : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                    }`}
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleFind}
                    className={`px-4 py-1 text-xs font-semibold text-white rounded transition-colors shadow-xs cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#0062d2] hover:bg-[#0284c7]'
                        : 'bg-[#001e2b] hover:bg-[#112734]'
                    }`}
                  >
                    Find
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ml-1 cursor-pointer ${
                      isDarkMode
                        ? 'text-[#38bdf8] hover:text-white hover:bg-[#132733]'
                        : 'text-[#0062d2] hover:text-[#004bb0] hover:bg-[#f0f6ff]'
                    }`}
                  >
                    <span>Options</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${isOptionsOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Collapsible Options Drawer */}
              {isOptionsOpen && (
                <div
                  className={`border-t p-4 text-xs space-y-3 animate-in fade-in duration-100 ${
                    isDarkMode
                      ? 'border-[#1c2d38] bg-[#07131d]'
                      : 'border-[#edf2ef] bg-[#fbfdfc]'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label
                        className={`block text-[11px] font-semibold mb-1 ${
                          isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                        }`}
                      >
                        PROJECT:
                      </label>
                      <input
                        type="text"
                        placeholder="{ name: 1, category_code: 1 }"
                        value={projectOption}
                        onChange={(e) => setProjectOption(e.target.value)}
                        className={`w-full px-2.5 py-1 border rounded font-mono text-xs focus:outline-none focus:ring-1 ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-[#001e2b]'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-[11px] font-semibold mb-1 ${
                          isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                        }`}
                      >
                        SORT:
                      </label>
                      <input
                        type="text"
                        placeholder="{ founded_year: -1 }"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className={`w-full px-2.5 py-1 border rounded font-mono text-xs focus:outline-none focus:ring-1 ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-[#001e2b]'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-[11px] font-semibold mb-1 ${
                          isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                        }`}
                      >
                        MAXTIMEMS:
                      </label>
                      <input
                        type="text"
                        placeholder="60000"
                        value={maxTimeOption}
                        onChange={(e) => setMaxTimeOption(e.target.value)}
                        className={`w-full px-2.5 py-1 border rounded font-mono text-xs focus:outline-none focus:ring-1 ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-[#001e2b]'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block text-[11px] font-semibold mb-1 ${
                          isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                        }`}
                      >
                        COLLATION:
                      </label>
                      <input
                        type="text"
                        placeholder="{ locale: 'simple' }"
                        value={collationOption}
                        onChange={(e) => setCollationOption(e.target.value)}
                        className={`w-full px-2.5 py-1 border rounded font-mono text-xs focus:outline-none focus:ring-1 ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-[#001e2b]'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-[11px] font-semibold mb-1 ${
                          isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                        }`}
                      >
                        SKIP:
                      </label>
                      <input
                        type="text"
                        placeholder="0"
                        value={skipOption}
                        onChange={(e) => setSkipOption(e.target.value)}
                        className={`w-full px-2.5 py-1 border rounded font-mono text-xs focus:outline-none focus:ring-1 ${
                          isDarkMode
                            ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] focus:ring-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-[#001e2b]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. ACTION TOOLBAR (image.png Row Below Filter) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Left Action Buttons */}
              <div className="flex items-center gap-2">
                {/* + ADD DATA ▾ - Styled like BULK without background */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                        : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-[#5c768d]" />
                    <span>ADD DATA</span>
                    <ChevronDown className="w-3 h-3 ml-0.5 text-[#8899a6]" />
                  </button>

                  {isAddDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsAddDropdownOpen(false)}
                      />
                      <div
                        className={`absolute top-full left-0 mt-1 z-30 w-48 border rounded-md shadow-lg py-1 text-xs ${
                          theme === 'dark'
                            ? 'bg-[#0f212e] border-[#21313c] text-[#e8edeb]'
                            : 'bg-white border-[#d8e2dc] text-[#21313c]'
                        }`}
                      >
                        {/* 1. Insert Document */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddModalOpen(true);
                            setIsAddDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 cursor-pointer ${
                            theme === 'dark'
                              ? 'hover:bg-[#1a3344] text-[#e8edeb]'
                              : 'hover:bg-[#edf2ef] text-[#1c2d38]'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-[#5c768d]" />
                          <span>Insert Document</span>
                        </button>

                        {/* 2. Bulk Insert Documents */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsBulkInsertOpen(true);
                            setIsAddDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 cursor-pointer ${
                            theme === 'dark'
                              ? 'hover:bg-[#1a3344] text-[#e8edeb]'
                              : 'hover:bg-[#edf2ef] text-[#1c2d38]'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5 text-[#5c768d]" />
                          <span>Bulk Insert Documents</span>
                        </button>

                        {/* 3. Import documents */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsImportDocumentsOpen(true);
                            setIsAddDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 cursor-pointer ${
                            theme === 'dark'
                              ? 'hover:bg-[#1a3344] text-[#e8edeb]'
                              : 'hover:bg-[#edf2ef] text-[#1c2d38]'
                          }`}
                        >
                          <FileUp className="w-3.5 h-3.5 text-[#5c768d]" />
                          <span>Import documents</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* BULK ▾ */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsBulkDropdownOpen(!isBulkDropdownOpen)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                        : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-[#5c768d]" />
                    <span>BULK</span>
                    <ChevronDown className="w-3 h-3 ml-0.5 text-[#8899a6]" />
                  </button>

                  {isBulkDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsBulkDropdownOpen(false)}
                      />
                      <div
                        className={`absolute top-full left-0 mt-1 z-30 w-52 border rounded-md shadow-lg py-1 text-xs ${
                          theme === 'dark'
                            ? 'bg-[#0f212e] border-[#21313c] text-[#e8edeb]'
                            : 'bg-white border-[#d8e2dc] text-[#21313c]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setBulkModalMode('update');
                            setIsBulkModalOpen(true);
                            setIsBulkDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-[#1a3344] text-[#e8edeb]'
                              : 'hover:bg-[#f2f7f4] text-[#21313c]'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#5c768d]" />
                          <span>Bulk update document</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBulkModalMode('delete');
                            setIsBulkModalOpen(true);
                            setIsBulkDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-[#341818] text-[#f87171]'
                              : 'hover:bg-[#fef2f2] text-[#c73e3e]'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#c73e3e]" />
                          <span>Bulk delete document</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* EXPORT COLLECTION */}
                <button
                  type="button"
                  onClick={() => setIsExportEntireCollectionOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                      : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                  }`}
                  title="Export the entire collection"
                >
                  <Download className="w-3.5 h-3.5 text-[#5c768d]" />
                  <span>EXPORT COLLECTION</span>
                </button>

                {/* EXPORT CODE */}
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-xs cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                      : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-[#5c768d]" />
                  <span>EXPORT CODE</span>
                </button>
              </div>

              {/* Right Pagination & View Switcher */}
              <div className="flex items-center gap-3">
                {/* Page Size Select */}
                <div className="relative">
                  <select
                    suppressHydrationWarning
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={`appearance-none border rounded px-3 py-1 pr-6 text-xs font-medium focus:outline-none cursor-pointer shadow-xs ${
                      isDarkMode
                        ? 'bg-[#132733] border-[#21313c] text-[#e8edeb]'
                        : 'bg-white border-[#d8e2dc] text-[#21313c]'
                    }`}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#8899a6] absolute right-2 top-2.5 pointer-events-none" />
                </div>

                {/* Range Indicator */}
                <span
                  className={`text-xs select-none font-medium ${
                    isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                  }`}
                >
                  {rangeStart} – {rangeEnd} of {displayTotal}
                </span>

                {/* Refresh Icon */}
                <button
                  type="button"
                  onClick={refreshDocuments}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'text-[#8899a6] hover:text-white hover:bg-[#132733]'
                      : 'text-[#5c768d] hover:text-[#1c2d38] hover:bg-[#edf2ef]'
                  }`}
                  title="Refresh Documents"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Pagination Controls */}
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={`p-1.5 rounded transition-colors cursor-pointer disabled:cursor-not-allowed ${
                      isDarkMode
                        ? 'text-[#8899a6] hover:text-white disabled:opacity-30 disabled:hover:text-[#8899a6]'
                        : 'text-[#5c768d] hover:text-[#1c2d38] disabled:opacity-30 disabled:hover:text-[#5c768d]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={rangeEnd >= displayTotal}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className={`p-1.5 rounded transition-colors cursor-pointer disabled:cursor-not-allowed ${
                      isDarkMode
                        ? 'text-[#8899a6] hover:text-white disabled:opacity-30 disabled:hover:text-[#8899a6]'
                        : 'text-[#5c768d] hover:text-[#1c2d38] disabled:opacity-30 disabled:hover:text-[#5c768d]'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Dropdown caret container from screenshot */}
                <button
                  type="button"
                  className={`p-1.5 border rounded shadow-xs cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:bg-[#1c3344] hover:text-white'
                      : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:bg-[#f4f7f5]'
                  }`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Segmented View Switcher (☰ list/code, {} json, ⊞ table) */}
                <div
                  className={`flex items-center rounded p-0.5 border shadow-xs ${
                    theme === 'dark'
                      ? 'bg-[#0f212e] border-[#1c2d38]'
                      : 'bg-[#f0f4f2] border-[#d8e2dc]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? theme === 'dark'
                          ? 'bg-[#1c2d38] text-white shadow-xs'
                          : 'bg-[#001e2b] text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-[#8899a6] hover:text-white'
                        : 'text-[#5c768d] hover:text-[#1c2d38]'
                    }`}
                    title="List View (Code format with data types)"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('json')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                      viewMode === 'json'
                        ? theme === 'dark'
                          ? 'bg-[#1c2d38] text-white shadow-xs'
                          : 'bg-[#001e2b] text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-[#8899a6] hover:text-white'
                        : 'text-[#5c768d] hover:text-[#1c2d38]'
                    }`}
                    title="JSON View"
                  >
                    <span className="font-mono font-bold text-[11px]">{'{ }'}</span>
                    <span>JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      viewMode === 'table'
                        ? theme === 'dark'
                          ? 'bg-[#1c2d38] text-white shadow-xs'
                          : 'bg-[#001e2b] text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-[#8899a6] hover:text-white'
                        : 'text-[#5c768d] hover:text-[#1c2d38]'
                    }`}
                    title="Table View"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 5. DOCUMENTS DISPLAY SECTION (Matching image.png List/Code view) */}
            <div className="pt-2">
              {filteredDocuments.length === 0 ? (
                <div className="p-12 text-center bg-white border border-[#e8edeb] rounded-lg">
                  <p className="text-sm font-semibold text-[#1c2d38]">No documents matched your query</p>
                  <p className="text-xs text-[#5c768d] mt-1">
                    Try modifying your filter or click Reset to view all documents
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#001e2b] rounded-md hover:bg-[#112734] cursor-pointer shadow-xs"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : viewMode === 'list' ? (
                /* LIST / CODE VIEW - EXACTLY AS SHOWN IN IMAGE.PNG */
                <div className="space-y-4">
                  {paginatedDocs.map((doc, idx) => (
                    <DocumentRowCodeView
                      key={doc._id}
                      document={doc}
                      documentIndex={startIndex + idx}
                      onUpdateDocument={handleUpdateDocument}
                      onDeleteDocument={handleDeleteDocument}
                      onCloneDocument={handleCloneDocument}
                      onFilterByField={handleFilterByField}
                    />
                  ))}
                </div>
              ) : viewMode === 'json' ? (
                /* JSON VIEW - WITH LINE NUMBERS, SYNTAX HIGHLIGHTING, EDITING & ARRAY/CARDS MODES */
                <DocumentJsonView
                  documents={paginatedDocs}
                  startIndex={startIndex}
                  totalFilteredCount={filteredDocuments.length}
                  theme={theme}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onCloneDocument={handleCloneDocument}
                  onResetFilter={handleReset}
                />
              ) : (
                /* TABLE VIEW - SHOWS ALL COLUMNS WITH HOVER EDIT BUTTON & ARRAY/OBJECT SUPPORT */
                <div className="space-y-2.5">
                  {/* Table Toolbar */}
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${
                      theme === 'dark'
                        ? 'bg-[#0b1a24] border-[#1c2d38] text-[#8899a6]'
                        : 'bg-[#f4f7f5] border-[#e8edeb] text-[#5c768d]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-semibold ${
                          theme === 'dark' ? 'text-[#e8edeb]' : 'text-[#1c2d38]'
                        }`}
                      >
                        Table View
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium text-[11px] border ${
                          theme === 'dark'
                            ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                            : 'bg-white text-[#1c2d38] border-[#d8e2dc]'
                        }`}
                      >
                        Showing all {displayedColumns.length} columns
                      </span>
                      {tableColumnSearch && (
                        <span className="text-[#8899a6]">
                          (filtered from {allColumns.length} total)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddColumnModalOpen(true)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                            : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                        }`}
                        title="Add a new field / column to documents"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Field</span>
                      </button>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search column..."
                          value={tableColumnSearch}
                          onChange={(e) => setTableColumnSearch(e.target.value)}
                          className={`px-2.5 py-1 text-xs border rounded-md placeholder-[#8899a6] focus:outline-none focus:ring-1 focus:ring-[#001e2b] dark:focus:ring-[#5c768d] w-44 ${
                            theme === 'dark'
                              ? 'bg-[#132733] border-[#21313c] text-[#e8edeb]'
                              : 'bg-white border-[#d8e2dc] text-[#21313c]'
                          }`}
                        />
                        {tableColumnSearch && (
                          <button
                            type="button"
                            onClick={() => setTableColumnSearch('')}
                            className="absolute right-2 top-1 text-[#8899a6] hover:text-[#1c2d38] cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main Table Scroll Container */}
                  <div
                    className={`border rounded-lg overflow-x-auto shadow-xs max-h-[720px] overflow-y-auto ${
                      theme === 'dark'
                        ? 'bg-[#001e2b] border-[#1c2d38]'
                        : 'bg-white border-[#e8edeb]'
                    }`}
                  >
                    <table className="w-full text-left text-xs border-collapse">
                      <thead
                        className={`sticky top-0 z-10 shadow-[0_1px_0_#e8edeb] ${
                          theme === 'dark'
                            ? 'bg-[#0b1a24] text-[#8899a6] shadow-[0_1px_0_#1c2d38]'
                            : 'bg-[#f9fbfa] text-[#5c768d]'
                        }`}
                      >
                        <tr
                          className={`border-b font-semibold text-[11px] ${
                            theme === 'dark' ? 'border-[#1c2d38]' : 'border-[#e8edeb]'
                          }`}
                        >
                          {/* Sticky left index */}
                          <th
                            className={`p-3 w-12 text-center sticky left-0 z-20 ${
                              theme === 'dark'
                                ? 'bg-[#0b1a24] shadow-[1px_0_0_#1c2d38]'
                                : 'bg-[#f9fbfa] shadow-[1px_0_0_#e8edeb]'
                            }`}
                          >
                            #
                          </th>

                          {/* All dynamic columns */}
                          {displayedColumns.map((col) => (
                            <th
                              key={col}
                              className={`p-3 font-mono border-r whitespace-nowrap min-w-[160px] ${
                                theme === 'dark' ? 'border-[#1c2d38]' : 'border-[#f0f4f2]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span
                                  className={
                                    col === '_id'
                                      ? 'text-[#d83737]'
                                      : theme === 'dark'
                                      ? 'text-[#e8edeb]'
                                      : 'text-[#21313c]'
                                  }
                                >
                                  {col}
                                </span>
                              </div>
                            </th>
                          ))}

                          {/* Sticky right Actions */}
                          <th
                            className={`p-3 text-right sticky right-0 z-20 w-24 ${
                              theme === 'dark'
                                ? 'bg-[#0b1a24] shadow-[-1px_0_0_#1c2d38]'
                                : 'bg-[#f9fbfa] shadow-[-1px_0_0_#e8edeb]'
                            }`}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody
                        className={`divide-y ${
                          theme === 'dark' ? 'divide-[#1c2d38]' : 'divide-[#edf2ef]'
                        }`}
                      >
                        {paginatedDocs.map((doc, i) => (
                          <tr
                            key={doc._id}
                            className={`group transition-colors ${
                              theme === 'dark' ? 'hover:bg-[#0b1a24]' : 'hover:bg-[#f6f9f7]'
                            }`}
                          >
                            {/* Sticky left index */}
                            <td
                              className={`p-3 text-center text-[#8899a6] font-mono sticky left-0 z-10 ${
                                theme === 'dark'
                                  ? 'bg-[#001e2b] group-hover:bg-[#0b1a24] shadow-[1px_0_0_#1c2d38]'
                                  : 'bg-white group-hover:bg-[#f6f9f7] shadow-[1px_0_0_#e8edeb]'
                              }`}
                            >
                              {startIndex + i + 1}
                            </td>

                            {/* All dynamic column cells with hover edit button */}
                            {displayedColumns.map((col) => {
                              const cellVal = (doc as any)[col];
                              const isIdCol = col === '_id';

                              return (
                                <td
                                  key={col}
                                  className={`p-2.5 border-r max-w-[320px] align-middle group/cell relative transition-colors ${
                                    theme === 'dark'
                                      ? 'border-[#1c2d38] hover:bg-[#132733]/50'
                                      : 'border-[#f0f4f2] hover:bg-[#f2f7f4]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      {renderTableCellValue(
                                        cellVal,
                                        col,
                                        theme === 'dark',
                                        () => {
                                          if (!isIdCol) {
                                            handleOpenEditCell(
                                              doc._id,
                                              col,
                                              cellVal,
                                              startIndex + i + 1
                                            );
                                          }
                                        }
                                      )}
                                    </div>

                                    {/* Hover individual field should show one edit button */}
                                    {!isIdCol && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditCell(
                                            doc._id,
                                            col,
                                            cellVal,
                                            startIndex + i + 1
                                          );
                                        }}
                                        className={`opacity-0 group-hover/cell:opacity-100 p-1 rounded border shadow-xs transition-opacity cursor-pointer shrink-0 ${
                                          theme === 'dark'
                                            ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                                            : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38] hover:bg-[#edf2ef]'
                                        }`}
                                        title={`Edit ${col}`}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              );
                            })}

                            {/* Sticky right Actions */}
                            <td
                              className={`p-3 text-right sticky right-0 z-10 ${
                                theme === 'dark'
                                  ? 'bg-[#001e2b] group-hover:bg-[#0b1a24] shadow-[-1px_0_0_#1c2d38]'
                                  : 'bg-white group-hover:bg-[#f6f9f7] shadow-[-1px_0_0_#e8edeb]'
                              }`}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCloneDocument(doc)}
                                  className={`p-1 rounded cursor-pointer transition-colors ${
                                    theme === 'dark'
                                      ? 'text-[#8899a6] hover:text-[#e8edeb] hover:bg-[#132733]'
                                      : 'text-[#5c768d] hover:text-[#1c2d38] hover:bg-[#edf2ef]'
                                  }`}
                                  title="Clone document"
                                >
                                  <Files className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocument(doc._id)}
                                  className={`p-1 rounded cursor-pointer transition-colors ${
                                    theme === 'dark'
                                      ? 'text-[#8899a6] hover:text-red-400 hover:bg-red-950/40'
                                      : 'text-[#8899a6] hover:text-[#c73e3e] hover:bg-[#fdeeed]'
                                  }`}
                                  title="Delete document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'aggregations' ? (
          <AggregationsTab selectedDb={selectedDb} selectedCollection={selectedCollection} documents={documents} isDarkMode={theme === 'dark'} />
        ) : activeTab === 'schema' ? (
          <SchemaTab documents={documents} isDarkMode={theme === 'dark'} />
        ) : activeTab === 'indexes' ? (
          <IndexesTab
            documents={documents}
            selectedDb={selectedDb}
            selectedCollection={selectedCollection}
            isDarkMode={theme === 'dark'}
          />
        ) : (
          <ValidationTab selectedDb={selectedDb} selectedCollection={selectedCollection} documents={documents} isDarkMode={theme === 'dark'} />
        )}
      </div>

      {/* MODALS */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onInsert={handleInsertDocument}
      />
      <ExportCodeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        query={activeQuery}
        database={selectedDb}
        collection={selectedCollection}
      />
      <ExplainPlanModal selectedDb={selectedDb} selectedCollection={selectedCollection}
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        query={activeQuery}
        totalMatched={filteredDocuments.length}
      />
      <CreateQueryModal
        isOpen={isCreateQueryModalOpen}
        onClose={() => setIsCreateQueryModalOpen(false)}
        onApplyQuery={(q) => {
          setQueryInput(q);
          setActiveQuery(q);
        }}
        initialQuery={queryInput}
        columns={allColumns}
      />
      <MonitoringModal
        isOpen={isMonitoringModalOpen}
        onClose={() => setIsMonitoringModalOpen(false)}
      />
      <VisualizeDataModal
        isOpen={isVisualizeModalOpen}
        onClose={() => setIsVisualizeModalOpen(false)}
        documents={documents}
      />
      <BulkActionsModal
        key={`${isBulkModalOpen}-${bulkModalMode}`}
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        matchingCount={filteredDocuments.length}
        initialMode={bulkModalMode}
        collectionName={selectedCollection}
        currentQuery={activeQuery}
        isDarkMode={theme === 'dark'}
        onBulkUpdateField={handleBulkUpdateField}
        onBulkUpdateQuery={handleBulkUpdateQuery}
        onBulkDelete={handleBulkDelete}
      />
      <TableFieldEditModal
        isOpen={editingCellModal.isOpen}
        onClose={() => setEditingCellModal((prev) => ({ ...prev, isOpen: false }))}
        docId={editingCellModal.docId}
        docIndex={editingCellModal.docIndex}
        fieldName={editingCellModal.fieldName}
        initialValue={editingCellModal.initialValue}
        onSave={handleSaveTableCell}
        isDarkMode={theme === 'dark'}
      />
      <AddTableColumnModal
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        onAddColumn={handleAddTableColumn}
        isDarkMode={theme === 'dark'}
      />
      <BulkInsertModal
        isOpen={isBulkInsertOpen}
        onClose={() => setIsBulkInsertOpen(false)}
        onBulkInsert={handleBulkInsertDocuments}
        isDarkMode={theme === 'dark'}
      />
      <ImportDocumentsModal
        isOpen={isImportDocumentsOpen}
        onClose={() => setIsImportDocumentsOpen(false)}
        onImport={handleImportDocuments}
        collectionName={selectedCollection}
        isDarkMode={theme === 'dark'}
      />

      {/* Export Entire Collection Modal */}
      {isExportEntireCollectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
                : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-3.5 border-b ${
                theme === 'dark' ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#5c768d]" />
                <h3 className="font-bold text-sm">Export Entire Collection</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportEntireCollectionOpen(false)}
                className="text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div
                className={`p-3 rounded-lg border space-y-1 font-mono ${
                  theme === 'dark'
                    ? 'bg-[#132733]/50 border-[#21313c] text-[#8899a6]'
                    : 'bg-[#f8faf9] border-[#e8edeb] text-[#5c768d]'
                }`}
              >
                <div className="flex justify-between">
                  <span>Collection:</span>
                  <strong className="text-[#1c2d38] dark:text-white">{selectedCollection}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Database:</span>
                  <span className="text-[#1c2d38] dark:text-white">{selectedDb}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Documents:</span>
                  <span className="text-[#1c2d38] dark:text-white font-bold">{docCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Storage:</span>
                  <span className="text-[#1c2d38] dark:text-white">{formatBytes(storageSizeBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Index Size:</span>
                  <span className="text-[#1c2d38] dark:text-white">{formatBytes(indexSizeBytes)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  EXPORT FORMAT
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['json', 'csv', 'ndjson'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setExportCollectionFormat(fmt)}
                      className={`px-3 py-2 rounded border font-mono font-medium text-xs transition-colors cursor-pointer uppercase ${
                        exportCollectionFormat === fmt
                          ? theme === 'dark'
                            ? 'bg-[#1c3344] border-[#21313c] text-white shadow-xs'
                            : 'bg-white border-[#001e2b] text-[#001e2b] ring-1 ring-[#001e2b] shadow-xs'
                          : theme === 'dark'
                          ? 'border-[#21313c] text-[#8899a6] hover:bg-[#132733]'
                          : 'border-[#d8e2dc] text-[#5c768d] hover:bg-[#f4f7f5]'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportEntireCollectionOpen(false)}
                  className={`px-3 py-1.5 text-xs border rounded transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#132733] border-[#21313c] text-[#e8edeb] hover:bg-[#1c3344]'
                      : 'bg-white border-[#d8e2dc] text-[#21313c] hover:bg-[#f4f7f5]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportEntireCollectionDownload}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#001e2b] dark:bg-[#132733] text-white hover:bg-[#112734] dark:hover:bg-[#1c3344] border border-[#001e2b] dark:border-[#21313c] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download Entire Collection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
