import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="hero container">
      <div className="grid" style={{ gap: 28 }}>
        <div className="badge">Internal-only Phase 1 MVP</div>
        <div>
          <h1 style={{ fontSize: 52, lineHeight: 1.1, margin: 0 }}>Dealio Marketplace App</h1>
          <p className="muted" style={{ maxWidth: 800, fontSize: 18 }}>
            Full-stack starter for listings, buyer graph, dedupe queue, Google Sheets and GHL sync stubs, and buyer-to-listing scoring.
          </p>
        </div>
        <div className="row">
          <Link href="/login" className="button">Open App</Link>
          <a href="#features" className="button secondary">View Features</a>
        </div>
        <div id="features" className="grid grid-4">
          {['Auth + Roles', 'Listings', 'Buyer Graph', 'Match Engine'].map((item) => (
            <div key={item} className="card"><strong>{item}</strong></div>
          ))}
        </div>
      </div>
    </main>
  );
}
