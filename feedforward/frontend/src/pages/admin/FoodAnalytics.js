import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatCard from '../../components/StatCard';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#16a34a', '#7c3aed', '#d97706', '#ef4444', '#0ea5e9', '#64748b'];

export default function FoodAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/food-analytics')
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load food analytics'))
      .finally(() => setLoading(false));
  }, []);

  const statusPie = useMemo(() => {
    const counts = data?.statusCounts || [];
    return counts.map((c) => ({
      name: c._id?.charAt(0).toUpperCase() + c._id?.slice(1),
      value: c.count,
    }));
  }, [data]);

  const series = useMemo(() => {
    const ts = data?.timeSeries || [];
    return ts.map((d) => ({
      label: `${MONTH_NAMES[d.month - 1]} ${String(d.year).slice(-2)}`,
      foodAdded: d.foodAdded,
      quantityAdded: d.quantityAdded,
      quantityDistributed: d.quantityDistributed,
      requests: d.requests,
      fulfilled: d.fulfilled,
    }));
  }, [data]);

  if (loading) return <LoadingSpinner text="Loading food analytics..." />;

  const totals = data?.totals || {};
  const reqTotals = data?.requestTotals || {};

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">Food Analytics</h2>
        <p className="text-stone-500 text-sm mt-1">Distribution, remaining, expiry, and fulfillment</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Distributed Qty" value={totals.distributedQuantity || 0} icon="📦" color="forest" />
        <StatCard label="Remaining Qty" value={totals.remainingQuantity || 0} icon="⚖️" color="blue" />
        <StatCard label="Requests" value={reqTotals.totalRequests || 0} icon="📬" color="amber" />
        <StatCard label="Fulfilled" value={reqTotals.fulfilledRequests || 0} icon="🎉" color="earth" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-stone-700 mb-4">Requests vs Fulfilled (6 months)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={series} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }} />
              <Legend />
              <Bar dataKey="requests" name="Requests" fill="#d97706" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fulfilled" name="Fulfilled" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-stone-700 mb-4">Food Status</h3>
          {statusPie.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-stone-300 text-sm">No data yet</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-stone-700 mb-4">Quantity Added vs Distributed (6 months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
            <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }} />
            <Legend />
            <Line type="monotone" dataKey="quantityAdded" name="Quantity Added" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="quantityDistributed" name="Quantity Distributed" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

