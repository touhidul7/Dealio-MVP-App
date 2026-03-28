import { redirect } from 'next/navigation';
import { getCurrentUser, login } from '@/lib/auth';

export default async function LoginPage() {
  const current = await getCurrentUser();
  if (current) redirect('/dashboard');

  async function submit(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');
    const result = await login(email, password);
    if (result.ok) redirect('/dashboard?toast=success&message=Signed%20in');
    redirect('/login?toast=error&message=Invalid%20credentials');
  }

  return (
    <main className="container" style={{ paddingTop: 80 }}>
      <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1>Login</h1>
        <p className="muted">Demo admin: {process.env.APP_DEMO_EMAIL} / {process.env.APP_DEMO_PASSWORD}</p>
        <form action={submit} className="grid">
          <input className="input" name="email" type="email" defaultValue="admin@dealio.local" required />
          <input className="input" name="password" type="password" defaultValue="password123" required />
          <button className="button" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}
