-- AlterTable
ALTER TABLE "IntegrationSetting" ADD COLUMN     "ghlAccessToken" TEXT,
ADD COLUMN     "ghlAuthorizeUrl" TEXT DEFAULT 'https://marketplace.gohighlevel.com/oauth/chooselocation',
ADD COLUMN     "ghlConnectedCompanyId" TEXT,
ADD COLUMN     "ghlOauthClientId" TEXT,
ADD COLUMN     "ghlOauthClientSecret" TEXT,
ADD COLUMN     "ghlRefreshToken" TEXT,
ADD COLUMN     "ghlTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "ghlTokenUrl" TEXT DEFAULT 'https://services.leadconnectorhq.com/oauth/token',
ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleConnectedEmail" TEXT,
ADD COLUMN     "googleOauthClientId" TEXT,
ADD COLUMN     "googleOauthClientSecret" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "googleTokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");
