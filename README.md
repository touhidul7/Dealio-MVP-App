# Dealio Marketplace MVP - User Manual

Dealio is an internal marketplace app for managing listings, importing buyers from Google Sheets and GHL, deduplicating buyer records, and generating listing-to-buyer match scores.

## Table of Contents
1. [What This App Does](#what-this-app-does)
2. [Current Feature Set](#current-feature-set)
3. [Tech Stack](#tech-stack)
4. [Local Setup](#local-setup)
5. [Login and Roles](#login-and-roles)
6. [How To Use Each Section](#how-to-use-each-section)
7. [Sync Center Guide (Google + GHL)](#sync-center-guide-google--ghl)
8. [Troubleshooting](#troubleshooting)
9. [Data Model Summary](#data-model-summary)
10. [Important Notes](#important-notes)

## What This App Does

- Manages internal listings (`native`, `advisor`, `external`)
- Imports buyers from:
  - Google Sheets
  - GoHighLevel (GHL) contacts
- Applies GHL tag-based buyer filtering
- Deduplicates imported buyers into master buyer records
- Scores buyers against active listings
- Shows match explanations and ranking
- Supports role-based access (`admin`, `advisor`)
- Lets admins manage users and integration credentials from UI

## Current Feature Set

### Admin Features

- Full access to all listings, buyers, matches, duplicates, users, sync center
- Add/edit/delete/deactivate users
- Map advisors to:
  - `ghlSubaccountId`
  - `googleSheetSourceId`
- Configure integration settings from UI
- Connect Google OAuth via popup
- Pick spreadsheet + tab from connected Google account
- Run:
  - Google sync
  - GHL sync
  - Full sync + re-score
- View GHL debug summary:
  - mapped advisors
  - fetched contacts per subaccount
  - matched-by-tag counts
  - skipped-by-tag counts

### Advisor Features

- Access only permitted data based on ownership/assignment/sharing/visibility
- Can view and manage their scoped listings and relevant matches/buyers

### UI Features

- Sidebar navigation
- Top header with profile avatar dropdown
- Dropdown shows current user name, email, role
- Sign out moved into profile dropdown
- `react-hot-toast` feedback for actions (sync, users, settings, etc.)

## Tech Stack

- Next.js 15 (App Router)
- React 19
- Prisma ORM
- PostgreSQL (Prisma datasource)
- Recharts (dashboard visualizations)
- `react-hot-toast` notifications

## Local Setup

### 1. Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm
- PostgreSQL database

### 2. Environment Variables

Create `.env` in project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
APP_DEMO_EMAIL="admin@dealio.local"
APP_DEMO_PASSWORD="password123"
```

Notes:
- Prisma schema is PostgreSQL-based.
- Runtime integration credentials are stored in DB via Sync Center UI (not required in `.env`).
- Existing `.env.example` has legacy keys; current flow uses DB-stored integration settings.

### 3. Install and Initialize

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Open: `http://localhost:3000`

## Login and Roles

### Seeded Demo Users

- Admin:
  - Email: `admin@dealio.local`
  - Password: `password123`
- Advisors (seeded):
  - `ava@dealio.local`
  - `noah@dealio.local`
  - Same seeded password

### Role Access Rules

- `admin`: full visibility and settings management
- `advisor` listing visibility:
  - owns listing
  - assigned to listing
  - listing shared with advisor
  - listing `visibilityScope = shared`
- `advisor` buyer visibility:
  - owns buyer
  - `visibilityMode = shared`
  - `visibilityMode = match_only`

## How To Use Each Section

## Dashboard

- View KPIs:
  - listings
  - active listings
  - external opportunities
  - buyers
  - matches
  - duplicate reviews
- View charts and recent activity
- Quick links to create listing or inspect top matches

## Listings

- Use filters by type/status/industry/location
- Create new listing with:
  - financials
  - buyer targeting
  - tags
  - confidentiality
  - source metadata
- Share listing with selected advisors
- Edit listing
- Delete listing (from edit page)
- Active listings trigger match refresh

## External Opportunities

- View listings where `listingType = external`
- Filter by advisor, platform, status, industry
- Track source URL/platform and advisor notes

## Buyers

- View imported/managed buyers
- Filter by buyer type, source, visibility, industry, geography

## Matches

- View computed buyer-listing matches
- Filter by listing name, buyer type, min score
- Score explanation included per match

## Duplicate Queue

For records flagged for merge review:
- Accept merge into existing master buyer
- Reject merge
- Create new master buyer

## Users (Admin Only)

- Add user (popup form)
- Edit user (popup form)
- Delete user (or auto-deactivate if relational constraints block delete)
- Manage:
  - role
  - status
  - GHL subaccount mapping
  - Google sheet source mapping
  - password reset (set new password)

## Sync Center Guide (Google + GHL)

This is the main integration control panel.

### A. Google Sheets Connection Flow

1. Go to `Sync Center`.
2. In Integration Credentials, save:
   - Google OAuth Client ID
   - Google OAuth Client Secret
3. In Google Sheets section, click `Continue with Google`.
4. Authorize popup consent.
5. Click `Load My Sheets`.
6. Select spreadsheet.
7. Select tab.
8. Click `Save Selection`.
9. Click `Run Google Sheets Sync`.

### B. GHL Connection / Setup Flow

Current UI supports API key flow directly in Sync Center.

1. In Integration Credentials, set:
   - `GHL API key`
   - Optional custom `GHL API base URL` (default is prefilled)
   - `GHL tag filters` (comma-separated)
2. Go to `Users` page.
3. For each advisor who should import contacts, set `GHL subaccount ID`.
4. Return to `Sync Center`.
5. Click `Refresh GHL Debug`.
6. Confirm:
   - mapped advisors count
   - fetched contacts per subaccount
   - matched/skipped by tag
7. Click `Run GHL Sync`.

### C. GHL Buyer Tag Filters

Default buyer tags:
- `buyer-profile-sent`
- `access-granted`
- `nda-signed`

Only GHL contacts matching tag filters are imported as buyers.

### D. Full Sync

`Run Full Sync + Re-score` does:
1. Google import
2. GHL import
3. Recompute matches for active listings

## Troubleshooting

### Google: `access_denied` / app not verified

Cause:
- OAuth app in Google Cloud is in testing and your account is not added as a test user.

Fix:
1. Open Google Cloud Console -> OAuth consent screen.
2. Add your Gmail as a test user.
3. Or publish app after verification.
4. Retry `Continue with Google`.

### Google popup redirects to `oauth=google_missing_client`

Cause:
- Missing Google OAuth client ID/secret in Integration Credentials.

Fix:
- Save valid client ID and client secret in Sync Center first.

### GHL Sync says no contacts imported

If error is:
`GHL API returned no contacts. Check GHL API key/OAuth scope and advisor subaccount IDs.`

Check:
1. API key/token is valid
2. Advisor `ghlSubaccountId` is correct
3. Contacts exist in that location/subaccount
4. Contacts have required buyer tags
5. Use `Refresh GHL Debug` to see fetched/matched/skipped counts

### How to find GHL subaccount ID

In GHL URL, look for:

`.../v2/location/<SUBACCOUNT_ID>/...`

The `<SUBACCOUNT_ID>` is what you store in user mapping.

### Imported contact exists in GHL but not in Buyers

Most common reasons:
1. Contact tag does not match buyer filters
2. Wrong subaccount mapped to advisor
3. GHL returned 0 contacts for that mapped subaccount

Use GHL Debug table to pinpoint which case applies.

## Data Model Summary

Key entities:

- `User`
  - admin/advisor
  - credentials and mapping fields
- `Listing`
  - internal/external opportunities
  - ownership, assignment, sharing
- `ListingShare`
  - listing visibility to advisors
- `Buyer`
  - normalized master buyer
- `BuyerSourceRecord`
  - raw import records + dedupe tracking
- `Match`
  - computed score and explanation
- `IntegrationSetting`
  - singleton app-level integration config/tokens
- `OAuthState`
  - secure state tracking for OAuth callbacks

## Important Notes

- Sync supports real APIs when credentials are present; otherwise Google/GHL can fall back to mock source data logic in code paths.
- GHL OAuth backend routes exist; current Sync Center UI is primarily using API key flow for GHL.
- Keep production secrets in secure storage and rotate tokens/keys periodically.
- Current login uses session cookie suitable for MVP/internal use.

---

If you want, I can add a `README-DEPLOY.md` next with production deployment steps (Vercel + managed Postgres + secure secret management + OAuth redirect setup).
