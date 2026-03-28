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
  if (!settings.ghlOauthClientId || !settings.ghlAuthorizeUrl) {
    return new NextResponse(
      `<html><body><script>
        (function() {
          if (window.opener) {
            window.opener.postMessage({ type: 'dealio-ghl-oauth', status: 'error', detail: 'missing_client' }, window.location.origin);
            window.close();
            return;
          }
          window.location.href = '/sync-center?oauth=ghl_missing_client';
        })();
      </script></body></html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/integrations/ghl/callback`;
  const state = await createOAuthState('ghl', redirectUri);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: settings.ghlOauthClientId,
    redirect_uri: redirectUri,
    state
  });
  return NextResponse.redirect(`${settings.ghlAuthorizeUrl}?${params.toString()}`);
}
