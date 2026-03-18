import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const formatPct = (n) => `${Number.isFinite(n) ? n : 0}%`;

export default function SeekersAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get('/admin/seekers-analytics')
      .then(({ data }) => setRows(data))
      .catch(() => toast.error('Failed to load seeker analytics'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (loading) return <LoadingSpinner text="Loading seeker analytics..." />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-800">Seeker Analytics</h2>
          <p className="text-stone-500 text-sm mt-1">Most active seekers by received quantity</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
          placeholder="Search seeker name/email..."
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Seeker</th>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Requests</th>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Quantity</th>
                <th className="text-right px-5 py-3 text-stone-500 font-semibold">Success</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-stone-400">
                    No seekers found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.seekerId} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="min-w-[220px]">
                        <div className="font-medium text-stone-800">{r.name}</div>
                        <div className="text-xs text-stone-400">{r.email}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      <div className="text-xs text-stone-400">Total</div>
                      <div className="font-semibold text-stone-800">{r.totalRequests}</div>
                      <div className="text-xs text-stone-400">
                        Completed {r.completed} · Rejected {r.rejected}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      <div className="text-xs text-stone-400">Received</div>
                      <div className="font-semibold text-stone-800">{r.receivedQuantity}</div>
                      <div className="text-xs text-stone-400">Requested {r.requestedQuantity}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="badge bg-blue-100 text-blue-700">
                        {formatPct(r.successRate)}
                      </span>
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

