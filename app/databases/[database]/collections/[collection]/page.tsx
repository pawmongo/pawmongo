'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { DocumentSection } from '@/components/DocumentSection';
import { useDatabase } from '@/context/DatabaseContext';

export default function CollectionPage() {
  const params = useParams();
  const rawDb = params?.database;
  const rawColl = params?.collection;

  const dbName = rawDb
    ? decodeURIComponent(Array.isArray(rawDb) ? rawDb[0] : rawDb)
    : 'sample_training';
  const collName = rawColl
    ? decodeURIComponent(Array.isArray(rawColl) ? rawColl[0] : rawColl)
    : 'companies';

  const { theme, toggleTheme, setIsCreateDbModalOpen } = useDatabase();

  return (
    <DocumentSection
      key={`${dbName}.${collName}`}
      selectedDb={dbName}
      selectedCollection={collName}
      theme={theme}
      onToggleTheme={toggleTheme}
      onOpenCreateDatabase={() => setIsCreateDbModalOpen(true)}
    />
  );
}
