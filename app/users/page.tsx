import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsersManagement } from '@/app/users/users-management';
import { Users, Shield } from 'lucide-react';

export default async function UsersPage() {
  const user = await requireUser();
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      activeStatus: true,
      ghlSubaccountId: true,
      googleSheetSourceId: true
    }
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.activeStatus).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;

  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <TopHeader />
        <div className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage user accounts and permissions</p>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Shield size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{activeUsers}</div>
              <div className="stat-label">Active Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Shield size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{adminUsers}</div>
              <div className="stat-label">Admin Users</div>
            </div>
          </div>
        </div>

        <div className="users-section">
          <UsersManagement initialUsers={users} currentUserId={user.id} />
        </div>
      </main>
    </div>
  );
}
