import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listingReadWhere } from '@/lib/permissions';
import type { ListingStatus, ListingType, Prisma } from '@prisma/client';
import { FileText, Plus, Filter, Search } from 'lucide-react';

type SearchParams = {
  type?: ListingType;
  status?: ListingStatus;
  industry?: string;
  location?: string;
};

export default async function ListingsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const filters: Prisma.ListingWhereInput[] = [];
  if (params.type) filters.push({ listingType: params.type });
  if (params.status) filters.push({ status: params.status });
  if (params.industry) filters.push({ industry: { contains: params.industry, mode: 'insensitive' } });
  if (params.location) {
    filters.push({
      OR: [
        { locationCountry: { contains: params.location, mode: 'insensitive' } },
        { locationStateProvince: { contains: params.location, mode: 'insensitive' } },
        { locationCity: { contains: params.location, mode: 'insensitive' } }
      ]
    });
  }

  const listings = await prisma.listing.findMany({
    where: {
      AND: [listingReadWhere(user), ...filters]
    },
    include: { owner: true, assignedUser: true },
    orderBy: { createdAt: 'desc' }
  });

  const totalListings = await prisma.listing.count({ where: listingReadWhere(user) });
  const activeListings = await prisma.listing.count({
    where: { ...listingReadWhere(user), status: 'active' }
  });

  return (
    <div className="layout">
      <Sidebar user={user} />
      <main className="content">
        <TopHeader user={user} />
        <div className="page-header">
          <div>
            <h1 className="page-title">Listings</h1>
            <p className="page-subtitle">Manage and track all marketplace listings</p>
          </div>
          <div className="page-actions">
            <Link href="/listings/new" className="button primary">
              <Plus size={16} />
              New Listing
            </Link>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalListings}</div>
              <div className="stat-label">Total Listings</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Search size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{activeListings}</div>
              <div className="stat-label">Active Listings</div>
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
              <select className="select" name="type" defaultValue={params.type || ''}>
                <option value="">All types</option>
                <option value="native">Native</option>
                <option value="advisor">Advisor</option>
                <option value="external">External</option>
              </select>
              <select className="select" name="status" defaultValue={params.status || ''}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="matched">Matched</option>
                <option value="archived">Archived</option>
              </select>
              <input className="input" name="industry" placeholder="Industry" defaultValue={params.industry || ''} />
              <input className="input" name="location" placeholder="Location" defaultValue={params.location || ''} />
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
              <h3>All Listings ({listings.length})</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Owner</th>
                    <th>Assigned Advisor</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((item) => (
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
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{item.industry}</td>
                      <td>{[item.locationCity, item.locationStateProvince, item.locationCountry].filter(Boolean).join(', ') || '-'}</td>
                      <td>{item.owner.firstName} {item.owner.lastName}</td>
                      <td>{item.assignedUser ? `${item.assignedUser.firstName} ${item.assignedUser.lastName}` : '-'}</td>
                      <td>
                        <Link href={`/listings/${item.id}/edit`} className="action-link">
                          Edit
                        </Link>
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

