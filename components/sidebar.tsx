import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

export async function Sidebar() {
  const user = await getCurrentUser();

  return (
    <aside className="sidebar">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Dealio</div>
        <div className="muted">Marketplace MVP</div>
        <div className="muted" style={{ marginTop: 8 }}>
          {user ? `${user.firstName} ${user.lastName} (${user.role})` : 'Guest'}
        </div>
      </div>
      <nav className="grid">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/listings">Listings</Link>
        <Link href="/listings/new">New Listing</Link>
        <Link href="/external-opportunities">External Opportunities</Link>
        <Link href="/buyers">Buyers</Link>
        <Link href="/matches">Matches</Link>
        <Link href="/duplicates">Duplicate Queue</Link>
        {user?.role === 'admin' ? <Link href="/users">Users</Link> : null}
        <Link href="/sync-center">Sync Center</Link>
      </nav>
    </aside>
  );
}
