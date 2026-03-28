import crypto from 'crypto';
import { upsertBuyerFromSource } from '@/lib/dedupe';
import buyers from '@/data/mock-buyers.json';
import { prisma } from '@/lib/prisma';
import { getIntegrationSettings } from '@/lib/integrations';
import { getValidGhlAccessToken, getValidGoogleAccessToken } from '@/lib/oauth';

type IntegrationSetting = {
  googleServiceAccountEmail: string | null;
  googleServiceAccountKey: string | null;
  googleSheetId: string | null;
  googleSheetTab: string | null;
  googleFieldMappingJson: string;
  ghlApiBaseUrl: string | null;
  ghlApiKey: string | null;
  ghlTagFiltersJson: string;
};

const defaultGoogleMapping = {
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
};

function parseBuyerTagFilters() {
  return ['buyer-profile-sent', 'access-granted', 'nda-signed'];
}

function parseBuyerTagFiltersFromSettings(rawJson: string | undefined) {
  if (!rawJson) return parseBuyerTagFilters();
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return parseBuyerTagFilters();
    return parsed.map((x) => String(x).toLowerCase()).filter(Boolean);
  } catch {
    return parseBuyerTagFilters();
  }
}

function parseJsonObject(raw: string | undefined, fallback: Record<string, string>) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    return { ...fallback, ...(parsed as Record<string, string>) };
  } catch {
    return fallback;
  }
}

function toBase64Url(input: Buffer | string) {
  const value = Buffer.isBuffer(input) ? input.toString('base64') : Buffer.from(input).toString('base64');
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getGoogleAccessToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  const assertion = `${signingInput}.${toBase64Url(signature)}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) {
    throw new Error(`Google token request failed (${response.status})`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

function rowToPayload(
  row: string[],
  headers: string[],
  mapping: Record<string, string>
) {
  const byName = Object.fromEntries(headers.map((h, idx) => [h.toLowerCase().trim(), row[idx] || '']));
  const get = (key: string) => byName[(mapping[key] || '').toLowerCase()] || '';
  const splitCsv = (value: string) => value.split(',').map((x) => x.trim()).filter(Boolean);
  return {
    firstName: get('first_name'),
    lastName: get('last_name'),
    email: get('email'),
    phone: get('phone'),
    company: get('company'),
    buyerType: get('buyer_type'),
    industries: splitCsv(get('industries')),
    geographies: splitCsv(get('geographies')),
    minEv: Number(get('min_ev')) || null,
    maxEv: Number(get('max_ev')) || null,
    ownerUserId: get('owner_user_id') || null
  };
}

async function fetchGoogleSheetRows(settings: IntegrationSetting) {
  if (!settings.googleSheetId) {
    return null;
  }
  let accessToken = await getValidGoogleAccessToken();
  if (!accessToken && settings.googleServiceAccountEmail && settings.googleServiceAccountKey) {
    accessToken = await getGoogleAccessToken(
      settings.googleServiceAccountEmail,
      settings.googleServiceAccountKey.replace(/\\n/g, '\n')
    );
  }
  if (!accessToken) return null;
  const tab = settings.googleSheetTab || 'Sheet1';
  const range = encodeURIComponent(`${tab}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${settings.googleSheetId}/values/${range}`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Google sheets read failed (${response.status})`);
  }
  const data = (await response.json()) as { values?: string[][] };
  return data.values || [];
}

async function fetchGhlContacts(settings: IntegrationSetting, subaccountId: string) {
  if (!settings.ghlApiBaseUrl) return null;
  const oauthToken = await getValidGhlAccessToken();
  const token = oauthToken || settings.ghlApiKey;
  if (!token) return null;
  const base = settings.ghlApiBaseUrl.replace(/\/$/, '');
  const candidates = [
    `${base}/contacts/?locationId=${encodeURIComponent(subaccountId)}&limit=100`,
    `${base}/v1/contacts/?locationId=${encodeURIComponent(subaccountId)}`
  ];
  for (const url of candidates) {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        version: '2021-07-28'
      }
    });
    if (!response.ok) continue;
    const data = (await response.json()) as { contacts?: any[] };
    if (Array.isArray(data.contacts)) return data.contacts;
  }
  return [];
}

