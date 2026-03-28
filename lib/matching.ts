import type { Buyer, Listing } from '@prisma/client';
import { parseJsonArray } from '@/lib/utils';

function overlap(a: string[], b: string[]) {
  const aset = new Set(a.map((x) => x.toLowerCase()));
  return b.some((x) => aset.has(x.toLowerCase()));
}

function sizeScore(listing: Listing, buyer: Buyer) {
  const target = listing.askingPrice ?? listing.ebitda ?? listing.revenue ?? 0;
  if (!target) return 10;
  const min = buyer.minEv ?? buyer.minEbitda ?? buyer.minRevenue ?? 0;
  const max = buyer.maxEv ?? buyer.maxEbitda ?? buyer.maxRevenue ?? Number.MAX_SAFE_INTEGER;
  if (target >= min && target <= max) return 20;
  const near = target >= min * 0.8 && target <= max * 1.2;
  return near ? 10 : 0;
}

export function scoreBuyerForListing(listing: Listing, buyer: Buyer) {
  const listingIndustry = [listing.industry, listing.subindustry].filter(Boolean) as string[];
  const buyerIndustry = [
    ...parseJsonArray(buyer.industriesOfInterest),
    ...parseJsonArray(buyer.subindustriesOfInterest)
  ];
  const industryScore = overlap(listingIndustry, buyerIndustry)
    ? 30
    : buyerIndustry.some((x) => x.toLowerCase() === listing.industry.toLowerCase())
      ? 22
      : 0;

  const geographyScore = overlap(
    [listing.locationCountry, listing.locationStateProvince, listing.locationCity].filter(Boolean) as string[],
    parseJsonArray(buyer.geographyOfInterest)
  )
    ? 10
    : 0;

  const structureScore = listing.structureType && parseJsonArray(buyer.structurePreferences)
    .map((x) => x.toLowerCase())
    .includes(listing.structureType.toLowerCase())
    ? 15
    : 0;

  const buyerTypeScore = parseJsonArray(listing.targetBuyerTypes)
    .map((x) => x.toLowerCase())
    .includes((buyer.buyerType || '').toLowerCase())
    ? 15
    : 0;

  const activityScore = buyer.lastActivityDate
    ? (Date.now() - new Date(buyer.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24) <= 90
      ? 5
      : 2
    : 0;

  const relationshipScore = Math.min(5, Math.round((buyer.relationshipStrengthScore || 0) / 2));
  const finalSizeScore = sizeScore(listing, buyer);
  const totalScore = industryScore + finalSizeScore + geographyScore + structureScore + buyerTypeScore + activityScore + relationshipScore;

  const reasons = [
    industryScore ? 'strong industry fit' : null,
    finalSizeScore >= 20 ? 'size fits target range' : finalSizeScore > 0 ? 'size is close to target range' : null,
    geographyScore ? 'geography aligns' : null,
    structureScore ? 'preferred deal structure matches' : null,
    buyerTypeScore ? `buyer type fits (${buyer.buyerType})` : null,
    activityScore ? 'recently active buyer' : null
  ].filter(Boolean);

  return {
    totalScore,
    industryScore,
    sizeScore: finalSizeScore,
    geographyScore,
    structureScore,
    buyerTypeScore,
    activityScore,
    relationshipScore,
    explanationText: reasons.length ? `${reasons.join(', ')}.` : 'Low-confidence match.'
  };
}
