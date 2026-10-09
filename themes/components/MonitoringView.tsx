'use client';

import React from 'react';
import {useServerMetrics} from '@/hooks/use-server-metrics';
import Link from '@/lib/navigation';
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  Radio,
  ChevronRight,
  ArrowLeft,
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';

interface MonitoringViewProps {
  databaseName: string;
  collectionName: string;
}

export function MonitoringView({ databaseName, collectionName }: MonitoringViewProps) {
  const { theme } = useDatabase();
  const {metrics,samples,number,mb}=useServerMetrics();
  const isDarkMode = theme === 'dark';

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
            <Activity className="w-3.5 h-3.5 text-[#5c768d]" />
            Monitoring
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8899a6]">
          <span className="flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#132733] text-[#5c768d] dark:text-[#8899a6]">
            Live Metrics Stream (1.0s)
          </span>
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
              <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-[#132733] text-[#1c2d38] dark:text-white border border-[#d8e2dc] dark:border-[#21313c] flex items-center justify-center shrink-0 shadow-xs">
                <Activity className="w-6 h-6 text-[#5c768d]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight">Real-Time Cluster & Query Monitoring</h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-[#132733] text-[#5c768d] dark:text-[#8899a6]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5c768d]" />
                    {metrics?.metricsAvailable ? "Live" : "Metrics unavailable"}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                  Targeting <code className="font-mono font-semibold">{databaseName}.{collectionName}</code> on <span className="font-mono">localhost:27017</span>
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

        {/* Real-Time KPI Cards (No green icons) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1">
              <Zap className="w-4 h-4 text-[#5c768d]" />
              <span className="font-semibold uppercase text-[11px]">Operations / sec</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#1c2d38] dark:text-white mt-1">
              {number(metrics?.rates?.ops)} op/s
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1 font-mono">
              Query: {number(metrics?.rates?.query)} | Insert: {number(metrics?.rates?.insert)} | Update: {number(metrics?.rates?.update)}
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1">
              <Radio className="w-4 h-4 text-[#0062d2]" />
              <span className="font-semibold uppercase text-[11px]">Active Connections</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#1c2d38] dark:text-white mt-1">
              {number(metrics?.connections?.current)} / {number(metrics?.connections ? metrics.connections.current + metrics.connections.available : null)}
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1 font-mono">
              {metrics?.connections ? (100 * metrics.connections.current / (metrics.connections.current + metrics.connections.available)).toFixed(1) : "—"}% connection pool utilized
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1">
              <Cpu className="w-4 h-4 text-[#7c3aed]" />
              <span className="font-semibold uppercase text-[11px]">RAM & WiredTiger Cache</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#1c2d38] dark:text-white mt-1">
              {number(metrics?.memory?.residentMB)} MB
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1 font-mono">
              Cache used: {mb(metrics?.cache?.["bytes currently in the cache"])} MB
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-[#8899a6] mb-1">
              <HardDrive className="w-4 h-4 text-[#e11d48]" />
              <span className="font-semibold uppercase text-[11px]">Disk Storage Free</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#1c2d38] dark:text-white mt-1">
              {mb(metrics?.storage?.freeBytes)} MB Free
            </div>
            <div className="text-[11px] text-[#8899a6] mt-1 font-mono">
              Total volume: {mb(metrics?.storage?.totalBytes)} MB
            </div>
          </div>
        </div>

        {/* Live Simulation Charts (Slate / Blue, no green) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Opcounters Chart */}
          <div
            className={`p-5 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c2d38] dark:text-white">
                  Opcounters (reads & writes / sec)
                </h3>
                <p className="text-[11px] text-[#8899a6] mt-0.5">
                  Real-time query execution frequency
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-[#132733] text-[#5c768d] dark:text-[#8899a6]">
                Normal
              </span>
            </div>

            <div className="h-44 flex items-end gap-1.5 pt-4">
              {samples.map(sample=>Math.max(0,Math.min(100,sample.ops))).map(
                (val, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-colors h-full flex items-end group relative ${
                      isDarkMode ? 'bg-[#132733] hover:bg-[#38bdf8]' : 'bg-[#e4ebf0] hover:bg-[#001e2b]'
                    }`}
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        val >= 90 ? 'h-[90%]' : val >= 80 ? 'h-[80%]' : val >= 70 ? 'h-[70%]' : val >= 60 ? 'h-[60%]' : val >= 50 ? 'h-[50%]' : val >= 40 ? 'h-[40%]' : val > 0 ? 'h-[30%]' : 'h-[0%]'
                      } ${
                        isDarkMode ? 'bg-[#38bdf8]' : 'bg-[#001e2b]'
                      }`}
                    />
                  </div>
                )
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#8899a6] font-mono mt-2 pt-2 border-t border-[#edf2ef] dark:border-[#1c2d38]">
              <span>-60s</span>
              <span>-30s</span>
              <span>Now</span>
            </div>
          </div>

          {/* Network I/O Chart */}
          <div
            className={`p-5 rounded-xl border ${
              isDarkMode ? 'bg-[#0b1a24] border-[#1c2d38]' : 'bg-white border-[#edf2ef] shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c2d38] dark:text-white">
                  Network Throughput (I/O)
                </h3>
                <p className="text-[11px] text-[#8899a6] mt-0.5">
                  In: {mb(metrics?.rates?.in)} MB/s · Out: {mb(metrics?.rates?.out)} MB/s
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0062d2]/10 text-[#0062d2]">
                Active
              </span>
            </div>

            <div className="h-44 flex items-end gap-1.5 pt-4">
              {samples.map(sample=>Math.max(0,Math.min(100,sample.network/1048576))).map(
                (val, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-colors h-full flex items-end group relative ${
                      isDarkMode ? 'bg-[#132733] hover:bg-[#38bdf8]' : 'bg-[#eaf1f7] hover:bg-[#0062d2]'
                    }`}
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        val >= 90 ? 'h-[90%]' : val >= 80 ? 'h-[80%]' : val >= 70 ? 'h-[70%]' : val >= 60 ? 'h-[60%]' : val >= 50 ? 'h-[50%]' : val >= 40 ? 'h-[40%]' : val > 0 ? 'h-[30%]' : 'h-[0%]'
                      } ${
                        isDarkMode ? 'bg-[#38bdf8]' : 'bg-[#0062d2]'
                      }`}
                    />
                  </div>
                )
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#8899a6] font-mono mt-2 pt-2 border-t border-[#edf2ef] dark:border-[#1c2d38]">
              <span>-60s</span>
              <span>-30s</span>
              <span>Now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
