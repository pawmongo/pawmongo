import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-db';

interface RouteContext {
  params: Promise<{
    database: string;
    collection: string;
  }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { database, collection } = await context.params;
    const dbName = decodeURIComponent(database);
    const collName = decodeURIComponent(collection);

    const indexes = mockStore.getIndexes(dbName, collName);
    return NextResponse.json({ success: true, indexes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { database, collection } = await context.params;
    const dbName = decodeURIComponent(database);
    const collName = decodeURIComponent(collection);

    const body = await req.json();
    const { name, keys, unique, background, sparse, ttlSeconds, partialFilter } = body;

    if (!keys || Object.keys(keys).length === 0) {
      return NextResponse.json({ success: false, error: 'At least one index key is required' }, { status: 400 });
    }

    const indexName = name || Object.entries(keys).map(([k, v]) => `${k}_${v}`).join('_');

    const newIndex = {
      name: indexName,
      keys,
      size: `${Math.floor(Math.random() * 20) + 8} KB`,
      unique: Boolean(unique),
      background: background ?? true,
      sparse: Boolean(sparse),
      ttlSeconds: ttlSeconds ? parseInt(ttlSeconds, 10) : undefined,
      partialFilter,
      usage: 0
    };

    const created = mockStore.createIndex(dbName, collName, newIndex);
    return NextResponse.json({ success: true, index: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { database, collection } = await context.params;
    const dbName = decodeURIComponent(database);
    const collName = decodeURIComponent(collection);

    const { searchParams } = new URL(req.url);
    const indexName = searchParams.get('name');

    if (!indexName) {
      return NextResponse.json({ success: false, error: 'Index name is required' }, { status: 400 });
    }

    if (indexName === '_id_') {
      return NextResponse.json({ success: false, error: 'Cannot drop default _id_ index' }, { status: 400 });
    }

    const dropped = mockStore.dropIndex(dbName, collName, indexName);
    return NextResponse.json({ success: dropped, message: `Index ${indexName} dropped` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
