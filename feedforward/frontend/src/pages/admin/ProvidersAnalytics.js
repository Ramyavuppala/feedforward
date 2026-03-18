import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const formatPct = (n) => `${Number.isFinite(n) ? n : 0}%`;

export default function ProvidersAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get('/admin/providers-analytics')
      .then(({ data }) => setRows(data))
      .catch(() => toast.error('Failed to load provider analytics'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (loading) return <LoadingSpinner text="Loading provider analytics..." />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-800">Provider Analytics</h2>
          <p className="text-stone-500 text-sm mt-1">Top providers by distributed quantity</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
          placeholder="Search provider name/email..."
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Provider</th>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Food</th>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Qty</th>
                <th className="text-left px-5 py-3 text-stone-500 font-semibold">Requests</th>
                <th className="text-right px-5 py-3 text-stone-500 font-semibold">Acceptance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400">
                    No providers found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.providerId} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="min-w-[220px]">
                        <div className="font-medium text-stone-800">{r.name}</div>
                        <div className="text-xs text-stone-400">{r.email}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      {r.foodListings} listing{r.foodListings === 1 ? '' : 's'}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      <div className="text-xs text-stone-400">Distributed</div>
                      <div className="font-semibold text-stone-800">{r.distributedQuantity}</div>
                      <div className="text-xs text-stone-400">
                        Remaining {r.remainingQuantity} / Added {r.totalQuantity}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      <div className="text-xs text-stone-400">Total</div>
                      <div className="font-semibold text-stone-800">{r.totalRequests}</div>
                      <div className="text-xs text-stone-400">
                        Completed {r.completed} · Rejected {r.rejected}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="badge bg-forest-100 text-forest-700">
                        {formatPct(r.acceptanceRate)}
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

