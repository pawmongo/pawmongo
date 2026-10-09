'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DatabaseMeta } from '@/lib/mongodb-mock-data';
import { apiClient } from '@/lib/api-client';

interface DatabaseContextType {
  databases: DatabaseMeta[];
  refreshDatabases: () => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  toggleTheme: () => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  createDatabase: (dbName: string, collName: string, options?: Record<string,unknown>) => Promise<void> | void;
  createCollection: (dbName: string, collName: string) => Promise<void> | void;
  dropCollection: (dbName: string, collName: string) => Promise<void> | void;
  dropDatabase: (dbName: string) => Promise<void> | void;
  showToast: string | null;
  triggerToast: (msg: string) => void;
  dismissToast: () => void;
  isLoading: boolean;
  loadingMessage: string | null;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  triggerLoading: (durationMs?: number, message?: string) => void;
  isCreateDbModalOpen: boolean;
  setIsCreateDbModalOpen: (open: boolean) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (open: boolean) => void;
  isDisconnectModalOpen: boolean;
  setIsDisconnectModalOpen: (open: boolean) => void;
  isLogoutModalOpen: boolean;
  setIsLogoutModalOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [databases, setDatabases] = useState<DatabaseMeta[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isConnected, setIsConnected] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  // Global loader state for clicks and API calls
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const [isCreateDbModalOpen, setIsCreateDbModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const startLoading = (message = 'Processing request...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setLoadingMessage(null);
  };

  const triggerLoading = (durationMs = 450, message = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLoadingMessage(null);
    }, durationMs);
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const dismissToast = () => setShowToast(null);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Synchronize dark class to html document element so all Tailwind dark: variants work
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const refreshDatabases = useCallback(async () => {
    const data = await apiClient.getDatabases();
    setDatabases(data);
    setIsConnected(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    apiClient.connection().then(async ({connected}) => {
      if (!mounted) return;
      setIsConnected(connected);
      if (connected) await refreshDatabases();
    }).catch((error) => { if (mounted) triggerToast(error.message); });
    return () => { mounted = false; };
  }, [refreshDatabases]);

  const runMutation = async (message: string, action: () => Promise<unknown>) => {
    startLoading(message);
    try { await action(); await refreshDatabases(); triggerToast(message.replace('...', ' completed')); }
    catch (error) { triggerToast((error as Error).message); throw error; }
    finally { stopLoading(); }
  };
  const createDatabase = (db: string, coll: string, options?:Record<string,unknown>) => runMutation(`Creating database "${db}"...`, () => apiClient.createDatabase(db,coll,options));
  const createCollection = (db: string, coll: string) => runMutation(`Creating collection "${coll}"...`, () => apiClient.createCollection(db,coll));
  const dropCollection = (db: string, coll: string) => runMutation(`Dropping collection "${coll}"...`, () => apiClient.dropCollection(db,coll));
  const dropDatabase = (db: string) => runMutation(`Dropping database "${db}"...`, () => apiClient.dropDatabase(db));

  return (
    <DatabaseContext.Provider
      value={{
        databases,
        refreshDatabases,
        theme,
        setTheme,
        toggleTheme,
        isConnected,
        setIsConnected,
        createDatabase,
        createCollection,
        dropCollection,
        dropDatabase,
        showToast,
        triggerToast,
        dismissToast,
        isLoading,
        loadingMessage,
        startLoading,
        stopLoading,
        triggerLoading,
        isCreateDbModalOpen,
        setIsCreateDbModalOpen,
        isHelpModalOpen,
        setIsHelpModalOpen,
        isDisconnectModalOpen,
        setIsDisconnectModalOpen,
        isLogoutModalOpen,
        setIsLogoutModalOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
