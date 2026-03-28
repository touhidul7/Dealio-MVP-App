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
        <Link href="/dashboard" prefetch={false}>Dashboard</Link>
        <Link href="/listings" prefetch={false}>Listings</Link>
        <Link href="/listings/new" prefetch={false}>New Listing</Link>
        <Link href="/external-opportunities" prefetch={false}>External Opportunities</Link>
        <Link href="/buyers" prefetch={false}>Buyers</Link>
        <Link href="/matches" prefetch={false}>Matches</Link>
        <Link href="/duplicates" prefetch={false}>Duplicate Queue</Link>
        {user?.role === 'admin' ? <Link href="/users" prefetch={false}>Users</Link> : null}
        <Link href="/sync-center" prefetch={false}>Sync Center</Link>
      </nav>
    </aside>
  );
}
