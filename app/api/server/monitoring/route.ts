import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-db';

export async function GET() {
  try {
    const monitoring = mockStore.getServerMonitoring();
    return NextResponse.json({ success: true, monitoring });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
