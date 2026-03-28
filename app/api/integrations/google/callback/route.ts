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
            window.opener.postMessage({ type: 'dealio-google-oauth', status: 'error', detail: ${JSON.stringify(error)} }, window.location.origin);
            window.close();
            return;
          }
          window.location.href = '/sync-center?oauth=google_error_${encodeURIComponent(error)}';
        })();
      </script></body></html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
  if (!code || !state) return NextResponse.redirect(new URL('/sync-center?oauth=google_missing_code', request.url));

  const stateRecord = await consumeOAuthState('google', state);
  if (!stateRecord) return NextResponse.redirect(new URL('/sync-center?oauth=google_invalid_state', request.url));

  const settings = await prisma.integrationSetting.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {}
  });
  if (!settings.googleOauthClientId || !settings.googleOauthClientSecret) {
    return NextResponse.redirect(new URL('/sync-center?oauth=google_missing_client', request.url));
  }

  const body = new URLSearchParams({
    code,
    client_id: settings.googleOauthClientId,
    client_secret: settings.googleOauthClientSecret,
    redirect_uri: stateRecord.redirectUri,
    grant_type: 'authorization_code'
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/sync-center?oauth=google_token_failed', request.url));
  }
  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  };

  let connectedEmail: string | null = null;
  const meResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { authorization: `Bearer ${tokenData.access_token}` }
  });
  if (meResponse.ok) {
    const meData = (await meResponse.json()) as { email?: string };
    connectedEmail = meData.email || null;
  }

  await prisma.integrationSetting.update({
    where: { id: 'singleton' },
    data: {
      googleAccessToken: tokenData.access_token,
      googleRefreshToken: tokenData.refresh_token || settings.googleRefreshToken,
      googleTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      googleConnectedEmail: connectedEmail
    }
  });

  return new NextResponse(
    `<html><body><script>
      (function() {
        if (window.opener) {
          window.opener.postMessage({ type: 'dealio-google-oauth', status: 'success' }, window.location.origin);
          window.close();
          return;
        }
        window.location.href = '/sync-center?oauth=google_connected';
      })();
    </script></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}
