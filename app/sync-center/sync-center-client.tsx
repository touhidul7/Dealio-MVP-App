'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type SettingsShape = {
  googleOauthClientId: string | null;
  googleOauthClientSecret: string | null;
  googleServiceAccountEmail: string | null;
  googleServiceAccountKey: string | null;
  googleSheetId: string | null;
  googleSheetTab: string | null;
  googleFieldMappingJson: string;
  ghlOauthClientId: string | null;
  ghlOauthClientSecret: string | null;
  ghlAuthorizeUrl: string | null;
  ghlTokenUrl: string | null;
  ghlApiBaseUrl: string | null;
  ghlApiKey: string | null;
  ghlTagFiltersJson: string;
  googleAccessToken: string | null;
  googleConnectedEmail: string | null;
  ghlAccessToken: string | null;
  ghlConnectedCompanyId: string | null;
};

export function SyncCenterClient({
  settings,
  oauthStatus
}: {
  settings: SettingsShape;
  oauthStatus?: string;
}) {
  const [form, setForm] = useState({
    googleOauthClientId: settings.googleOauthClientId || '',
    googleOauthClientSecret: settings.googleOauthClientSecret || '',
    googleServiceAccountEmail: settings.googleServiceAccountEmail || '',
    googleServiceAccountKey: settings.googleServiceAccountKey || '',
    googleSheetId: settings.googleSheetId || '',
    googleSheetTab: settings.googleSheetTab || '',
    googleFieldMappingJson: settings.googleFieldMappingJson || '{}',
    ghlOauthClientId: settings.ghlOauthClientId || '',
    ghlOauthClientSecret: settings.ghlOauthClientSecret || '',
    ghlAuthorizeUrl: settings.ghlAuthorizeUrl || 'https://marketplace.gohighlevel.com/oauth/chooselocation',
    ghlTokenUrl: settings.ghlTokenUrl || 'https://services.leadconnectorhq.com/oauth/token',
    ghlApiBaseUrl: settings.ghlApiBaseUrl || 'https://services.leadconnectorhq.com',
    ghlApiKey: settings.ghlApiKey || '',
    ghlTagFilters: (() => {
      try {
        const parsed = JSON.parse(settings.ghlTagFiltersJson || '[]');
        return Array.isArray(parsed) ? parsed.join(', ') : '';
      } catch {
        return '';
      }
    })()
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<'google' | 'ghl' | 'all' | null>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);
  const [ghlDebug, setGhlDebug] = useState<{
    hasGhlCredential: boolean;
    tagFilters: string[];
    advisorsMapped: number;
    rows: Array<{
      advisorId: string;
      advisorName: string;
      subaccountId: string | null;
      fetched: number;
      matchedByTag: number;
      skippedByTag: number;
      error: string | null;
    }>;
  } | null>(null);

  const statusText = useMemo(
    () =>
      `Google: ${
        settings.googleAccessToken ? `Connected (${settings.googleConnectedEmail || 'account'})` : 'Not connected'
      } | GHL: ${
        settings.ghlAccessToken ? `Connected (${settings.ghlConnectedCompanyId || 'OAuth'})` : form.ghlApiKey ? 'Connected (API key)' : 'Not connected'
      }`,
    [settings.googleAccessToken, settings.googleConnectedEmail, settings.ghlAccessToken, settings.ghlConnectedCompanyId, form.ghlApiKey]
  );

  async function runSync(type: 'google' | 'ghl' | 'all') {
    setSyncing(type);
    const req = fetch('/api/sync/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type })
    });
    await toast.promise(
      req.then(async (r) => {
        const data = (await r.json()) as { message?: string };
        if (!r.ok) throw new Error(data.message || 'Sync failed.');
        return data.message || 'Sync completed.';
      }),
      {
        loading: 'Running sync...',
        success: (message) => message,
        error: (error) => (error instanceof Error ? error.message : 'Sync failed.')
      }
    );
    setSyncing(null);
  }

  async function saveSettings() {
    setSaving(true);
    const req = fetch('/api/integrations/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form)
    });
    await toast.promise(
      req.then(async (r) => {
        const data = (await r.json()) as { message?: string };
        if (!r.ok) throw new Error(data.message || 'Failed to save settings.');
        return data.message || 'Saved.';
      }),
      {
        loading: 'Saving settings...',
        success: (message) => message,
        error: (error) => (error instanceof Error ? error.message : 'Failed to save settings.')
      }
    );
    setSaving(false);
  }

  function connectGhl() {
    const width = 520;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      '/api/integrations/ghl/connect',
      'dealio_ghl_oauth',
      `width=${width},height=${height},left=${Math.max(0, left)},top=${Math.max(0, top)}`
    );
    if (!popup) {
      toast.error('Popup blocked. Please allow popups and try again.');
      return;
    }
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { type?: string; status?: string; detail?: string };
      if (payload?.type !== 'dealio-ghl-oauth') return;
      window.removeEventListener('message', handleMessage);
      if (payload.status === 'success') {
        toast.success('GHL connected successfully.');
        window.location.reload();
      } else {
        toast.error(`GHL connect failed${payload.detail ? `: ${payload.detail}` : '.'}`);
      }
    };
    window.addEventListener('message', handleMessage);
  }

  async function loadGhlDebug() {
    setLoadingDebug(true);
    const req = fetch('/api/sync/ghl-debug');
    await toast.promise(
      req.then(async (r) => {
        const data = (await r.json()) as { ok?: boolean; message?: string; summary?: any };
        if (!r.ok || !data.ok || !data.summary) {
          throw new Error(data.message || 'Failed to load GHL debug summary.');
        }
        setGhlDebug(data.summary);
        return 'GHL debug summary loaded.';
      }),
      {
        loading: 'Loading GHL debug summary...',
        success: (m) => m,
        error: (error) => (error instanceof Error ? error.message : 'Failed to load GHL debug summary.')
      }
    );
    setLoadingDebug(false);
  }

  return (
    <>
      {oauthStatus ? <div className="card"><strong>OAuth Status:</strong> {oauthStatus}</div> : null}
      <div className="card row">
        <button className="button" type="button" onClick={() => void runSync('google')} disabled={syncing !== null}>
          {syncing === 'google' ? 'Running...' : 'Run Google Sheets Sync'}
        </button>
        <button className="button" type="button" onClick={() => void runSync('ghl')} disabled={syncing !== null}>
          {syncing === 'ghl' ? 'Running...' : 'Run GHL Sync'}
        </button>
        <button className="button secondary" type="button" onClick={() => void runSync('all')} disabled={syncing !== null}>
          {syncing === 'all' ? 'Running...' : 'Run Full Sync + Re-score'}
        </button>
      </div>

      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          {/* <button className="button" type="button" onClick={connectGhl}>Connect GHL</button> */}
        </div>
        <div className="muted">{statusText}</div>
      </div>

      <div className="card grid">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>GHL Debug</h3>
          <button className="button secondary" type="button" onClick={() => void loadGhlDebug()} disabled={loadingDebug}>
            {loadingDebug ? 'Refreshing...' : 'Refresh GHL Debug'}
          </button>
        </div>
        <div className="muted">Shows mapped advisors, contacts fetched per subaccount, and skipped-by-tag counts.</div>
        {ghlDebug ? (
          <>
            <div className="row">
              <div className="badge">Credential: {ghlDebug.hasGhlCredential ? 'present' : 'missing'}</div>
              <div className="badge">Mapped advisors: {ghlDebug.advisorsMapped}</div>
              <div className="badge">Filters: {ghlDebug.tagFilters.join(', ') || 'none'}</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Advisor</th>
                  <th>Subaccount</th>
                  <th>Fetched</th>
                  <th>Matched By Tag</th>
                  <th>Skipped By Tag</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ghlDebug.rows.map((row) => (
                  <tr key={row.advisorId}>
                    <td>{row.advisorName}</td>
                    <td>{row.subaccountId || '-'}</td>
                    <td>{row.fetched}</td>
                    <td>{row.matchedByTag}</td>
                    <td>{row.skippedByTag}</td>
                    <td>{row.error ? row.error : 'ok'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="muted">Click Refresh GHL Debug to load per-subaccount diagnostics.</div>
        )}
      </div>

      <div className="card grid">
        <h3>Integration Credentials</h3>
        <div className="muted">Update API credentials and sheet settings from this admin screen.</div>
        <div className="grid grid-2">
          <input className="input" value={form.googleOauthClientId} placeholder="Google OAuth client ID" onChange={(e) => setForm((f) => ({ ...f, googleOauthClientId: e.target.value }))} />
          <input className="input" type="password" value={form.googleOauthClientSecret} placeholder="Google OAuth client secret" onChange={(e) => setForm((f) => ({ ...f, googleOauthClientSecret: e.target.value }))} />
          <input type='hidden' className="input" value={form.googleServiceAccountEmail} placeholder="Google service account email" onChange={(e) => setForm((f) => ({ ...f, googleServiceAccountEmail: e.target.value }))} />
          <input type='hidden' className="input" value={form.googleSheetId} placeholder="Google Sheet ID" onChange={(e) => setForm((f) => ({ ...f, googleSheetId: e.target.value }))} />
          <input type='hidden' className="input" value={form.googleSheetTab} placeholder="Google Sheet tab name" onChange={(e) => setForm((f) => ({ ...f, googleSheetTab: e.target.value }))} />
          <input type='hidden' className="input" value={form.ghlOauthClientId} placeholder="GHL OAuth client ID" onChange={(e) => setForm((f) => ({ ...f, ghlOauthClientId: e.target.value }))} />
          <input type='hidden' className="input" value={form.ghlOauthClientSecret} placeholder="GHL OAuth client secret" onChange={(e) => setForm((f) => ({ ...f, ghlOauthClientSecret: e.target.value }))} />
          <input type='hidden' className="input" value={form.ghlAuthorizeUrl} placeholder="GHL authorize URL" onChange={(e) => setForm((f) => ({ ...f, ghlAuthorizeUrl: e.target.value }))} />
          <input type='hidden' className="input" value={form.ghlTokenUrl} placeholder="GHL token URL" onChange={(e) => setForm((f) => ({ ...f, ghlTokenUrl: e.target.value }))} />
          <input type='hidden' className="input" value={form.ghlApiBaseUrl} placeholder="GHL API base URL" onChange={(e) => setForm((f) => ({ ...f, ghlApiBaseUrl: e.target.value }))} />
          <input className="input" value={form.ghlApiKey} placeholder="GHL API key" onChange={(e) => setForm((f) => ({ ...f, ghlApiKey: e.target.value }))} />
          <input className="input" value={form.ghlTagFilters} placeholder="GHL tag filters comma separated" onChange={(e) => setForm((f) => ({ ...f, ghlTagFilters: e.target.value }))} />
        </div>
        {/* <textarea className="textarea" value={form.googleServiceAccountKey} placeholder="Google service account private key" onChange={(e) => setForm((f) => ({ ...f, googleServiceAccountKey: e.target.value }))} /> */}
        {/* <textarea className="textarea" value={form.googleFieldMappingJson} placeholder='Google field mapping JSON (e.g. {"first_name":"First Name"})' onChange={(e) => setForm((f) => ({ ...f, googleFieldMappingJson: e.target.value }))} /> */}
        <div>
          <button className="button" type="button" onClick={() => void saveSettings()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Credentials'}
          </button>
        </div>
      </div>
    </>
  );
}
