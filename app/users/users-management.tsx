'use client';

import { useMemo, useState } from 'react';
import type { Role } from '@prisma/client';
import toast from 'react-hot-toast';

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  activeStatus: boolean;
  ghlSubaccountId: string | null;
  googleSheetSourceId: string | null;
};

type ModalMode = 'add' | 'edit' | 'delete' | null;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  ghlSubaccountId: string;
  googleSheetSourceId: string;
  password: string;
  newPassword: string;
  activeStatus: boolean;
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'advisor',
  ghlSubaccountId: '',
  googleSheetSourceId: '',
  password: '',
  newPassword: '',
  activeStatus: true
};

export function UsersManagement({
  initialUsers,
  currentUserId
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId) || null, [users, selectedUserId]);

  function openAdd() {
    setForm(emptyForm);
    setSelectedUserId('');
    setModal('add');
  }

  function openEdit(user: UserRow) {
    setSelectedUserId(user.id);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      ghlSubaccountId: user.ghlSubaccountId || '',
      googleSheetSourceId: user.googleSheetSourceId || '',
      password: '',
      newPassword: '',
      activeStatus: user.activeStatus
    });
    setModal('edit');
  }

  function openDelete(user: UserRow) {
    setSelectedUserId(user.id);
    setModal('delete');
  }

  function closeModal() {
    setModal(null);
    setSelectedUserId('');
  }

  async function createUser() {
    const req = fetch('/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
        ghlSubaccountId: form.ghlSubaccountId,
        googleSheetSourceId: form.googleSheetSourceId
      })
    });
    await toast.promise(
      req.then(async (r) => {
        const data = (await r.json()) as { ok?: boolean; message?: string };
        if (!r.ok || !data.ok) throw new Error(data.message || 'Create failed');
        return data.message || 'User created';
      }),
      {
        loading: 'Creating user...',
        success: (m) => m,
        error: (e) => (e instanceof Error ? e.message : 'Create failed')
      }
    );
    window.location.reload();
  }

  async function updateUser() {
    if (!selectedUserId) return;
    const req = fetch(`/api/users/${selectedUserId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        ghlSubaccountId: form.ghlSubaccountId,
        googleSheetSourceId: form.googleSheetSourceId,
        activeStatus: form.activeStatus,
        newPassword: form.newPassword || undefined
      })
    });
    await toast.promise(
      req.then(async (r) => {
        const data = (await r.json()) as { ok?: boolean; message?: string };
        if (!r.ok || !data.ok) throw new Error(data.message || 'Update failed');
        return data.message || 'User updated';
      }),
      {
        loading: 'Updating user...',
        success: (m) => m,
        error: (e) => (e instanceof Error ? e.message : 'Update failed')
      }
    );
    window.location.reload();
  }

  async function deleteUser() {
    if (!selectedUserId) return;
    const req = fetch(`/api/users/${selectedUserId}`, { method: 'DELETE' });
    await toast.promise(
      req.then(async (r) => {
        const data = (await r.json()) as { ok?: boolean; message?: string };
        if (!r.ok || !data.ok) throw new Error(data.message || 'Delete failed');
        return data.message || 'User removed';
      }),
      {
        loading: 'Removing user...',
        success: (m) => m,
        error: (e) => (e instanceof Error ? e.message : 'Delete failed')
      }
    );
    window.location.reload();
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Users</h1>
        <button className="button" type="button" onClick={openAdd}>
          Add User
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Subaccount</th>
            <th>Sheet Source</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.ghlSubaccountId || '-'}</td>
              <td>{u.googleSheetSourceId || '-'}</td>
              <td>{u.activeStatus ? 'active' : 'inactive'}</td>
              <td>
                <div className="row">
                  <button className="button secondary" type="button" onClick={() => openEdit(u)}>Edit</button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => openDelete(u)}
                    disabled={u.id === currentUserId}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modal === 'add' ? (
              <>
                <h2>Add User</h2>
                <div className="grid">
                  <input className="input" placeholder="First name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                  <input className="input" placeholder="Last name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                  <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  <input className="input" type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                  <select className="select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
                    <option value="advisor">advisor</option>
                    <option value="admin">admin</option>
                  </select>
                  <input className="input" placeholder="GHL subaccount ID" value={form.ghlSubaccountId} onChange={(e) => setForm((f) => ({ ...f, ghlSubaccountId: e.target.value }))} />
                  <input className="input" placeholder="Google sheet source ID" value={form.googleSheetSourceId} onChange={(e) => setForm((f) => ({ ...f, googleSheetSourceId: e.target.value }))} />
                </div>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="button secondary" type="button" onClick={closeModal}>Cancel</button>
                  <button className="button" type="button" onClick={() => void createUser()}>Create</button>
                </div>
              </>
            ) : null}

            {modal === 'edit' && selectedUser ? (
              <>
                <h2>Edit User</h2>
                <div className="grid">
                  <input className="input" placeholder="First name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                  <input className="input" placeholder="Last name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                  <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  <select className="select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
                    <option value="advisor">advisor</option>
                    <option value="admin">admin</option>
                  </select>
                  <select className="select" value={String(form.activeStatus)} onChange={(e) => setForm((f) => ({ ...f, activeStatus: e.target.value === 'true' }))}>
                    <option value="true">active</option>
                    <option value="false">inactive</option>
                  </select>
                  <input className="input" placeholder="GHL subaccount ID" value={form.ghlSubaccountId} onChange={(e) => setForm((f) => ({ ...f, ghlSubaccountId: e.target.value }))} />
                  <input className="input" placeholder="Google sheet source ID" value={form.googleSheetSourceId} onChange={(e) => setForm((f) => ({ ...f, googleSheetSourceId: e.target.value }))} />
                  <input className="input" type="password" placeholder="Set new password (optional)" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} />
                </div>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="button secondary" type="button" onClick={closeModal}>Cancel</button>
                  <button className="button" type="button" onClick={() => void updateUser()}>Save</button>
                </div>
              </>
            ) : null}

            {modal === 'delete' && selectedUser ? (
              <>
                <h2>Delete User</h2>
                <p className="muted">
                  Delete <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>? If deletion is blocked by relations,
                  the account will be deactivated.
                </p>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="button secondary" type="button" onClick={closeModal}>Cancel</button>
                  <button className="button" type="button" onClick={() => void deleteUser()}>Delete</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
