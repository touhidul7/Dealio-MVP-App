import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, string>;
  const ghlTagFilters = String(body.ghlTagFilters || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  try {
    await prisma.integrationSetting.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        googleOauthClientId: body.googleOauthClientId || null,
        googleOauthClientSecret: body.googleOauthClientSecret || null,
        googleServiceAccountEmail: body.googleServiceAccountEmail || null,
        googleServiceAccountKey: body.googleServiceAccountKey || null,
        googleSheetId: body.googleSheetId || null,
        googleSheetTab: body.googleSheetTab || null,
        googleFieldMappingJson: (body.googleFieldMappingJson || '{}').trim() || '{}',
        ghlOauthClientId: body.ghlOauthClientId || null,
        ghlOauthClientSecret: body.ghlOauthClientSecret || null,
        ghlAuthorizeUrl: body.ghlAuthorizeUrl || null,
        ghlTokenUrl: body.ghlTokenUrl || null,
        ghlApiBaseUrl: body.ghlApiBaseUrl || null,
        ghlApiKey: body.ghlApiKey || null,
        ghlTagFiltersJson: JSON.stringify(ghlTagFilters)
      },
      update: {
        googleOauthClientId: body.googleOauthClientId || null,
        googleOauthClientSecret: body.googleOauthClientSecret || null,
        googleServiceAccountEmail: body.googleServiceAccountEmail || null,
        googleServiceAccountKey: body.googleServiceAccountKey || null,
        googleSheetId: body.googleSheetId || null,
        googleSheetTab: body.googleSheetTab || null,
        googleFieldMappingJson: (body.googleFieldMappingJson || '{}').trim() || '{}',
        ghlOauthClientId: body.ghlOauthClientId || null,
        ghlOauthClientSecret: body.ghlOauthClientSecret || null,
        ghlAuthorizeUrl: body.ghlAuthorizeUrl || null,
        ghlTokenUrl: body.ghlTokenUrl || null,
        ghlApiBaseUrl: body.ghlApiBaseUrl || null,
        ghlApiKey: body.ghlApiKey || null,
        ghlTagFiltersJson: JSON.stringify(ghlTagFilters)
      }
    });
    return NextResponse.json({ ok: true, message: 'Integration settings saved.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
