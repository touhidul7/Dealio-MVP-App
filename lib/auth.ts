import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

const COOKIE_NAME = 'dealio_session';

export async function getCurrentUser() {
  const store = await cookies();
  const userId = store.get(COOKIE_NAME)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.activeStatus) return { ok: false as const, message: 'Invalid credentials' };
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false as const, message: 'Invalid credentials' };
  const store = await cookies();
  store.set(COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  });
  return { ok: true as const, user };
}

export async function logout() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireUser(allowedRoles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }
  return user;
}
