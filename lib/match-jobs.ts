import { prisma } from '@/lib/prisma';
import { scoreBuyerForListing } from '@/lib/matching';

export async function refreshMatchesForListing(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;

  const buyers = await prisma.buyer.findMany({ where: { activeStatus: true } });
  await prisma.match.deleteMany({ where: { listingId } });

  for (const buyer of buyers) {
    const score = scoreBuyerForListing(listing, buyer);
    if (score.totalScore <= 0) continue;
    await prisma.match.create({
      data: {
        listingId,
        buyerId: buyer.id,
        ...score
      }
    });
  }
}

export async function refreshAllMatches() {
  const listings = await prisma.listing.findMany({ where: { status: 'active' } });
  for (const listing of listings) {
    await refreshMatchesForListing(listing.id);
  }
}
