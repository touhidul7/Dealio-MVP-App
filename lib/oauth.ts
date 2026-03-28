import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export function createState() {
  return crypto.randomBytes(24).toString('hex');
}

export async function createOAuthState(provider: string, redirectUri: string) {
  const state = createState();
  await prisma.oAuthState.create({
    data: {
      provider,
      state,
      redirectUri,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
  return state;
}

export async function consumeOAuthState(provider: string, state: string) {
  const record = await prisma.oAuthState.findUnique({ where: { state } });
  if (!record || record.provider !== provider || record.expiresAt < new Date()) {
    return null;
  }
  await prisma.oAuthState.delete({ where: { state } });
  return record;
}

export async function refreshGoogleAccessToken() {
  const settings = await prisma.integrationSetting.findUnique({ where: { id: 'singleton' } });
  if (!settings?.googleRefreshToken || !settings.googleOauthClientId || !settings.googleOauthClientSecret) {
    return null;
  }
  const body = new URLSearchParams({
    client_id: settings.googleOauthClientId,
    client_secret: settings.googleOauthClientSecret,
    refresh_token: settings.googleRefreshToken,
    grant_type: 'refresh_token'
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { access_token: string; expires_in: number };
  await prisma.integrationSetting.update({
    where: { id: 'singleton' },
    data: {
      googleAccessToken: data.access_token,
      googleTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000)
    }
  });
  return data.access_token;
}

export async function getValidGoogleAccessToken() {
  const settings = await prisma.integrationSetting.findUnique({ where: { id: 'singleton' } });
  if (!settings) return null;
  if (
    settings.googleAccessToken &&
    settings.googleTokenExpiresAt &&
    settings.googleTokenExpiresAt.getTime() > Date.now() + 60 * 1000
  ) {
    return settings.googleAccessToken;
  }
  return refreshGoogleAccessToken();
}

export async function refreshGhlAccessToken() {
  const settings = await prisma.integrationSetting.findUnique({ where: { id: 'singleton' } });
  if (!settings?.ghlRefreshToken || !settings.ghlOauthClientId || !settings.ghlOauthClientSecret || !settings.ghlTokenUrl) {
    return null;
  }
  const body = new URLSearchParams({
    client_id: settings.ghlOauthClientId,
    client_secret: settings.ghlOauthClientSecret,
    refresh_token: settings.ghlRefreshToken,
    grant_type: 'refresh_token'
  });
  const response = await fetch(settings.ghlTokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  await prisma.integrationSetting.update({
    where: { id: 'singleton' },
    data: {
      ghlAccessToken: data.access_token,
      ghlRefreshToken: data.refresh_token || settings.ghlRefreshToken,
      ghlTokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null
    }
  });
  return data.access_token;
}

export async function getValidGhlAccessToken() {
  const settings = await prisma.integrationSetting.findUnique({ where: { id: 'singleton' } });
  if (!settings) return null;
  if (settings.ghlAccessToken && settings.ghlTokenExpiresAt && settings.ghlTokenExpiresAt.getTime() > Date.now() + 60 * 1000) {
    return settings.ghlAccessToken;
  }
  if (settings.ghlAccessToken && !settings.ghlTokenExpiresAt) return settings.ghlAccessToken;
  return refreshGhlAccessToken();
}
