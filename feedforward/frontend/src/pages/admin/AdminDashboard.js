import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#7c3aed', '#16a34a', '#d97706'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => {
      setStats(data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading analytics..." />;

  const monthlyData = MONTH_NAMES.map((m, i) => {
    const foods = stats.monthlyFoods.find((d) => d._id.month === i + 1)?.count || 0;
    const reqs = stats.monthlyRequests.find((d) => d._id.month === i + 1)?.count || 0;
    return { month: m, foods, requests: reqs };
  }).slice(-6);

  const pieData = (stats.roleDistribution || []).map((r) => ({
    name: r._id?.charAt(0).toUpperCase() + r._id?.slice(1),
    value: r.count,
  }));

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">Platform Analytics</h2>
        <p className="text-stone-500 text-sm mt-1">Overview of FeedForward activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon="👥" color="purple" />
        <StatCard label="Food Listings" value={stats.totalFoodListings} icon="🍱" color="forest" />
        <StatCard label="Active Listings" value={stats.activeFood} icon="✅" color="blue" />
        <StatCard label="Deliveries Done" value={stats.completedRequests} icon="🎉" color="earth" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={stats.totalRequests} icon="📬" color="amber" />
        <StatCard label="Expired Food" value={stats.expiredFood} icon="⏰" color="red" />
        <StatCard label="Success Rate" value={`${stats.totalRequests ? Math.round((stats.completedRequests / stats.totalRequests) * 100) : 0}%`} icon="📈" color="forest" />
        <StatCard label="Distributed Qty" value={stats.distributedQuantity || 0} icon="📦" color="purple" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Providers" value={stats.totalProviders} icon="🏪" color="blue" />
        <StatCard label="Total Seekers" value={stats.totalSeekers} icon="🙋" color="earth" />
        <StatCard label="Remaining Qty" value={stats.remainingQuantity || 0} icon="⚖️" color="amber" />
        <StatCard label="Completed Food" value={stats.completedFood || 0} icon="✔️" color="forest" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-stone-700 mb-4">Monthly Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }}
              />
              <Legend />
              <Bar dataKey="foods" name="Food Listed" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="requests" name="Requests" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h3 className="font-semibold text-stone-700 mb-4">User Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-stone-300 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Line Chart */}
      <div className="card">
        <h3 className="font-semibold text-stone-700 mb-4">Requests Trend (6 months)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} />
            <YAxis tick={{ fontSize: 12, fill: '#78716c' }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }} />
            <Line type="monotone" dataKey="requests" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4, fill: '#d97706' }} />
            <Line type="monotone" dataKey="foods" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
