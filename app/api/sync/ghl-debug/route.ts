import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getGhlDebugSummary } from '@/lib/sync';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await getGhlDebugSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Failed to fetch GHL debug summary.' },
      { status: 500 }
    );
  }
}
