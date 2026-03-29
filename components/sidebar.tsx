import Link from 'next/link';
import type { AppShellUser } from '@/components/app-shell-user';

export function Sidebar({ user }: { user: AppShellUser }) {
  return (
    <aside className="sidebar">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Dealio</div>
        <div className="muted">Marketplace MVP</div>
        <div className="muted" style={{ marginTop: 8 }}>
          {`${user.firstName} ${user.lastName} (${user.role})`}
        </div>
      </div>
      <nav className="grid">
        <Link href="/dashboard" prefetch={true}>Dashboard</Link>
        <Link href="/listings" prefetch={true}>Listings</Link>
        <Link href="/listings/new" prefetch={false}>New Listing</Link>
        <Link href="/external-opportunities" prefetch={false}>External Opportunities</Link>
        <Link href="/buyers" prefetch={true}>Buyers</Link>
        <Link href="/matches" prefetch={true}>Matches</Link>
        <Link href="/duplicates" prefetch={false}>Duplicate Queue</Link>
        {user.role === 'admin' ? <Link href="/users" prefetch={false}>Users</Link> : null}
        <Link href="/sync-center" prefetch={false}>Sync Center</Link>
      </nav>
    </aside>
  );
}
