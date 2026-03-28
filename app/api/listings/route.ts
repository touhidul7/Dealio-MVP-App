import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { listingReadWhere } from '@/lib/permissions';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const listings = await prisma.listing.findMany({
    where: listingReadWhere(user),
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(listings);
}
