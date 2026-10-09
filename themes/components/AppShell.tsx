'use client';

import React, { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopPanel } from '@/components/TopPanel';
import { CreateDatabaseModal } from '@/components/CreateDatabaseModal';
import { HelpModal } from '@/components/HelpModal';
import { DisconnectModal } from '@/components/DisconnectModal';
import { LogoutModal } from '@/components/LogoutModal';
import { GlobalLoader } from '@/components/GlobalLoader';
import { useDatabase } from '@/context/DatabaseContext';
import { apiClient } from '@/lib/api-client';
import { X, Unplug } from 'lucide-react';

export function AppShell({ children }: { children: ReactNode }) {
  const {
    theme,
    isConnected,
    refreshDatabases,
    setIsConnected,
    showToast,
    dismissToast,
    triggerToast,
    isCreateDbModalOpen,
    setIsCreateDbModalOpen,
    createDatabase,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isDisconnectModalOpen,
    setIsDisconnectModalOpen,
    isLogoutModalOpen,
    setIsLogoutModalOpen,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useDatabase();

  const isDarkMode = theme === 'dark';

  const handleDisconnect = async () => {
    try { await apiClient.connection('DELETE'); setIsConnected(false); triggerToast('Disconnected from Overview instance'); }
    catch (error) { triggerToast((error as Error).message); }
  };
  const handleLogout = async () => {
    await handleDisconnect();
  };
  const handleReconnect = async () => {
    try { await apiClient.connection('POST'); await refreshDatabases(); setIsConnected(true); triggerToast('Reconnected to PawMongo Overview instance'); }
    catch (error) { triggerToast((error as Error).message); }
  };

  return (
    <div
      suppressHydrationWarning
      className={`flex h-screen w-screen overflow-hidden select-none transition-colors ${
        isDarkMode ? 'bg-[#001e2b] text-[#e8edeb]' : 'bg-[#f9fbfa] text-[#1c2d38]'
      }`}
    >
      {/* Global Navigation & API Action Loader */}
      <GlobalLoader />

      {/* 1. LEFT SECTION: TOP TO BOTTOM (Desktop Sidebar) */}
      <div className="hidden md:flex h-full shrink-0 z-20">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Backdrop & Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div
            className={`relative z-10 w-72 h-full shadow-2xl flex flex-col ${
              isDarkMode ? 'bg-[#0b1a24]' : 'bg-white'
            }`}
          >
            <div
              className={`flex justify-end p-2 border-b ${
                isDarkMode ? 'border-[#1c2d38]' : 'border-[#edf2ef]'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      {/* 2. RIGHT SECTION: STARTS AFTER LEFT PANEL */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden">
        {/* Top Header Panel (Starts after left panel) */}
        <TopPanel />

        {/* Disconnected Notice Banner */}
        {!isConnected && (
          <div className="w-full bg-[#dc2626] text-white px-4 py-1.5 text-xs flex items-center justify-between shrink-0 shadow-xs z-20">
            <div className="flex items-center gap-2">
              <Unplug className="w-3.5 h-3.5 shrink-0" />
              <span>Connection to Overview (localhost:27017) is currently disconnected.</span>
            </div>
            <button
              type="button"
              onClick={handleReconnect}
              className="px-2.5 py-0.5 rounded bg-white text-[#dc2626] font-semibold text-xs hover:bg-neutral-100 cursor-pointer transition-colors"
            >
              Reconnect Now
            </button>
          </div>
        )}

        {/* 3. MAIN COMPONENT AREA (Routed children) */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>

      {/* Notification Toast */}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-[#001e2b] text-white border border-[#3b82f6] text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
          <span>{showToast}</span>
          <button
            type="button"
            onClick={dismissToast}
            className="ml-2 text-[#8899a6] hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create Database Dialog Modal */}
      <CreateDatabaseModal
        isOpen={isCreateDbModalOpen}
        onClose={() => setIsCreateDbModalOpen(false)}
        onCreateDatabase={createDatabase}
      />

      {/* Help & Shortcuts Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Disconnect Confirmation Modal */}
      <DisconnectModal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        onDisconnect={handleDisconnect}
        isDarkMode={isDarkMode}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
