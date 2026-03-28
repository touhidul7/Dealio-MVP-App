import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { runGoogleSheetsSync, runGhlSync } from '@/lib/sync';
import { scoreBuyerForListing } from '@/lib/matching';

const prisma = new PrismaClient();

async function main() {
  await prisma.match.deleteMany();
  await prisma.listingShare.deleteMany();
  await prisma.buyerSourceRecord.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.integrationSetting.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(process.env.APP_DEMO_PASSWORD || 'password123', 10);

  const admin = await prisma.user.create({
    data: {
      id: 'seed-admin-1',
      firstName: 'Dealio',
      lastName: 'Admin',
      email: 'admin@dealio.local',
      passwordHash,
      role: Role.admin
    }
  });

  const advisor1 = await prisma.user.create({
    data: {
      id: 'seed-advisor-1',
      firstName: 'Ava',
      lastName: 'Morgan',
      email: 'ava@dealio.local',
      passwordHash,
      role: Role.advisor,
      ghlSubaccountId: 'sub_123',
      googleSheetSourceId: 'sheet_ops_1'
    }
  });

  const advisor2 = await prisma.user.create({
    data: {
      id: 'seed-advisor-2',
      firstName: 'Noah',
      lastName: 'Bennett',
      email: 'noah@dealio.local',
      passwordHash,
      role: Role.advisor,
      ghlSubaccountId: 'sub_555',
      googleSheetSourceId: 'sheet_ops_2'
    }
  });

  await prisma.listing.createMany({
    data: [
      {
        title: 'Ontario Home Healthcare Provider',
        listingType: 'native',
        status: 'active',
        ownerUserId: admin.id,
        assignedUserId: advisor1.id,
        industry: 'Healthcare',
        subindustry: 'Home Healthcare',
        locationCountry: 'Canada',
        locationStateProvince: 'Ontario',
        askingPrice: 6500000,
        revenue: 4200000,
        ebitda: 1100000,
        targetBuyerTypes: JSON.stringify(['pe', 'family_office', 'strategic']),
        structureType: 'majority',
        geographicTags: JSON.stringify(['Canada', 'Ontario']),
        industryTags: JSON.stringify(['Healthcare']),
        businessSummary: 'Recurring revenue home healthcare business with strong retention.'
      },
      {
        title: 'Florida Industrial Services Roll-up Opportunity',
        listingType: 'external',
        status: 'active',
        ownerUserId: admin.id,
        assignedUserId: advisor2.id,
        industry: 'Industrial Services',
        locationCountry: 'USA',
        locationStateProvince: 'Florida',
        askingPrice: 3200000,
        targetBuyerTypes: JSON.stringify(['operator', 'independent_sponsor']),
        structureType: 'asset_purchase',
        geographicTags: JSON.stringify(['USA', 'Florida']),
        industryTags: JSON.stringify(['Industrial Services']),
        sourcePlatform: 'BizBuySell',
        sourceUrl: 'https://example.com/opportunity/123',
        businessSummary: 'External tracked opportunity requiring advisor review.'
      }
    ]
  });

  const externalListing = await prisma.listing.findFirst({
    where: { listingType: 'external' }
  });
  if (externalListing) {
    await prisma.listingShare.create({
      data: {
        listingId: externalListing.id,
        userId: advisor1.id
      }
    });
  }

  await prisma.integrationSetting.create({
    data: {
      id: 'singleton',
      googleSheetTab: 'Sheet1',
      googleFieldMappingJson: JSON.stringify({
        first_name: 'first_name',
        last_name: 'last_name',
        email: 'email',
        phone: 'phone',
        company: 'company',
        buyer_type: 'buyer_type',
        industries: 'industry_interest',
        geographies: 'geography_interest',
        min_ev: 'min_ev',
        max_ev: 'max_ev',
        owner_user_id: 'owner_user_id'
      }),
      ghlApiBaseUrl: 'https://services.leadconnectorhq.com',
      ghlTagFiltersJson: JSON.stringify(['buyer-profile-sent', 'access-granted', 'nda-signed'])
    }
  });

  await runGoogleSheetsSync();
  await runGhlSync();

  const listings = await prisma.listing.findMany();
  const buyers = await prisma.buyer.findMany();

  for (const listing of listings) {
    for (const buyer of buyers) {
      const score = scoreBuyerForListing(listing, buyer);
      if (score.totalScore > 0) {
        await prisma.match.create({
          data: {
            listingId: listing.id,
            buyerId: buyer.id,
            ...score
          }
        });
      }
    }
  }
}

main().finally(async () => prisma.$disconnect());
