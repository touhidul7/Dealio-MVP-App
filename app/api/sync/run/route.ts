import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runGhlSync, runGoogleSheetsSync } from '@/lib/sync';
import { refreshAllMatches } from '@/lib/match-jobs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { type?: 'google' | 'ghl' | 'all' };
  try {
    if (body.type === 'google') {
      await runGoogleSheetsSync();
      await refreshAllMatches();
      return NextResponse.json({ ok: true, message: 'Google sync completed.' });
    }
    if (body.type === 'ghl') {
      const result = await runGhlSync();
      await refreshAllMatches();
      return NextResponse.json({
        ok: true,
        message:
          result.mode === 'real'
            ? `GHL sync completed. Imported ${result.imported} contact(s), skipped ${result.skippedByTag} by tag filter.`
            : `GHL sync ran in mock mode. Imported ${result.imported} mock record(s).`
      });
    }
    await runGoogleSheetsSync();
    const ghl = await runGhlSync();
    await refreshAllMatches();
    return NextResponse.json({
      ok: true,
      message:
        ghl.mode === 'real'
          ? `Full sync completed. GHL imported ${ghl.imported}, skipped ${ghl.skippedByTag} by tag filter.`
          : 'Full sync completed. GHL ran in mock mode.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
