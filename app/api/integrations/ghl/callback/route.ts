import { NextResponse } from 'next/server';
import { consumeOAuthState } from '@/lib/oauth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  if (error) {
    return new NextResponse(
      `<html><body><script>
        (function() {
          if (window.opener) {
            window.opener.postMessage({ type: 'dealio-ghl-oauth', status: 'error', detail: ${JSON.stringify(error)} }, window.location.origin);
            window.close();
            return;
          }
          window.location.href = '/sync-center?oauth=ghl_error_${encodeURIComponent(error)}';
        })();
      </script></body></html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
  if (!code || !state) return NextResponse.redirect(new URL('/sync-center?oauth=ghl_missing_code', request.url));

  const stateRecord = await consumeOAuthState('ghl', state);
  if (!stateRecord) return NextResponse.redirect(new URL('/sync-center?oauth=ghl_invalid_state', request.url));

  const settings = await prisma.integrationSetting.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {}
  });
  if (!settings.ghlOauthClientId || !settings.ghlOauthClientSecret || !settings.ghlTokenUrl) {
    return NextResponse.redirect(new URL('/sync-center?oauth=ghl_missing_client', request.url));
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: settings.ghlOauthClientId,
    client_secret: settings.ghlOauthClientSecret,
    redirect_uri: stateRecord.redirectUri,
    code
  });

  const tokenResponse = await fetch(settings.ghlTokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/sync-center?oauth=ghl_token_failed', request.url));
  }
  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    locationId?: string;
    companyId?: string;
  };

  await prisma.integrationSetting.update({
    where: { id: 'singleton' },
    data: {
      ghlAccessToken: tokenData.access_token,
      ghlRefreshToken: tokenData.refresh_token || null,
      ghlTokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      ghlConnectedCompanyId: tokenData.companyId || tokenData.locationId || null
    }
  });

  return new NextResponse(
    `<html><body><script>
      (function() {
        if (window.opener) {
          window.opener.postMessage({ type: 'dealio-ghl-oauth', status: 'success' }, window.location.origin);
          window.close();
          return;
        }
        window.location.href = '/sync-center?oauth=ghl_connected';
      })();
    </script></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}
