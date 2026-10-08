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

    let docs = mockStore.getDocuments(dbName, collName);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const sort = searchParams.get('sort');
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Basic query filtering if provided (e.g. { category_code: "web" })
    if (query && query.trim() && query !== '{}') {
      try {
        const parsed = JSON.parse(query);
        docs = docs.filter((doc) => {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'object' && v !== null) {
              // Handle simple operators like $gt, $lt, $regex
              const opKey = Object.keys(v)[0];
              const opVal = (v as any)[opKey];
              if (opKey === '$gt' && !((doc as any)[k] > opVal)) return false;
              if (opKey === '$gte' && !((doc as any)[k] >= opVal)) return false;
              if (opKey === '$lt' && !((doc as any)[k] < opVal)) return false;
              if (opKey === '$lte' && !((doc as any)[k] <= opVal)) return false;
              if (opKey === '$ne' && (doc as any)[k] === opVal) return false;
              if (opKey === '$regex') {
                const reg = new RegExp(opVal, 'i');
                if (!reg.test(String((doc as any)[k] || ''))) return false;
              }
            } else if ((doc as any)[k] !== v) {
              return false;
            }
          }
          return true;
        });
      } catch {
        // If query is not strict JSON, filter by text inclusion
        const qLower = query.toLowerCase().trim();
        docs = docs.filter((doc) => JSON.stringify(doc).toLowerCase().includes(qLower));
      }
    }

    const totalCount = docs.length;

    // Apply sort if given
    if (sort) {
      try {
        const parsedSort = JSON.parse(sort);
        const [sortKey, sortDir] = Object.entries(parsedSort)[0] as [string, number];
        docs.sort((a, b) => {
          const valA = (a as any)[sortKey];
          const valB = (b as any)[sortKey];
          if (valA === valB) return 0;
          if (valA === undefined) return 1;
          if (valB === undefined) return -1;
          return sortDir === -1 ? (valA > valB ? -1 : 1) : (valA > valB ? 1 : -1);
        });
      } catch {
        // Ignore invalid sort JSON
      }
    }

    const paginated = docs.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      documents: paginated,
      totalCount,
      database: dbName,
      collection: collName
    });
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

    if (Array.isArray(body.documents)) {
      const inserted = body.documents.map((d: any) => mockStore.insertDocument(dbName, collName, d));
      return NextResponse.json({ success: true, count: inserted.length, documents: inserted });
    }

    const doc = mockStore.insertDocument(dbName, collName, body.document || body);
    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { database, collection } = await context.params;
    const dbName = decodeURIComponent(database);
    const collName = decodeURIComponent(collection);

    const body = await req.json();
    const { id, document } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document id is required' }, { status: 400 });
    }

    const updated = mockStore.updateDocument(dbName, collName, id, document);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, document: updated });
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
    const id = searchParams.get('id');

    if (id) {
      const deleted = mockStore.deleteDocument(dbName, collName, id);
      return NextResponse.json({ success: deleted });
    }

    // Bulk delete by ids body
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.ids)) {
      body.ids.forEach((delId: string) => mockStore.deleteDocument(dbName, collName, delId));
      return NextResponse.json({ success: true, deletedCount: body.ids.length });
    }

    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
