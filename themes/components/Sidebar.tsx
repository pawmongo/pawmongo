'use client';

import React, { useState } from 'react';
import Link from '@/lib/navigation';
import { usePathname } from '@/lib/navigation';
import {
  Database,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Server,
  Folder
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';

export function Sidebar() {
  const pathname = usePathname() || '/';
  const { databases, theme, setIsCreateDbModalOpen, setIsMobileSidebarOpen } = useDatabase();
  const isDarkMode = theme === 'dark';

  const [collapsedDbs, setCollapsedDbs] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggleDb = (dbName: string) => {
    setCollapsedDbs((prev) => ({
      ...prev,
      [dbName]: !prev[dbName],
    }));
  };

  const isOverviewActive = pathname === '/';

  return (
    <aside
      className={`w-64 border-r flex flex-col h-full text-xs select-none shrink-0 font-sans transition-colors ${
        isDarkMode
          ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
          : 'bg-[#fbfcfb] border-[#e8edeb] text-[#1c2d38]'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
        }`}
      >
        <Link
          href="/"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-md bg-[#001e2b] flex items-center justify-center text-white shadow-xs group-hover:bg-[#112734] transition-colors">
            {/* MongoDB Leaf SVG (Neutral / White, NO green) */}
            <svg
              className="w-4 h-4 fill-current text-white"
              viewBox="0 0 24 24"
            >
              <path d="M12 0C11.66 0 11.36.19 11.2.49L6.5 9.17C5.56 10.9 5 12.87 5 14.88 5 19.92 9.08 24 14.12 24c3.55 0 6.64-2.03 8.16-5.02.2-.4.1-.89-.24-1.18-.34-.29-.83-.29-1.17 0-1.28 1.1-2.92 1.7-4.65 1.7-4.14 0-7.5-3.36-7.5-7.5 0-1.65.54-3.26 1.54-4.57L12 3.82l1.74 3.61c1 1.31 1.54 2.92 1.54 4.57 0 .55.45 1 1 1s1-.45 1-1c0-2.01-.56-3.98-1.5-5.71L12.8.49C12.64.19 12.34 0 12 0z" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block">
              PawMongo
            </span>
          </div>
        </Link>
      </div>

      {/* Overview Button - Centered large text with left Server icon and right Chevron icon */}
      <Link
        href="/"
        onClick={() => setIsMobileSidebarOpen(false)}
        className={`w-full px-4 py-3.5 border-b flex items-center justify-between transition-colors cursor-pointer group ${
          isOverviewActive
            ? isDarkMode
              ? 'bg-[#1a3344] border-[#1c2d38] text-white shadow-xs'
              : 'bg-[#e4ebf0] border-[#edf2ef] text-[#001e2b] shadow-xs'
            : isDarkMode
              ? 'bg-[#0f212e] border-[#1c2d38] hover:bg-[#132733] text-[#e8edeb]'
              : 'bg-[#f5f8f6] border-[#edf2ef] hover:bg-[#edf2ef] text-[#1c2d38]'
        }`}
        title="View Server & Cluster Overview"
      >
        <Server
          className={`w-5 h-5 shrink-0 transition-colors ${
            isOverviewActive
              ? isDarkMode ? 'text-white' : 'text-[#001e2b]'
              : isDarkMode ? 'text-[#8899a6] group-hover:text-white' : 'text-[#5c768d] group-hover:text-[#1c2d38]'
          }`}
        />
        <span className="font-bold text-base sm:text-lg tracking-wide text-center flex-1 px-3">
          Overview
        </span>
        <ChevronRight
          className={`w-5 h-5 shrink-0 transition-transform ${
            isOverviewActive
              ? isDarkMode ? 'text-white translate-x-0.5' : 'text-[#001e2b] translate-x-0.5'
              : 'text-[#8899a6] group-hover:translate-x-0.5'
          }`}
        />
      </Link>

      {/* Search Collections Filter */}
      <div
        className={`p-3 border-b ${
          isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
        }`}
      >
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8899a6] absolute left-2.5 top-2 pointer-events-none" />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Filter collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-8 pr-2.5 py-1 text-xs border rounded placeholder-[#8899a6] focus:outline-none ${
              isDarkMode
                ? 'bg-[#132733] border-[#21313c] text-white focus:ring-1 focus:ring-[#5c768d]'
                : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
            }`}
          />
        </div>
      </div>

      {/* Databases & Collections Tree with Sticky Header */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Sticky Databases Header & Create Button */}
        <div
          className={`sticky top-0 z-10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between border-b backdrop-blur-md shadow-xs ${
            isDarkMode
              ? 'bg-[#0b1a24]/95 border-[#1c2d38] text-[#8899a6]'
              : 'bg-[#fbfcfb]/95 border-[#edf2ef] text-[#5c768d]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className={isDarkMode ? 'text-white' : 'text-[#1c2d38]'}>Databases</span>
            <span className="text-[10px] text-[#8899a6] font-mono">({databases.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateDbModalOpen(true)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border shadow-xs ${
              isDarkMode
                ? 'text-white border-[#21313c] bg-[#132733] hover:bg-[#1a3444]'
                : 'text-[#21313c] border-[#d8e2dc] bg-white hover:bg-[#edf2ef]'
            }`}
            title="Create Database"
          >
            <Plus className="w-3 h-3 text-[#5c768d] dark:text-[#8899a6]" />
            <span>Create</span>
          </button>
        </div>

        {/* Database List Items */}
        <div className="p-2 space-y-1">

        {databases.map((db) => {
          const isCollapsed = Boolean(collapsedDbs[db.name]);
          const matchingCollections = db.collections.filter((c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (searchTerm && matchingCollections.length === 0) return null;

          const dbPath = `/databases/${encodeURIComponent(db.name)}`;
          const isDbActive =
            pathname === dbPath || (pathname.startsWith(dbPath) && !pathname.includes('/collections/'));

          return (
            <div key={db.name} className="space-y-0.5">
              {/* Database Folder Item - Links directly to /databases/[database] */}
              <div
                className={`w-full flex items-center gap-1 px-1.5 py-1 rounded text-left group transition-colors ${
                  isDbActive
                    ? isDarkMode
                      ? 'bg-[#1a3344] text-white font-semibold shadow-xs'
                      : 'bg-[#e4ebf0] text-[#001e2b] font-semibold shadow-xs'
                    : isDarkMode
                      ? 'hover:bg-[#132733] text-[#e8edeb]'
                      : 'hover:bg-[#edf4f0] text-[#1c2d38]'
                }`}
              >
                {/* Chevron: toggles expand/collapse */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDb(db.name);
                  }}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer text-[#8899a6]"
                  title={isCollapsed ? 'Expand collections' : 'Collapse collections'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Link to database table view */}
                <Link
                  href={dbPath}
                  onClick={() => {
                    if (isCollapsed) toggleDb(db.name);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 shrink-0 text-[#5c768d]" />
                  <span className="font-semibold text-xs truncate flex-1">{db.name}</span>
                  <span className="text-[10px] text-[#8899a6] font-mono pr-1">
                    {db.collections.length}
                  </span>
                </Link>
              </div>

              {/* Collections inside Database */}
              {!isCollapsed && (
                <div className="pl-5 space-y-0.5">
                  {matchingCollections.length === 0 ? (
                    <div className="px-2.5 py-1 text-[11px] text-[#8899a6] italic">
                      No collections
                    </div>
                  ) : (
                    matchingCollections.map((coll) => {
                      const collPath = `/databases/${encodeURIComponent(db.name)}/collections/${encodeURIComponent(coll.name)}`;
                      const isCollSelected = pathname.startsWith(collPath);

                      return (
                        <Link
                          key={coll.name}
                          href={collPath}
                          onClick={() => setIsMobileSidebarOpen(false)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                            isCollSelected
                              ? isDarkMode
                                ? 'bg-[#1a3344] text-white font-semibold shadow-xs'
                                : 'bg-[#e4ebf0] text-[#001e2b] font-semibold shadow-xs'
                              : isDarkMode
                                ? 'text-[#a0aaa2] hover:bg-[#132733] hover:text-white'
                                : 'text-[#445b6d] hover:bg-[#edf2ef] hover:text-[#1c2d38]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Folder
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isCollSelected
                                  ? isDarkMode
                                    ? 'text-white'
                                    : 'text-[#001e2b]'
                                  : 'text-[#8899a6]'
                              }`}
                            />
                            <span className="truncate text-xs">{coll.name}</span>
                          </div>
                          <span className="text-[10px] text-[#8899a6] font-mono shrink-0 pl-1">
                            {coll.count >= 1000
                              ? `${(coll.count / 1000).toFixed(1)}K`
                              : coll.count}
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        </div>
      </div>
    </aside>
  );
}
