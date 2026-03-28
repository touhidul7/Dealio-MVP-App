import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AlertTriangle, CheckCircle, XCircle, Plus } from 'lucide-react';

export default async function DuplicatesPage() {
  const user = await requireUser();
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  async function acceptMerge(formData: FormData) {
    'use server';
    await requireUser(['admin']);
    const recordId = String(formData.get('recordId'));
    const buyerId = String(formData.get('buyerId'));
    await prisma.buyerSourceRecord.update({
      where: { id: recordId },
      data: {
        linkedMasterBuyerId: buyerId,
        mergeReviewRequired: false,
        duplicateStatus: 'merged'
      }
    });
    redirect('/duplicates?toast=success&message=Merge%20accepted');
  }

  async function rejectMerge(formData: FormData) {
    'use server';
    await requireUser(['admin']);
    const recordId = String(formData.get('recordId'));
    await prisma.buyerSourceRecord.update({
      where: { id: recordId },
      data: {
        mergeReviewRequired: false,
        duplicateStatus: 'rejected'
      }
    });
    redirect('/duplicates?toast=success&message=Merge%20rejected');
  }

  async function createNewMaster(formData: FormData) {
    'use server';
    await requireUser(['admin']);
    const recordId = String(formData.get('recordId'));
    const record = await prisma.buyerSourceRecord.findUnique({ where: { id: recordId } });
    if (!record) redirect('/duplicates?toast=error&message=Source%20record%20not%20found');
    const payload = JSON.parse(record.rawPayloadJson || '{}') as Record<string, string | number | string[]>;
    const buyer = await prisma.buyer.create({
      data: {
        firstName: String(payload.firstName || ''),
        lastName: String(payload.lastName || ''),
        fullName: record.normalizedName || null,
        companyName: record.normalizedCompany || null,
        emailPrimary: record.normalizedEmail || null,
        phonePrimary: record.normalizedPhone || null,
        buyerType: String(payload.buyerType || ''),
        industriesOfInterest: JSON.stringify((payload.industries as string[]) || []),
        subindustriesOfInterest: JSON.stringify([]),
        geographyOfInterest: JSON.stringify((payload.geographies as string[]) || []),
        structurePreferences: JSON.stringify([]),
        sourceSystem: record.sourceSystem,
        sourceRecordId: record.sourceRecordId,
        ownerUserId: record.sourceOwnerUserId || null,
        sourceSubaccountId: record.sourceSubaccountId || null,
        dedupeMasterKey: record.normalizedEmail || record.normalizedPhone || record.normalizedName || null
      }
    });
    await prisma.buyerSourceRecord.update({
      where: { id: recordId },
      data: {
        linkedMasterBuyerId: buyer.id,
        mergeReviewRequired: false,
        duplicateStatus: 'new_master_created'
      }
    });
    redirect('/duplicates?toast=success&message=New%20master%20buyer%20created');
  }

  const queue = await prisma.buyerSourceRecord.findMany({
    where: { mergeReviewRequired: true },
    include: { buyer: true },
    orderBy: { importTimestamp: 'desc' }
  });

  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <TopHeader />
        <div className="page-header">
          <div>
            <h1 className="page-title">Duplicate Review Queue</h1>
            <p className="page-subtitle">Review and resolve potential duplicate buyer records</p>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-card warning">
            <div className="stat-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{queue.length}</div>
              <div className="stat-label">Items in Queue</div>
            </div>
          </div>
        </div>

        <div className="table-section">
          <div className="table-card">
            <div className="table-header">
              <h3>Pending Reviews</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Record</th>
                    <th>Possible Master Match</th>
                    <th>Confidence</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="badge source">
                          {item.sourceSystem}
                        </span>
                      </td>
                      <td className="record-info">
                        <div className="record-name">
                          {item.normalizedName || item.normalizedEmail || item.normalizedCompany || item.id}
                        </div>
                        <div className="record-details">
                          {item.normalizedEmail && <div>Email: {item.normalizedEmail}</div>}
                          {item.normalizedPhone && <div>Phone: {item.normalizedPhone}</div>}
                        </div>
                      </td>
                      <td>
                        {item.buyer ? (
                          <div className="master-match">
                            <div className="master-name">
                              {item.buyer.fullName || '-'} / {item.buyer.companyName || '-'}
                            </div>
                            <div className="master-email">
                              {item.buyer.emailPrimary || '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="no-match">No linked buyer</span>
                        )}
                      </td>
                      <td>
                        <div className="confidence-score">
                          <div className="score-bar" style={{ width: `${Math.round((item.duplicateConfidenceScore || 0) * 100)}%` }}></div>
                          <span className="score-text">{Math.round((item.duplicateConfidenceScore || 0) * 100)}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {item.linkedMasterBuyerId ? (
                            <form action={acceptMerge} className="inline-form">
                              <input type="hidden" name="recordId" value={item.id} />
                              <input type="hidden" name="buyerId" value={item.linkedMasterBuyerId} />
                              <button className="action-btn accept" type="submit">
                                <CheckCircle size={14} />
                                Accept
                              </button>
                            </form>
                          ) : null}
                          <form action={rejectMerge} className="inline-form">
                            <input type="hidden" name="recordId" value={item.id} />
                            <button className="action-btn reject" type="submit">
                              <XCircle size={14} />
                              Reject
                            </button>
                          </form>
                          <form action={createNewMaster} className="inline-form">
                            <input type="hidden" name="recordId" value={item.id} />
                            <button className="action-btn create" type="submit">
                              <Plus size={14} />
                              Create New
                            </button>
                          </form>
                        </div>
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
