import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { sheetId?: string; tab?: string };
  await prisma.integrationSetting.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      googleSheetId: body.sheetId || null,
      googleSheetTab: body.tab || null
    },
    update: {
      googleSheetId: body.sheetId || null,
      googleSheetTab: body.tab || null
    }
  });
  return NextResponse.json({ ok: true });
}
