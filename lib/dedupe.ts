import { prisma } from '@/lib/prisma';
import { normalizeCompany, normalizeEmail, normalizePhone } from '@/lib/utils';

export async function upsertBuyerFromSource(input: {
  sourceSystem: 'google_sheets' | 'ghl';
  sourceRecordId: string;
  sourceOwnerUserId?: string | null;
  sourceSubaccountId?: string | null;
  payload: Record<string, unknown>;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  buyerType?: string | null;
  industries?: string[];
  geographies?: string[];
  minEv?: number | null;
  maxEv?: number | null;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedCompany = normalizeCompany(input.company);
  const normalizedName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim().toLowerCase() || null;

  let buyer = normalizedEmail
    ? await prisma.buyer.findUnique({ where: { emailPrimary: normalizedEmail } })
    : null;

  let duplicateConfidenceScore = 0;
  let mergeReviewRequired = false;

  if (!buyer && normalizedPhone) {
    buyer = await prisma.buyer.findFirst({ where: { phonePrimary: normalizedPhone } });
    if (buyer) duplicateConfidenceScore = 0.75;
  }

  if (!buyer && normalizedName && normalizedCompany) {
    buyer = await prisma.buyer.findFirst({
      where: { fullName: normalizedName, companyName: normalizedCompany }
    });
    if (buyer) {
      duplicateConfidenceScore = 0.65;
      mergeReviewRequired = true;
    }
  }

  if (!buyer) {
    buyer = await prisma.buyer.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        fullName: normalizedName,
        companyName: normalizedCompany,
        emailPrimary: normalizedEmail,
        phonePrimary: normalizedPhone,
        buyerType: input.buyerType,
        industriesOfInterest: JSON.stringify(input.industries || []),
        subindustriesOfInterest: JSON.stringify([]),
        geographyOfInterest: JSON.stringify(input.geographies || []),
        structurePreferences: JSON.stringify([]),
        minEv: input.minEv,
        maxEv: input.maxEv,
        ownerUserId: input.sourceOwnerUserId || undefined,
        sourceSystem: input.sourceSystem,
        sourceRecordId: input.sourceRecordId,
        sourceSubaccountId: input.sourceSubaccountId || undefined,
        dedupeMasterKey: normalizedEmail || normalizedPhone || normalizedName || undefined
      }
    });
    duplicateConfidenceScore = 1;
  }

  await prisma.buyerSourceRecord.upsert({
    where: {
      sourceSystem_sourceRecordId: {
        sourceSystem: input.sourceSystem,
        sourceRecordId: input.sourceRecordId
      }
    },
    create: {
      sourceSystem: input.sourceSystem,
      sourceRecordId: input.sourceRecordId,
      sourceOwnerUserId: input.sourceOwnerUserId || undefined,
      sourceSubaccountId: input.sourceSubaccountId || undefined,
      rawPayloadJson: JSON.stringify(input.payload),
      normalizedEmail,
      normalizedPhone,
      normalizedCompany,
      normalizedName,
      linkedMasterBuyerId: buyer.id,
      duplicateConfidenceScore,
      duplicateStatus: mergeReviewRequired ? 'review_required' : 'linked',
      mergeReviewRequired
    },
    update: {
      rawPayloadJson: JSON.stringify(input.payload),
      normalizedEmail,
      normalizedPhone,
      normalizedCompany,
      normalizedName,
      linkedMasterBuyerId: buyer.id,
      duplicateConfidenceScore,
      duplicateStatus: mergeReviewRequired ? 'review_required' : 'linked',
      mergeReviewRequired,
      lastSyncTimestamp: new Date()
    }
  });

  return buyer;
}
