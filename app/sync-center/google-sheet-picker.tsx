'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type Sheet = { id: string; name: string };

export function GoogleSheetPicker({
  initialSheetId,
  initialTab,
  initiallyConnected,
  connectedEmail
}: {
  initialSheetId: string;
  initialTab: string;
  initiallyConnected: boolean;
  connectedEmail: string;
}) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [tabs, setTabs] = useState<string[]>([]);
  const [sheetId, setSheetId] = useState(initialSheetId);
  const [tab, setTab] = useState(initialTab);
  const [connected, setConnected] = useState(initiallyConnected);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedSheet = useMemo(() => sheets.find((s) => s.id === sheetId), [sheets, sheetId]);

  async function loadSheets() {
    setLoadingSheets(true);
    const response = await fetch('/api/integrations/google/sheets');
    const data = (await response.json()) as { sheets: Sheet[] };
    setSheets(data.sheets || []);
    toast.success(`Loaded ${data.sheets?.length || 0} spreadsheets.`);
    setLoadingSheets(false);
  }

  async function loadTabs(nextSheetId: string) {
    setLoadingTabs(true);
    const response = await fetch(`/api/integrations/google/sheet-tabs?sheetId=${encodeURIComponent(nextSheetId)}`);
    const data = (await response.json()) as { tabs: string[] };
    const nextTabs = data.tabs || [];
    setTabs(nextTabs);
    if (nextTabs.length && !nextTabs.includes(tab)) setTab(nextTabs[0]);
    toast.success(`Loaded ${nextTabs.length} tabs.`);
    setLoadingTabs(false);
  }

  async function saveSelection() {
    setSaving(true);
    const response = await fetch('/api/integrations/google/select-sheet', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sheetId, tab })
    });
    setSaving(false);
    if (response.ok) {
      toast.success('Saved selected sheet and tab.');
    } else {
      toast.error('Failed to save selected sheet and tab.');
    }
  }

  function connectGoogle() {
    const width = 520;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      '/api/integrations/google/connect',
      'dealio_google_oauth',
      `width=${width},height=${height},left=${Math.max(0, left)},top=${Math.max(0, top)}`
    );
    if (!popup) {
      toast.error('Popup blocked. Please allow popups and try again.');
      return;
    }
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { type?: string; status?: string; detail?: string };
      if (payload?.type !== 'dealio-google-oauth') return;
      window.removeEventListener('message', handleMessage);
      if (payload.status === 'success') {
        setConnected(true);
        toast.success('Google connected.');
        void loadSheets();
      } else {
        toast.error(`Google connect failed${payload.detail ? `: ${payload.detail}` : '.'}`);
      }
    };
    window.addEventListener('message', handleMessage);
  }

  return (
    <div className="card grid">
      <h3>Google Sheets</h3>
      <div className="row">
        <button className="button" type="button" onClick={connectGoogle}>
          Continue with Google
        </button>
        <span className="muted">
          {connected ? `Connected${connectedEmail ? ` as ${connectedEmail}` : ''}` : 'Not connected'}
        </span>
      </div>
      <div className="row">
        <button className="button secondary" type="button" onClick={loadSheets} disabled={loadingSheets || !connected}>
          {loadingSheets ? 'Loading sheets...' : 'Load My Sheets'}
        </button>
        {selectedSheet ? <span className="muted">Selected: {selectedSheet.name}</span> : null}
      </div>

      <div className="grid grid-2">
        <select
          className="select"
          value={sheetId}
          onChange={(e) => {
            const nextSheetId = e.target.value;
            setSheetId(nextSheetId);
            if (nextSheetId) void loadTabs(nextSheetId);
          }}
        >
          <option value="">Select spreadsheet</option>
          {sheets.map((sheet) => (
            <option key={sheet.id} value={sheet.id}>
              {sheet.name}
            </option>
          ))}
        </select>
        <select className="select" value={tab} onChange={(e) => setTab(e.target.value)} disabled={!sheetId || loadingTabs}>
          <option value="">{loadingTabs ? 'Loading tabs...' : 'Select tab'}</option>
          {tabs.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="row">
        <button className="button" type="button" onClick={saveSelection} disabled={!sheetId || !tab || saving}>
          {saving ? 'Saving...' : 'Save Selection'}
        </button>
      </div>
    </div>
  );
}
