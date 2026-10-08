'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { VisualizeView } from '@/components/VisualizeView';

export default function VisualizeRoute() {
  const params = useParams();
  const rawDb = params?.database;
  const rawColl = params?.collection;

  const dbName = rawDb
    ? decodeURIComponent(Array.isArray(rawDb) ? rawDb[0] : rawDb)
    : 'sample_training';
  const collName = rawColl
    ? decodeURIComponent(Array.isArray(rawColl) ? rawColl[0] : rawColl)
    : 'companies';

  return <VisualizeView databaseName={dbName} collectionName={collName} />;
}
