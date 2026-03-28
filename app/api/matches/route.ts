import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { matchReadWhere } from '@/lib/permissions';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const matches = await prisma.match.findMany({
    where: matchReadWhere(user),
    include: { listing: true, buyer: true },
    orderBy: { totalScore: 'desc' }
  });
  return NextResponse.json(matches);
}
