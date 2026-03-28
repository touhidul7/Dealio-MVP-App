import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: Role;
    ghlSubaccountId?: string;
    googleSheetSourceId?: string;
    activeStatus?: boolean;
    newPassword?: string;
  };

  try {
    const data: Record<string, unknown> = {};
    if (body.firstName !== undefined) data.firstName = String(body.firstName).trim();
    if (body.lastName !== undefined) data.lastName = String(body.lastName).trim();
    if (body.email !== undefined) data.email = String(body.email).trim().toLowerCase();
    if (body.role !== undefined) data.role = body.role as Role;
    if (body.ghlSubaccountId !== undefined) data.ghlSubaccountId = String(body.ghlSubaccountId || '') || null;
    if (body.googleSheetSourceId !== undefined) data.googleSheetSourceId = String(body.googleSheetSourceId || '') || null;
    if (body.activeStatus !== undefined) data.activeStatus = Boolean(body.activeStatus);
    if (body.newPassword) data.passwordHash = await bcrypt.hash(String(body.newPassword), 10);

    await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ ok: true, message: 'User updated.' });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Failed to update user.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (id === current.id) {
    return NextResponse.json({ ok: false, message: 'You cannot delete yourself.' }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: 'User deleted.' });
  } catch {
    await prisma.user.update({
      where: { id },
      data: { activeStatus: false }
    });
    return NextResponse.json({ ok: true, message: 'User could not be deleted; deactivated instead.' });
  }
}
