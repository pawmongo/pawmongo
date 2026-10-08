'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { DatabaseView } from '@/components/DatabaseView';
import { useDatabase } from '@/context/DatabaseContext';

export default function DatabasePage() {
  const params = useParams();
  const rawDb = params?.database;
  const dbName = rawDb ? decodeURIComponent(Array.isArray(rawDb) ? rawDb[0] : rawDb) : '';
  const { databases } = useDatabase();

  const currentDb = databases.find((d) => d.name === dbName) || {
    name: dbName,
    collections: [],
  };

  return <DatabaseView database={currentDb} />;
}
