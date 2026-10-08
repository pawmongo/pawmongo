'use client';

import React from 'react';
import { LogOut, User, ShieldCheck, X } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  isDarkMode?: boolean;
}

export function LogoutModal({
  isOpen,
  onClose,
  onLogout,
  isDarkMode = false,
}: LogoutModalProps) {
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
            <div className="w-8 h-8 rounded-lg bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold">Log Out of phpMongo</h2>
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
            className={`p-3.5 rounded-lg border flex items-center gap-3 ${
              isDarkMode ? 'bg-[#132733]/50 border-[#21313c]' : 'bg-[#f7faf8] border-[#e4ebf0]'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#001e2b] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs">admin@localhost</span>
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[#3b82f6]/10 text-[#001e2b] dark:text-[#8899a6] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  Superuser
                </span>
              </div>
              <p className={`text-[11px] truncate ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
                phpMongo Local Authentication · Overview
              </p>
            </div>
          </div>

          <p className={`text-xs ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
            Are you sure you want to end your current session? You will need to log back in to access the database explorer.
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
              onLogout();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
