'use client';

import React from 'react';
import { X, Activity, Server, Cpu, HardDrive } from 'lucide-react';

interface MonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MonitoringModal({ isOpen, onClose }: MonitoringModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0b1a24] rounded-lg shadow-2xl border border-[#d8ece2] dark:border-[#1c2d38] w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edeb] dark:border-[#1c2d38]">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0062d2] dark:text-[#38bdf8]" />
            <div>
              <h3 className="text-base font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Cluster Real-Time Monitoring</h3>
              <p className="text-xs text-[#5c768d] dark:text-[#8899a6] mt-0.5">
                Live metrics for cluster (sample_training)
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
          {/* Top KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3.5 bg-[#f6faf8] dark:bg-[#132733] border border-[#d8ece2] dark:border-[#21313c] rounded-lg">
              <span className="block text-[11px] text-[#5c768d] dark:text-[#8899a6] uppercase font-semibold">Operations / sec</span>
              <strong className="text-xl font-bold text-[#0062d2] dark:text-[#38bdf8] mt-1 block">142 op/s</strong>
              <span className="text-[11px] text-[#8899a6]">Query: 118 | Insert: 24</span>
            </div>
            <div className="p-3.5 bg-[#f6faf8] dark:bg-[#132733] border border-[#d8ece2] dark:border-[#21313c] rounded-lg">
              <span className="block text-[11px] text-[#5c768d] dark:text-[#8899a6] uppercase font-semibold">Active Connections</span>
              <strong className="text-xl font-bold text-[#1c2d38] dark:text-[#e8edeb] mt-1 block">18 / 500</strong>
              <span className="text-[11px] text-[#8899a6]">3.6% connection pool</span>
            </div>
            <div className="p-3.5 bg-[#f6faf8] dark:bg-[#132733] border border-[#d8ece2] dark:border-[#21313c] rounded-lg">
              <span className="block text-[11px] text-[#5c768d] dark:text-[#8899a6] uppercase font-semibold">RAM Usage</span>
              <strong className="text-xl font-bold text-[#1c2d38] dark:text-[#e8edeb] mt-1 block">342 MB / 1 GB</strong>
              <span className="text-[11px] text-[#8899a6]">WiredTiger cache: 210 MB</span>
            </div>
            <div className="p-3.5 bg-[#f6faf8] dark:bg-[#132733] border border-[#d8ece2] dark:border-[#21313c] rounded-lg">
              <span className="block text-[11px] text-[#5c768d] dark:text-[#8899a6] uppercase font-semibold">Disk Storage</span>
              <strong className="text-xl font-bold text-[#1c2d38] dark:text-[#e8edeb] mt-1 block">512 MB Free</strong>
              <span className="text-[11px] text-[#8899a6]">Total storage: 1.0 GB</span>
            </div>
          </div>

          {/* Metric Charts Simulation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-[#07131d] border border-[#e8edeb] dark:border-[#1c2d38] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Opcounters (reads & writes)</span>
                <span className="text-[11px] text-[#5c768d] dark:text-[#8899a6] font-mono">Normal (99.9% health)</span>
              </div>
              <div className="h-32 flex items-end gap-1.5 pt-4">
                {[42, 55, 38, 70, 62, 85, 49, 90, 78, 65, 82, 95, 88, 72, 60, 75, 89, 94].map((val, i) => (
                  <div key={i} className="flex-1 bg-[#eaf1f7] dark:bg-[#132733] hover:bg-[#0062d2] dark:hover:bg-[#38bdf8] rounded-t transition-colors h-full flex items-end">
                    <div
                      className={`w-full bg-[#0062d2] dark:bg-[#38bdf8] rounded-t ${
                        val >= 90 ? 'h-[90%]' : val >= 80 ? 'h-[80%]' : val >= 70 ? 'h-[70%]' : val >= 60 ? 'h-[60%]' : val >= 50 ? 'h-[50%]' : val >= 40 ? 'h-[40%]' : 'h-[30%]'
                      }`}
                      title={`${val} ops`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-[#07131d] border border-[#e8edeb] dark:border-[#1c2d38] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Network I/O</span>
                <span className="text-[11px] text-[#8899a6]">In: 2.1 MB/s | Out: 6.4 MB/s</span>
              </div>
              <div className="h-32 flex items-end gap-1.5 pt-4">
                {[30, 45, 60, 52, 40, 75, 68, 80, 55, 62, 70, 85, 64, 50, 77, 83, 72, 90].map((val, i) => (
                  <div key={i} className="flex-1 bg-[#eaf1f7] dark:bg-[#132733] hover:bg-[#0062d2] dark:hover:bg-[#38bdf8] rounded-t transition-colors h-full flex items-end">
                    <div
                      className={`w-full bg-[#0062d2] dark:bg-[#38bdf8] rounded-t ${
                        val >= 90 ? 'h-[90%]' : val >= 80 ? 'h-[80%]' : val >= 70 ? 'h-[70%]' : val >= 60 ? 'h-[60%]' : val >= 50 ? 'h-[50%]' : val >= 40 ? 'h-[40%]' : 'h-[30%]'
                      }`}
                      title={`${val} KB/s`}
                    />
                  </div>
                ))}
              </div>
            </div>
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
