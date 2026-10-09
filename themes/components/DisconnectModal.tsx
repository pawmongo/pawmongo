'use client';

import React from 'react';
import { Unplug, AlertTriangle, X } from 'lucide-react';

interface DisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisconnect: () => void;
  isDarkMode?: boolean;
}

export function DisconnectModal({
  isOpen,
  onClose,
  onDisconnect,
  isDarkMode = false,
}: DisconnectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode
            ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
            : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#b45309]/15 text-[#f59e0b] flex items-center justify-center">
              <Unplug className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold">Disconnect from Server</h2>
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
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-3">
          <div
            className={`p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
              isDarkMode
                ? 'bg-[#1a2318] border-[#3a582e] text-[#b8f5a6]'
                : 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Active Server Connection</p>
              <p className="text-[11px] opacity-90">
                You are currently connected to <span className="font-mono font-bold">Overview</span> (<span className="font-mono">mongodb://localhost:27017</span>).
              </p>
            </div>
          </div>

          <p className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
            Disconnecting will pause database listeners and query pooling. You can reconnect at any time using the Reconnect button in the top panel.
          </p>
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-end gap-2.5 px-5 py-3.5 border-t ${
            isDarkMode ? 'border-[#1c2d38] bg-[#07131d]' : 'border-[#edf2ef] bg-[#f5f8f6]'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
              isDarkMode
                ? 'border-[#21313c] text-[#8899a6] hover:text-white hover:bg-[#132733]'
                : 'border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38] hover:bg-white'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onDisconnect();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-xs transition-colors cursor-pointer"
          >
            <Unplug className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
}
