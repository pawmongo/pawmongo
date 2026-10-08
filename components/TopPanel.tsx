'use client';

import React from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Sun,
  Moon,
  Unplug,
  LogOut,
  Menu,
  WifiOff,
  RotateCcw,
  Download
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';

export function TopPanel() {
  const {
    theme,
    toggleTheme,
    isConnected,
    setIsConnected,
    triggerToast,
    setIsHelpModalOpen,
    setIsDisconnectModalOpen,
    setIsLogoutModalOpen,
    setIsMobileSidebarOpen,
  } = useDatabase();

  const isDarkMode = theme === 'dark';

  return (
    <header
      className={`w-full h-12 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 select-none z-30 transition-colors ${
        isDarkMode
          ? 'bg-[#0b1a24] border-[#1c2d38] text-[#e8edeb]'
          : 'bg-white border-[#edf2ef] text-[#1c2d38]'
      }`}
    >
      {/* Left Section: Mobile Menu Toggle only (Server indicator removed as requested) */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          className={`md:hidden p-1.5 rounded-md transition-colors cursor-pointer ${
            isDarkMode
              ? 'hover:bg-[#132733] text-[#8899a6] hover:text-white'
              : 'hover:bg-[#edf2ef] text-[#5c768d] hover:text-[#1c2d38]'
          }`}
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Right Section: Disconnected Banner, Help, Theme Icon, Disconnect, Logout */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Reconnect button if disconnected */}
        {!isConnected && (
          <div className="flex items-center gap-1.5 mr-1 sm:mr-2">
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-medium">
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">Disconnected</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsConnected(true);
                triggerToast('Reconnected to phpMongo instance');
              }}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border border-[#d8e2dc] dark:border-[#21313c] bg-white dark:bg-[#132733] text-[#1c2d38] dark:text-[#e8edeb] hover:bg-[#f4f7f5] dark:hover:bg-[#1c3344] cursor-pointer shadow-xs transition-colors"
              title="Reconnect to server"
            >
              <RotateCcw className="w-3 h-3 text-[#5c768d]" />
              <span>Reconnect</span>
            </button>
          </div>
        )}

        {/* Download Project (.zip) for saving/uploading to Google Drive */}
        <a
          href="/api/export-zip"
          download="mongodb-compass-codebase.zip"
          onClick={() => triggerToast('Generating and downloading full project ZIP...')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[#0062d2]/40 bg-[#0062d2]/10 hover:bg-[#0062d2]/20 text-[#0062d2] dark:text-[#38bdf8] dark:border-[#38bdf8]/40 dark:bg-[#38bdf8]/10 dark:hover:bg-[#38bdf8]/20 transition-all cursor-pointer shadow-xs mr-1"
          title="Download complete project source code (.zip) to upload to Google Drive"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="font-semibold text-[11px] sm:text-xs">Download Project (.zip)</span>
        </a>

        {/* 1. Help Icon */}
        <button
          type="button"
          onClick={() => setIsHelpModalOpen(true)}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isDarkMode
              ? 'hover:bg-[#132733] text-[#8899a6] hover:text-white'
              : 'hover:bg-[#edf2ef] text-[#5c768d] hover:text-[#1c2d38]'
          }`}
          title="Keyboard Shortcuts & Help (Ctrl+/)"
        >
          <HelpCircle className="w-4 h-4 transition-colors" />
        </button>

        {/* 2. Theme Change Icon (Sun / Moon) - Completely transparent / No background */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-1.5 rounded-md transition-colors cursor-pointer bg-transparent hover:bg-transparent ${
            isDarkMode
              ? 'text-amber-400 hover:text-amber-300'
              : 'text-[#0062d2] hover:text-[#0051b3]'
          }`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 transition-transform duration-200 hover:scale-110" />
          ) : (
            <Moon className="w-4 h-4 transition-transform duration-200 hover:scale-110" />
          )}
        </button>

        {/* 3. Disconnect Icon */}
        <button
          type="button"
          onClick={() => setIsDisconnectModalOpen(true)}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isDarkMode
              ? 'hover:bg-[#132733] text-[#8899a6] hover:text-amber-400'
              : 'hover:bg-[#edf2ef] text-[#5c768d] hover:text-amber-600'
          }`}
          title="Disconnect from Current Instance"
        >
          <Unplug className="w-4 h-4 transition-colors" />
        </button>

        {/* 4. Logout Icon */}
        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isDarkMode
              ? 'hover:bg-[#132733] text-[#8899a6] hover:text-red-400'
              : 'hover:bg-[#edf2ef] text-[#5c768d] hover:text-red-600'
          }`}
          title="Logout from phpMongo"
        >
          <LogOut className="w-4 h-4 transition-colors" />
        </button>
      </div>
    </header>
  );
}
