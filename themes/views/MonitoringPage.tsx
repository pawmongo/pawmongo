'use client';

import React from 'react';
import { useParams } from '@/lib/navigation';
import { MonitoringView } from '@/components/MonitoringView';

export default function MonitoringRoute() {
  const params = useParams();
  const rawDb = params?.database;
  const rawColl = params?.collection;

  const dbName = rawDb
    ? decodeURIComponent(Array.isArray(rawDb) ? rawDb[0] : rawDb)
    : 'sample_training';
  const collName = rawColl
    ? decodeURIComponent(Array.isArray(rawColl) ? rawColl[0] : rawColl)
    : 'companies';

  return <MonitoringView databaseName={dbName} collectionName={collName} />;
}
