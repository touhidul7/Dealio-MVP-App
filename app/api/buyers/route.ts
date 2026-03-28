import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { buyerReadWhere } from '@/lib/permissions';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const buyers = await prisma.buyer.findMany({
    where: buyerReadWhere(user),
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(buyers);
}
