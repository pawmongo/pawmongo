'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DATABASES as INITIAL_DBS, DatabaseMeta } from '@/lib/mongodb-mock-data';
import { apiClient } from '@/lib/api-client';

interface DatabaseContextType {
  databases: DatabaseMeta[];
  refreshDatabases: () => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  toggleTheme: () => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  createDatabase: (dbName: string, collName: string) => Promise<void> | void;
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
  const [databases, setDatabases] = useState<DatabaseMeta[]>(INITIAL_DBS);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isConnected, setIsConnected] = useState(true);
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

  // Fetch databases from API route on mount
  const refreshDatabases = useCallback(async () => {
    try {
      const data = await apiClient.getDatabases();
      if (data && data.length > 0) {
        setDatabases(data);
      }
    } catch {
      // Fallback kept in state
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient.getDatabases()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setDatabases(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const createDatabase = async (dbName: string, collName: string) => {
    startLoading(`Creating database "${dbName}"...`);
    try {
      await apiClient.createDatabase(dbName, collName);
      await refreshDatabases();
      triggerToast(`Database "${dbName}" created successfully`);
    } catch {
      // Fallback local update
      const newDb: DatabaseMeta = {
        name: dbName,
        collections: [
          {
            name: collName,
            count: 0,
            sizeBytes: 0,
            avgObjSize: 0,
            indexes: 1,
          },
        ],
      };
      setDatabases((prev) => [newDb, ...prev]);
      triggerToast(`Database "${dbName}" created successfully`);
    } finally {
      stopLoading();
    }
  };

  const createCollection = async (dbName: string, collName: string) => {
    startLoading(`Creating collection "${collName}"...`);
    try {
      await apiClient.createCollection(dbName, collName);
      await refreshDatabases();
      triggerToast(`Collection "${collName}" created in "${dbName}"`);
    } catch {
      setDatabases((prev) =>
        prev.map((db) => {
          if (db.name === dbName) {
            const exists = db.collections.some((c) => c.name === collName);
            if (exists) return db;
            return {
              ...db,
              collections: [
                ...db.collections,
                {
                  name: collName,
                  count: 0,
                  sizeBytes: 0,
                  avgObjSize: 0,
                  indexes: 1,
                },
              ],
            };
          }
          return db;
        })
      );
      triggerToast(`Collection "${collName}" created in "${dbName}"`);
    } finally {
      stopLoading();
    }
  };

  const dropCollection = async (dbName: string, collName: string) => {
    startLoading(`Dropping collection "${collName}"...`);
    try {
      await apiClient.dropCollection(dbName, collName);
      await refreshDatabases();
      triggerToast(`Collection "${collName}" dropped`);
    } catch {
      setDatabases((prev) =>
        prev.map((db) => {
          if (db.name === dbName) {
            return {
              ...db,
              collections: db.collections.filter((c) => c.name !== collName),
            };
          }
          return db;
        })
      );
      triggerToast(`Collection "${collName}" dropped`);
    } finally {
      stopLoading();
    }
  };

  const dropDatabase = async (dbName: string) => {
    startLoading(`Dropping database "${dbName}"...`);
    try {
      await apiClient.dropDatabase(dbName);
      await refreshDatabases();
      triggerToast(`Database "${dbName}" dropped`);
    } catch {
      setDatabases((prev) => prev.filter((d) => d.name !== dbName));
      triggerToast(`Database "${dbName}" dropped`);
    } finally {
      stopLoading();
    }
  };

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
