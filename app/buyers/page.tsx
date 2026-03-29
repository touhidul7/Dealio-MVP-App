import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { buyerReadWhere } from '@/lib/permissions';
import { Users, Building, Mail, Database } from 'lucide-react';

type SearchParams = {
  buyerType?: string;
  sourceSystem?: string;
  visibilityMode?: string;
  industry?: string;
  geography?: string;
};

export default async function BuyersPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const buyers = await prisma.buyer.findMany({
    where: {
      AND: [
        buyerReadWhere(user),
        ...(params.buyerType ? [{ buyerType: params.buyerType }] : []),
        ...(params.sourceSystem ? [{ sourceSystem: params.sourceSystem }] : []),
        ...(params.visibilityMode ? [{ visibilityMode: params.visibilityMode as any }] : []),
        ...(params.industry
          ? [{
              OR: [
                { industriesOfInterest: { contains: params.industry, mode: 'insensitive' as const } },
                { subindustriesOfInterest: { contains: params.industry, mode: 'insensitive' as const } }
              ]
            }]
          : []),
        ...(params.geography ? [{ geographyOfInterest: { contains: params.geography, mode: 'insensitive' as const } }] : [])
      ]
    },
    include: { owner: true },
    orderBy: { createdAt: 'desc' }
  });

  const totalBuyers = await prisma.buyer.count({ where: buyerReadWhere(user) });
  const activeBuyers = await prisma.buyer.count({
    where: { ...buyerReadWhere(user), activeStatus: true }
  });

  return (
    <div className="layout">
      <Sidebar user={user} />
      <main className="content">
        <TopHeader user={user} />
        <div className="page-header">
          <div>
            <h1 className="page-title">Buyers</h1>
            <p className="page-subtitle">Manage buyer profiles and contact information</p>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalBuyers}</div>
              <div className="stat-label">Total Buyers</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Building size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{activeBuyers}</div>
              <div className="stat-label">Active Buyers</div>
            </div>
          </div>
        </div>

        <div className="filters-section">
          <div className="filters-header">
            <h3 className="filters-title">
              <Database size={18} />
              Filters
            </h3>
          </div>
          <form className="filters-form">
            <div className="filter-grid">
              <input className="input" name="buyerType" placeholder="Buyer type" defaultValue={params.buyerType || ''} />
              <input className="input" name="sourceSystem" placeholder="Source system" defaultValue={params.sourceSystem || ''} />
              <input className="input" name="visibilityMode" placeholder="Visibility mode" defaultValue={params.visibilityMode || ''} />
              <input className="input" name="industry" placeholder="Industry interest" defaultValue={params.industry || ''} />
              <input className="input" name="geography" placeholder="Geography interest" defaultValue={params.geography || ''} />
              <button className="button primary" type="submit">
                <Database size={16} />
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        <div className="table-section">
          <div className="table-card">
            <div className="table-header">
              <h3>All Buyers ({buyers.length})</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Type</th>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Owner</th>
                    <th>Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((buyer) => (
                    <tr key={buyer.id}>
                      <td>{buyer.fullName || '-'}</td>
                      <td>{buyer.companyName || '-'}</td>
                      <td>
                        <span className="badge">
                          {buyer.buyerType || '-'}
                        </span>
                      </td>
                      <td>
                        {buyer.emailPrimary ? (
                          <div className="email-cell">
                            <Mail size={14} />
                            {buyer.emailPrimary}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <span className="badge source">
                          {buyer.sourceSystem || '-'}
                        </span>
                      </td>
                      <td>{buyer.owner ? `${buyer.owner.firstName} ${buyer.owner.lastName}` : '-'}</td>
                      <td>
                        <span className={`status-badge ${buyer.visibilityMode}`}>
                          {buyer.visibilityMode}
                        </span>
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