function normalizeGhlTagList(row: any): string[] {
  const toTag = (x: unknown) => {
    if (typeof x === 'string') return x;
    if (x && typeof x === 'object') {
      const obj = x as Record<string, unknown>;
      return String(obj.name || obj.value || obj.tag || '');
    }
    return String(x || '');
  };
  if (Array.isArray(row.tags)) return row.tags.map((x: unknown) => toTag(x)).filter(Boolean);
  if (Array.isArray(row.tag)) return row.tag.map((x: unknown) => toTag(x)).filter(Boolean);
  if (typeof row.tags === 'string') return row.tags.split(',').map((x: string) => x.trim()).filter(Boolean);
  if (typeof row.tag === 'string') return row.tag.split(',').map((x: string) => x.trim()).filter(Boolean);
  return [];
}

function rowToGhlPayload(row: any, ownerUserId: string | null) {
  const firstName = String(row.firstName || row.first_name || '');
  const lastName = String(row.lastName || row.last_name || '');
  const email = String(row.email || row.emailAddress || row.email_address || '');
  const phone = String(row.phone || row.phoneNumber || row.phone_number || '');
  const company = String(row.companyName || row.company || '');
  const buyerType = String(row.buyerType || row.buyer_type || '');
  const tags = normalizeGhlTagList(row);
  const industries = Array.isArray(row.industries) ? row.industries.map((x: unknown) => String(x)) : [];
  const geographies = Array.isArray(row.geographies) ? row.geographies.map((x: unknown) => String(x)) : [];
  return {
    firstName,
    lastName,
    email,
    phone,
    company,
    buyerType,
    tags,
    industries,
    geographies,
    minEv: Number(row.minEv || row.min_ev || 0) || null,
    maxEv: Number(row.maxEv || row.max_ev || 0) || null,
    ownerUserId
  };
}

