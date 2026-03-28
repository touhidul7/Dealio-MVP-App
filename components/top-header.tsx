import { getCurrentUser, logout } from '@/lib/auth';

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
}

export async function TopHeader() {
  const user = await getCurrentUser();
  if (!user) return null;

  async function signOut() {
    'use server';
    await logout();
  }

  return (
    <header className="top-header">
      <div className="muted">Dealio Internal Dashboard</div>
      <details className="profile-menu">
        <summary className="profile-trigger" aria-label="Open profile menu">
          <span className="profile-avatar">{initials(user.firstName, user.lastName)}</span>
        </summary>
        <div className="profile-dropdown">
          <div style={{ fontWeight: 700 }}>
            {user.firstName} {user.lastName}
          </div>
          <div className="muted">{user.email}</div>
          <div className="badge" style={{ marginTop: 8 }}>{user.role}</div>
          <form action={signOut} style={{ marginTop: 12 }}>
            <button className="button secondary" type="submit" style={{ width: '100%' }}>
              Sign out
            </button>
          </form>
        </div>
      </details>
    </header>
  );
}
