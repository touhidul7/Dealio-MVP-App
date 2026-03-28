import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getValidGoogleAccessToken } from '@/lib/oauth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const token = await getValidGoogleAccessToken();
  const url = new URL(request.url);
  const sheetId = url.searchParams.get('sheetId');
  if (!token || !sheetId) return NextResponse.json({ tabs: [] });

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) return NextResponse.json({ tabs: [] });
  const data = (await response.json()) as { sheets?: Array<{ properties?: { title?: string } }> };
  return NextResponse.json({
    tabs: (data.sheets || []).map((s) => s.properties?.title).filter(Boolean)
  });
}
