-- CreateTable
CREATE TABLE "ListingShare" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSetting" (
    "id" TEXT NOT NULL,
    "googleServiceAccountEmail" TEXT,
    "googleServiceAccountKey" TEXT,
    "googleSheetId" TEXT,
    "googleSheetTab" TEXT,
    "googleFieldMappingJson" TEXT NOT NULL DEFAULT '{}',
    "ghlApiBaseUrl" TEXT DEFAULT 'https://services.leadconnectorhq.com',
    "ghlApiKey" TEXT,
    "ghlTagFiltersJson" TEXT NOT NULL DEFAULT '["buyer","investor","acquirer","pe","family office","searcher"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingShare_listingId_userId_key" ON "ListingShare"("listingId", "userId");

-- AddForeignKey
ALTER TABLE "ListingShare" ADD CONSTRAINT "ListingShare_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingShare" ADD CONSTRAINT "ListingShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
