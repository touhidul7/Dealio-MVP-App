import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { buyerReadWhere, listingReadWhere, matchReadWhere } from '@/lib/permissions';
import Link from 'next/link';
import { BarChart3, Users, FileText, TrendingUp, AlertTriangle, Calendar, UserCheck, ExternalLink } from 'lucide-react';
import { ActivityChart, StatusChart } from '@/components/charts';

export default async function DashboardPage() {
  const user = await requireUser();
  const listingWhere = listingReadWhere(user);
  const buyerWhere = buyerReadWhere(user);
  const matchWhere = matchReadWhere(user);

  const [listings, buyers, matches, duplicates] = await Promise.all([
    prisma.listing.count({ where: listingWhere }),
    prisma.buyer.count({ where: buyerWhere }),
    prisma.match.count({ where: matchWhere }),
    prisma.buyerSourceRecord.count({
      where: {
        mergeReviewRequired: true,
        ...(user.role === 'admin' ? {} : { sourceOwnerUserId: user.id })
      }
    })
  ]);

  const [activeListings, externalOpportunities, recentListings, topMatches] = await Promise.all([
    prisma.listing.count({ where: { ...listingWhere, status: 'active' } }),
    prisma.listing.count({ where: { ...listingWhere, listingType: 'external' } }),
    prisma.listing.findMany({ where: listingWhere, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.match.findMany({
      where: matchWhere,
      orderBy: { totalScore: 'desc' },
      take: 5,
      include: { listing: true, buyer: true }
    })
  ]);

  const recentSync = await prisma.buyerSourceRecord.findFirst({
    where: user.role === 'admin' ? {} : { sourceOwnerUserId: user.id },
    orderBy: { lastSyncTimestamp: 'desc' }
  });

  // Mock data for charts (in a real app, you'd calculate this from actual data)
  const chartData = [
    { name: 'Jan', listings: 12, matches: 8 },
    { name: 'Feb', listings: 19, matches: 15 },
    { name: 'Mar', listings: 25, matches: 22 },
    { name: 'Apr', listings: 18, matches: 16 },
    { name: 'May', listings: 32, matches: 28 },
    { name: 'Jun', listings: 28, matches: 24 },
  ];

  const statusData = [
    { name: 'Active', value: activeListings, color: '#5eead4' },
    { name: 'Inactive', value: listings - activeListings, color: '#94a3b8' },
  ];

  return (
    <div className="layout">
      <Sidebar user={user} />
      <main className="content">
        <TopHeader user={user} />
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back! Here's your marketplace overview</p>
          </div>
          <div className="dashboard-actions">
            <Link href="/listings/new" className="button primary">
              <FileText size={16} />
              New Listing
            </Link>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{listings}</div>
              <div className="stat-label">Total Listings</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{activeListings}</div>
              <div className="stat-label">Active Listings</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <ExternalLink size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{externalOpportunities}</div>
              <div className="stat-label">External Opportunities</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{buyers}</div>
              <div className="stat-label">Buyers</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <UserCheck size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{matches}</div>
              <div className="stat-label">Matches</div>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{duplicates}</div>
              <div className="stat-label">Duplicate Reviews</div>
            </div>
          </div>
        </div>

        <div className="charts-section">
          <div className="chart-card">
            <h3 className="chart-title">Activity Overview</h3>
            <ActivityChart data={chartData} />
          </div>
          <div className="chart-card">
            <h3 className="chart-title">Listing Status</h3>
            <StatusChart data={statusData} />
            <div className="chart-legend">
              {statusData.map((item) => (
                <div key={item.name} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="tables-section">
          <div className="table-card">
            <div className="table-header">
              <h3>Recent Listings</h3>
              <Link href="/listings" className="view-all-link">View All</Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentListings.map((item) => (
                    <tr key={item.id} className="clickable-row">
                      <td>
                        <Link href={`/listings/${item.id}/edit`} className="table-link">
                          {item.title}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${item.listingType}`}>
                          {item.listingType}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="muted">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <h3>Top Matches</h3>
              <Link href="/matches" className="view-all-link">View All</Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Buyer</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topMatches.map((item) => (
                    <tr key={item.id} className="clickable-row">
                      <td>
                        <Link href={`/listings/${item.listing.id}/edit`} className="table-link">
                          {item.listing.title}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/buyers`} className="table-link">
                          {item.buyer.fullName || item.buyer.companyName || 'Buyer'}
                        </Link>
                      </td>
                      <td>
                        <div className="score-container">
                          <div className="score-bar" style={{ width: `${item.totalScore}%` }}></div>
                          <span className="score-text">{item.totalScore}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <div className="info-icon">
              <Calendar size={20} />
            </div>
            <div className="info-content">
              <div className="info-label">Last Sync</div>
              <div className="info-value">
                {recentSync ? new Date(recentSync.lastSyncTimestamp).toLocaleString() : 'No sync yet'}
              </div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">
              <UserCheck size={20} />
            </div>
            <div className="info-content">
              <div className="info-label">Your Role</div>
              <div className="info-value">{user.role}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

