import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getIntegrationSettings } from '@/lib/integrations';
import { GoogleSheetPicker } from '@/app/sync-center/google-sheet-picker';
import { SyncCenterClient } from '@/app/sync-center/sync-center-client';
import { Database, RefreshCw, AlertTriangle, Settings } from 'lucide-react';

export default async function SyncCenterPage({
  searchParams
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }
  const params = await searchParams;

  const [records, recent, settings] = await Promise.all([
    prisma.buyerSourceRecord.count(),
    prisma.buyerSourceRecord.findMany({ orderBy: { lastSyncTimestamp: 'desc' }, take: 20 }),
    getIntegrationSettings()
  ]);

  const pendingReviews = await prisma.buyerSourceRecord.count({
    where: { mergeReviewRequired: true }
  });

  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <TopHeader />
        <div className="page-header">
          <div>
            <h1 className="page-title">Sync Center</h1>
            <p className="page-subtitle">Manage data synchronization and integrations</p>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <Database size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{records}</div>
              <div className="stat-label">Total Records</div>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{pendingReviews}</div>
              <div className="stat-label">Pending Reviews</div>
            </div>
          </div>
        </div>

        <div className="sync-section">
          <div className="sync-card">
            <div className="sync-header">
              <h3 className="sync-title">
                <Settings size={20} />
                Integration Settings
              </h3>
            </div>
            <SyncCenterClient settings={settings} oauthStatus={params.oauth} />
          </div>
        </div>

        <div className="sync-section">
          <div className="sync-card">
            <div className="sync-header">
              <h3 className="sync-title">
                <Database size={20} />
                Google Sheets Integration
              </h3>
            </div>
            <GoogleSheetPicker
              initialSheetId={settings.googleSheetId || ''}
              initialTab={settings.googleSheetTab || ''}
              initiallyConnected={Boolean(settings.googleAccessToken)}
              connectedEmail={settings.googleConnectedEmail || ''}
            />
          </div>
        </div>

        <div className="table-section">
          <div className="table-card">
            <div className="table-header">
              <h3>
                <RefreshCw size={18} />
                Recent Sync Logs
              </h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Source</th>
                    <th>Record ID</th>
                    <th>Status</th>
                    <th>Review Required</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(item.lastSyncTimestamp).toLocaleString()}</td>
                      <td>
                        <span className="badge source">
                          {item.sourceSystem}
                        </span>
                      </td>
                      <td className="mono-text">{item.sourceRecordId}</td>
                      <td>
                        <span className={`status-badge ${item.duplicateStatus || 'unknown'}`}>
                          {item.duplicateStatus || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        {item.mergeReviewRequired ? (
                          <span className="status-badge warning">Yes</span>
                        ) : (
                          <span className="status-badge success">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
