import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || current.role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: Role;
    ghlSubaccountId?: string;
    googleSheetSourceId?: string;
  };

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = (body.role || 'advisor') as Role;
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ ok: false, message: 'Missing required fields.' }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        activeStatus: true,
        ghlSubaccountId: String(body.ghlSubaccountId || '') || null,
        googleSheetSourceId: String(body.googleSheetSourceId || '') || null
      }
    });
    return NextResponse.json({ ok: true, message: 'User created.' });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Failed to create user.' },
      { status: 500 }
    );
  }
}
