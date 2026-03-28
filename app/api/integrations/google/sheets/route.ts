import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getValidGoogleAccessToken } from '@/lib/oauth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const token = await getValidGoogleAccessToken();
  if (!token) return NextResponse.json({ sheets: [] });

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%22application%2Fvnd.google-apps.spreadsheet%22&fields=files(id%2Cname)&pageSize=100',
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return NextResponse.json({ sheets: [] });
  const data = (await response.json()) as { files?: Array<{ id: string; name: string }> };
  return NextResponse.json({ sheets: data.files || [] });
}
