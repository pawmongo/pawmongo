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

    const docs = mockStore.getDocuments(dbName, collName);
    const fieldMap = new Map<string, { type: string; count: number }>();

    const traverse = (obj: any, prefix = '', depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 4) return;
      if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
          traverse(obj[0], prefix, depth + 1);
        }
        return;
      }

      for (const [key, val] of Object.entries(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const detectedType = Array.isArray(val)
          ? 'Array'
          : val === null
          ? 'Null'
          : typeof val === 'object'
          ? 'Object'
          : typeof val === 'number'
          ? Number.isInteger(val)
            ? 'Int32'
            : 'Double'
          : typeof val === 'boolean'
          ? 'Boolean'
          : typeof val === 'string' && val.length === 24 && /^[0-9a-fA-F]{24}$/.test(val)
          ? 'ObjectId'
          : 'String';

        const existing = fieldMap.get(fullPath);
        if (existing) {
          existing.count += 1;
        } else {
          fieldMap.set(fullPath, { type: detectedType, count: 1 });
        }

        if (val && typeof val === 'object' && !Array.isArray(val)) {
          traverse(val, fullPath, depth + 1);
        }
      }
    };

    docs.forEach((doc) => traverse(doc));

    const totalDocs = docs.length;
    const columns = Array.from(fieldMap.entries())
      .map(([field, info]) => ({
        field,
        type: info.type,
        count: info.count,
        presencePct: totalDocs > 0 ? Math.round((info.count / totalDocs) * 100) : 100
      }))
      .sort((a, b) => (a.field === '_id' ? -1 : b.field === '_id' ? 1 : a.field.localeCompare(b.field)));

    return NextResponse.json({
      success: true,
      database: dbName,
      collection: collName,
      columns,
      totalColumns: columns.length,
      totalDocuments: totalDocs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
