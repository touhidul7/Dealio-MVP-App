import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listingReadWhere } from '@/lib/permissions';
import { ExternalLink, User, Database, Filter } from 'lucide-react';
import Link from 'next/link';

type SearchParams = {
  advisor?: string;
  platform?: string;
  status?: string;
  industry?: string;
};

export default async function ExternalOpportunitiesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const advisors = await prisma.user.findMany({
    where: user.role === 'admin' ? { role: 'advisor' } : { id: user.id },
    orderBy: { firstName: 'asc' }
  });

  const opportunities = await prisma.listing.findMany({
    where: {
      ...listingReadWhere(user),
      listingType: 'external',
      ...(params.advisor ? { assignedUserId: params.advisor } : {}),
      ...(params.platform ? { sourcePlatform: { contains: params.platform, mode: 'insensitive' as const } } : {}),
      ...(params.status ? { status: params.status as any } : {}),
      ...(params.industry ? { industry: { contains: params.industry, mode: 'insensitive' as const } } : {})
    },
    include: { assignedUser: true },
    orderBy: { createdAt: 'desc' }
  });

  const totalOpportunities = await prisma.listing.count({
    where: { ...listingReadWhere(user), listingType: 'external' }
  });

  const activeOpportunities = await prisma.listing.count({
    where: { ...listingReadWhere(user), listingType: 'external', status: 'active' }
  });

  return (
    <div className="layout">
      <Sidebar user={user} />
      <main className="content">
        <TopHeader user={user} />
        <div className="page-header">
          <div>
            <h1 className="page-title">External Opportunities</h1>
            <p className="page-subtitle">Track and manage external marketplace opportunities</p>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <ExternalLink size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalOpportunities}</div>
              <div className="stat-label">Total Opportunities</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <User size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{activeOpportunities}</div>
              <div className="stat-label">Active Opportunities</div>
            </div>
          </div>
        </div>

        <div className="filters-section">
          <div className="filters-header">
            <h3 className="filters-title">
              <Filter size={18} />
              Filters
            </h3>
          </div>
          <form className="filters-form">
            <div className="filter-grid">
              <select className="select" name="advisor" defaultValue={params.advisor || ''}>
                <option value="">All advisors</option>
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.firstName} {advisor.lastName}
                  </option>
                ))}
              </select>
              <input className="input" name="platform" placeholder="Source platform" defaultValue={params.platform || ''} />
              <input className="input" name="status" placeholder="Status" defaultValue={params.status || ''} />
              <input className="input" name="industry" placeholder="Industry" defaultValue={params.industry || ''} />
              <button className="button primary" type="submit">
                <Filter size={16} />
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        <div className="table-section">
          <div className="table-card">
            <div className="table-header">
              <h3>All Opportunities ({opportunities.length})</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Platform</th>
                    <th>Source URL</th>
                    <th>Industry</th>
                    <th>Status</th>
                    <th>Assigned Advisor</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={`/listings/${item.id}/edit`} className="table-link">
                          {item.title}
                        </Link>
                      </td>
                      <td>
                        <span className="badge platform">
                          {item.sourcePlatform || '-'}
                        </span>
                      </td>
                      <td>
                        {item.sourceUrl ? (
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="external-link">
                            <ExternalLink size={14} />
                            Open source
                          </a>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>{item.industry}</td>
                      <td>
                        <span className={`status-badge ${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.assignedUser ? `${item.assignedUser.firstName} ${item.assignedUser.lastName}` : '-'}</td>
                      <td className="notes-cell">
                        {item.advisorNotes || item.businessSummary || '-'}
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

