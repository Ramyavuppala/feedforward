import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const roleBadge = {
  admin:    'bg-purple-100 text-purple-700',
  provider: 'bg-forest-100 text-forest-700',
  seeker:   'bg-earth-100 text-earth-700',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/user/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const filtered = users.filter((u) => {
    const matchRole = filter === 'all' || u.role === filter;
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-800">Users</h2>
          <p className="text-stone-500 text-sm mt-1">{users.length} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-xs"
            placeholder="Search by name or email..."
          />
          <div className="flex gap-2">
            {['all', 'admin', 'provider', 'seeker'].map((r) => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === r ? 'bg-forest-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">User</th>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Email</th>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Role</th>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Joined</th>
                <th className="text-right px-5 py-3 text-stone-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400">No users found</td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center font-semibold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-stone-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge capitalize ${roleBadge[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3.5 text-stone-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
