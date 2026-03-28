-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'advisor');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('native', 'advisor', 'external');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'active', 'on_hold', 'matched', 'archived');

-- CreateEnum
CREATE TYPE "VisibilityMode" AS ENUM ('private', 'match_only', 'shared');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "ghlSubaccountId" TEXT,
    "googleSheetSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "ownerUserId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "businessName" TEXT,
    "industry" TEXT NOT NULL,
    "subindustry" TEXT,
    "locationCity" TEXT,
    "locationStateProvince" TEXT,
    "locationCountry" TEXT,
    "askingPrice" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "ebitda" DOUBLE PRECISION,
    "sde" DOUBLE PRECISION,
    "employees" INTEGER,
    "businessSummary" TEXT,
    "recurringRevenuePercent" DOUBLE PRECISION,
    "businessModel" TEXT,
    "customerType" TEXT,
    "growthProfile" TEXT,
    "reasonForSale" TEXT,
    "targetBuyerTypes" TEXT NOT NULL,
    "minEv" DOUBLE PRECISION,
    "maxEv" DOUBLE PRECISION,
    "structureType" TEXT,
    "geographicTags" TEXT NOT NULL,
    "industryTags" TEXT NOT NULL,
    "confidentialityLevel" TEXT,
    "visibilityScope" TEXT,
    "sourceType" TEXT,
    "sourceUrl" TEXT,
    "sourcePlatform" TEXT,
    "sourceListingId" TEXT,
    "advisorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "companyName" TEXT,
    "emailPrimary" TEXT,
    "phonePrimary" TEXT,
    "website" TEXT,
    "linkedinUrl" TEXT,
    "buyerType" TEXT,
    "industriesOfInterest" TEXT NOT NULL,
    "subindustriesOfInterest" TEXT NOT NULL,
    "geographyOfInterest" TEXT NOT NULL,
    "minRevenue" DOUBLE PRECISION,
    "maxRevenue" DOUBLE PRECISION,
    "minEbitda" DOUBLE PRECISION,
    "maxEbitda" DOUBLE PRECISION,
    "minEv" DOUBLE PRECISION,
    "maxEv" DOUBLE PRECISION,
    "structurePreferences" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "sourceSubaccountId" TEXT,
    "relationshipStrengthScore" DOUBLE PRECISION,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityDate" TIMESTAMP(3),
    "visibilityMode" "VisibilityMode" NOT NULL DEFAULT 'shared',
    "dedupeMasterKey" TEXT,
    "duplicateGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerSourceRecord" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceSubaccountId" TEXT,
    "sourceOwnerUserId" TEXT,
    "rawPayloadJson" TEXT NOT NULL,
    "normalizedEmail" TEXT,
    "normalizedPhone" TEXT,
    "normalizedCompany" TEXT,
    "normalizedName" TEXT,
    "linkedMasterBuyerId" TEXT,
    "duplicateConfidenceScore" DOUBLE PRECISION,
    "duplicateStatus" TEXT,
    "mergeReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "importTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "industryScore" DOUBLE PRECISION NOT NULL,
    "sizeScore" DOUBLE PRECISION NOT NULL,
    "geographyScore" DOUBLE PRECISION NOT NULL,
    "structureScore" DOUBLE PRECISION NOT NULL,
    "buyerTypeScore" DOUBLE PRECISION NOT NULL,
    "activityScore" DOUBLE PRECISION NOT NULL,
    "relationshipScore" DOUBLE PRECISION NOT NULL,
    "explanationText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_emailPrimary_key" ON "Buyer"("emailPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerSourceRecord_sourceSystem_sourceRecordId_key" ON "BuyerSourceRecord"("sourceSystem", "sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_listingId_buyerId_key" ON "Match"("listingId", "buyerId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buyer" ADD CONSTRAINT "Buyer_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerSourceRecord" ADD CONSTRAINT "BuyerSourceRecord_linkedMasterBuyerId_fkey" FOREIGN KEY ("linkedMasterBuyerId") REFERENCES "Buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