function parseTagsFromBuyerType(buyerType: string | null | undefined) {
  if (!buyerType) return [];
  return buyerType
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function matchesBuyerFilter(tags: string[], buyerType: string | null | undefined, filters: string[]) {
  const normalizedTags = tags.map((x) => x.toLowerCase());
  const buyerTypeTags = parseTagsFromBuyerType(buyerType);
  return normalizedTags.some((t) => filters.includes(t)) || buyerTypeTags.some((t) => filters.includes(t));
}

function shouldImportGhlRow(row: { tags?: string[]; buyerType?: string | null }) {
  const filters = parseBuyerTagFilters();
  return matchesBuyerFilter(row.tags || [], row.buyerType, filters);
}

export async function getGhlDebugSummary() {
  const settings = await getIntegrationSettings();
  const hasGhlCredential = Boolean(settings.ghlAccessToken || settings.ghlApiKey);
  const tagFilters = parseBuyerTagFiltersFromSettings(settings.ghlTagFiltersJson);
  const advisors = await prisma.user.findMany({
    where: { role: 'advisor', activeStatus: true },
    orderBy: { firstName: 'asc' }
  });

  const rows: Array<{
    advisorId: string;
    advisorName: string;
    subaccountId: string | null;
    fetched: number;
    matchedByTag: number;
    skippedByTag: number;
    error: string | null;
  }> = [];

  for (const advisor of advisors) {
    const subaccountId = advisor.ghlSubaccountId;
    if (!subaccountId) {
      rows.push({
        advisorId: advisor.id,
        advisorName: `${advisor.firstName} ${advisor.lastName}`,
        subaccountId: null,
        fetched: 0,
        matchedByTag: 0,
        skippedByTag: 0,
        error: 'No subaccount mapping'
      });
      continue;
    }

    try {
      const contacts = (await fetchGhlContacts(settings, subaccountId)) || [];
      let matchedByTag = 0;
      let skippedByTag = 0;
      for (const raw of contacts) {
        const payload = rowToGhlPayload(raw, advisor.id);
        const allowed = matchesBuyerFilter(payload.tags, payload.buyerType, tagFilters);
        if (allowed) matchedByTag += 1;
        else skippedByTag += 1;
      }

      rows.push({
        advisorId: advisor.id,
        advisorName: `${advisor.firstName} ${advisor.lastName}`,
        subaccountId,
        fetched: contacts.length,
        matchedByTag,
        skippedByTag,
        error: null
      });
    } catch (error) {
      rows.push({
        advisorId: advisor.id,
        advisorName: `${advisor.firstName} ${advisor.lastName}`,
        subaccountId,
        fetched: 0,
        matchedByTag: 0,
        skippedByTag: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    hasGhlCredential,
    tagFilters,
    advisorsMapped: rows.filter((r) => !!r.subaccountId).length,
    rows
  };
}

export async function runGoogleSheetsSync() {
  const settings = await getIntegrationSettings();
  const rows = await fetchGoogleSheetRows(settings);

  if (!rows || rows.length < 2) {
    for (const row of buyers.googleSheets) {
      await upsertBuyerFromSource({
        sourceSystem: 'google_sheets',
        sourceRecordId: row.id,
        sourceOwnerUserId: row.ownerUserId,
        payload: row,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        company: row.company,
        buyerType: row.buyerType,
        industries: row.industries,
        geographies: row.geographies,
        minEv: row.minEv,
        maxEv: row.maxEv
      });
    }
    return;
  }

  const headers = rows[0];
  const mapping = parseJsonObject(settings.googleFieldMappingJson, defaultGoogleMapping);
  const dataRows = rows.slice(1);

  for (const [index, row] of dataRows.entries()) {
    const payload = rowToPayload(row, headers, mapping);
    await upsertBuyerFromSource({
      sourceSystem: 'google_sheets',
      sourceRecordId: `sheet_row_${index + 2}`,
      sourceOwnerUserId: payload.ownerUserId,
      payload: { headers, row },
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      company: payload.company,
      buyerType: payload.buyerType,
      industries: payload.industries,
      geographies: payload.geographies,
      minEv: payload.minEv,
      maxEv: payload.maxEv
    });
  }
}

export async function runGhlSync() {
  const settings = await getIntegrationSettings();
  const hasGhlCredential = Boolean(settings.ghlAccessToken || settings.ghlApiKey);
  const advisors = await prisma.user.findMany({
    where: { role: 'advisor', activeStatus: true, ghlSubaccountId: { not: null } }
  });
  if (hasGhlCredential && advisors.length === 0) {
    throw new Error('No advisor has a GHL subaccount mapping. Set ghlSubaccountId in Users page.');
  }
  const tagFilters = parseBuyerTagFiltersFromSettings(settings.ghlTagFiltersJson);

  let usedRealApi = false;
  let importedReal = 0;
  let skippedByTag = 0;
  for (const advisor of advisors) {
    const subaccountId = advisor.ghlSubaccountId;
    if (!subaccountId) continue;
    const contacts = await fetchGhlContacts(settings, subaccountId);
    if (!contacts || contacts.length === 0) continue;
    usedRealApi = true;
    for (const raw of contacts) {
      const row = rowToGhlPayload(raw, advisor.id);
      const allowed = matchesBuyerFilter(row.tags, row.buyerType, tagFilters);
      if (!allowed) {
        skippedByTag += 1;
        continue;
      }
      await upsertBuyerFromSource({
        sourceSystem: 'ghl',
        sourceRecordId: String(raw.id || raw.contactId || raw._id || `${subaccountId}-${row.email}-${row.phone}`),
        sourceSubaccountId: subaccountId,
        sourceOwnerUserId: advisor.id,
        payload: raw,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        company: row.company,
        buyerType: row.buyerType,
        industries: row.industries,
        geographies: row.geographies,
        minEv: row.minEv,
        maxEv: row.maxEv
      });
      importedReal += 1;
    }
  }

  if (usedRealApi) {
    return { mode: 'real' as const, imported: importedReal, skippedByTag };
  }

  if (hasGhlCredential) {
    throw new Error('GHL API returned no contacts. Check GHL API key/OAuth scope and advisor subaccount IDs.');
  }

  let importedMock = 0;
  for (const row of buyers.ghl as Array<(typeof buyers.ghl)[number] & { tags?: string[] }>) {
    const tags = row.tags || [];
    const rowWithTags = { ...row, tags };
    const filters = tagFilters.length ? tagFilters : parseBuyerTagFilters();
    const localShouldImport = matchesBuyerFilter(tags, row.buyerType, filters);
    if (!localShouldImport && !shouldImportGhlRow(rowWithTags)) continue;
    await upsertBuyerFromSource({
      sourceSystem: 'ghl',
      sourceRecordId: row.id,
      sourceSubaccountId: row.subaccountId,
      sourceOwnerUserId: row.ownerUserId,
      payload: row,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      company: row.company,
      buyerType: row.buyerType,
      industries: row.industries,
      geographies: row.geographies,
      minEv: row.minEv,
      maxEv: row.maxEv
    });
    importedMock += 1;
  }
  return { mode: 'mock' as const, imported: importedMock, skippedByTag: 0 };
}
