import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-db';

export async function GET() {
  try {
    const databases = mockStore.getDatabases();
    return NextResponse.json({ success: true, databases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, dbName, collName } = body;

    if (!dbName) {
      return NextResponse.json({ success: false, error: 'Database name is required' }, { status: 400 });
    }

    if (action === 'createCollection') {
      if (!collName) {
        return NextResponse.json({ success: false, error: 'Collection name is required' }, { status: 400 });
      }
      mockStore.createCollection(dbName, collName);
      return NextResponse.json({ success: true, message: `Collection ${collName} created` });
    }

    // Default action: createDatabase
    const db = mockStore.createDatabase(dbName, collName || 'default');
    return NextResponse.json({ success: true, database: db });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dbName = searchParams.get('dbName');
    const collName = searchParams.get('collName');

    if (!dbName) {
      return NextResponse.json({ success: false, error: 'Database name is required' }, { status: 400 });
    }

    if (collName) {
      mockStore.dropCollection(dbName, collName);
      return NextResponse.json({ success: true, message: `Collection ${collName} dropped` });
    }

    mockStore.dropDatabase(dbName);
    return NextResponse.json({ success: true, message: `Database ${dbName} dropped` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
