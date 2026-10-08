import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-db';

export async function GET() {
  try {
    const overview = mockStore.getServerOverview();
    return NextResponse.json({ success: true, overview });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
