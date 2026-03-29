import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { matchReadWhere } from '@/lib/permissions';
import { UserCheck, FileText, TrendingUp, Filter } from 'lucide-react';

type SearchParams = {
  listing?: string;
  buyerType?: string;
  minScore?: string;
};

export default async function MatchesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const matches = await prisma.match.findMany({
    where: {
      ...matchReadWhere(user),
      ...(params.listing
        ? { listing: { title: { contains: params.listing, mode: 'insensitive' as const } } }
        : {}),
      ...(params.buyerType
        ? { buyer: { buyerType: { equals: params.buyerType, mode: 'insensitive' as const } } }
        : {}),
      ...(params.minScore ? { totalScore: { gte: Number(params.minScore) || 0 } } : {})
    },
    include: { listing: true, buyer: true },
    orderBy: { totalScore: 'desc' }
  });

  const totalMatches = await prisma.match.count({ where: matchReadWhere(user) });
  const highScoreMatches = await prisma.match.count({
    where: { ...matchReadWhere(user), totalScore: { gte: 80 } }
  });

  return (
    <div className="layout">
      <Sidebar user={user} />
      <main className="content">
        <TopHeader user={user} />
        <div className="page-header">
          <div>
            <h1 className="page-title">Matches</h1>
            <p className="page-subtitle">View and manage buyer-listing matches</p>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <UserCheck size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalMatches}</div>
              <div className="stat-label">Total Matches</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{highScoreMatches}</div>
              <div className="stat-label">High Score Matches (80%+)</div>
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
              <input className="input" name="listing" placeholder="Listing title" defaultValue={params.listing || ''} />
              <input className="input" name="buyerType" placeholder="Buyer type" defaultValue={params.buyerType || ''} />
              <input className="input" name="minScore" placeholder="Minimum score" type="number" defaultValue={params.minScore || ''} />
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
              <h3>All Matches ({matches.length})</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Buyer</th>
                    <th>Match Score</th>
                    <th>Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="listing-cell">
                          <FileText size={14} />
                          {m.listing.title}
                        </div>
                      </td>
                      <td>
                        <div className="buyer-cell">
                          <UserCheck size={14} />
                          {m.buyer.fullName || m.buyer.companyName || 'Buyer'}
                        </div>
                      </td>
                      <td>
                        <div className="score-container">
                          <div className="score-bar" style={{ width: `${m.totalScore}%` }}></div>
                          <span className="score-text">{m.totalScore}%</span>
                        </div>
                      </td>
                      <td className="explanation-cell">
                        {m.explanationText}
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

