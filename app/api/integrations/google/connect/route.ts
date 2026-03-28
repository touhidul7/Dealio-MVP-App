import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getIntegrationSettings } from '@/lib/integrations';
import { createOAuthState } from '@/lib/oauth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getIntegrationSettings();
  if (!settings.googleOauthClientId) {
    return new NextResponse(
      `<html><body><script>
        (function() {
          if (window.opener) {
            window.opener.postMessage({ type: 'dealio-google-oauth', status: 'error', detail: 'missing_client' }, window.location.origin);
            window.close();
            return;
          }
          window.location.href = '/sync-center?oauth=google_missing_client';
        })();
      </script></body></html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/integrations/google/callback`;
  const state = await createOAuthState('google', redirectUri);
  const params = new URLSearchParams({
    client_id: settings.googleOauthClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
    state
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
