import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ExpiryCountdown from '../../components/ExpiryCountdown';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/food/provider'),
      api.get('/request/provider'),
    ]).then(([f, r]) => {
      setFoods(f.data);
      setRequests(r.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const stats = {
    total: foods.length,
    available: foods.filter((f) => f.status === 'available').length,
    pending: requests.filter((r) => r.status === 'pending').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">
          Good day, {user?.name?.split(' ')[0]} 🌿
        </h2>
        <p className="text-stone-500 text-sm mt-1">Here's what's happening with your listings</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Listed" value={stats.total} icon="🍱" color="forest" />
        <StatCard label="Available" value={stats.available} icon="✅" color="blue" />
        <StatCard label="Pending Requests" value={stats.pending} icon="📬" color="amber" />
        <StatCard label="Completed" value={stats.completed} icon="🎉" color="earth" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/provider/add-food', icon: '➕', label: 'Add New Food', desc: 'List surplus food for donation', color: 'bg-forest-600' },
          { to: '/provider/manage-foods', icon: '🥘', label: 'Manage Listings', desc: 'View and update your listings', color: 'bg-blue-600' },
          { to: '/provider/requests', icon: '📬', label: 'View Requests', desc: `${stats.pending} pending requests`, color: 'bg-amber-500' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex items-start gap-4">
            <div className={`${a.color} w-11 h-11 rounded-xl flex items-center justify-center text-xl text-white shadow-sm flex-shrink-0`}>
              {a.icon}
            </div>
            <div>
              <p className="font-semibold text-stone-800">{a.label}</p>
              <p className="text-sm text-stone-500 mt-0.5">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent listings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Recent Listings</h3>
          <Link to="/provider/manage-foods" className="text-sm text-forest-600 hover:underline font-medium">
            View all
          </Link>
        </div>
        {foods.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-4xl mb-2">🥘</div>
            <p className="text-stone-400 text-sm">No listings yet.</p>
            <Link to="/provider/add-food" className="text-forest-600 text-sm font-medium hover:underline mt-1 block">
              Add your first food →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {foods.slice(0, 5).map((food) => (
              <div key={food._id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-800 text-sm">{food.foodName}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {food.quantity} · {food.location}
                  </p>
                  <div className="mt-1">
                    {food.expiryTime ? <ExpiryCountdown expiryTime={food.expiryTime} /> : null}
                  </div>
                </div>
                <StatusBadge status={food.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent requests */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Recent Requests</h3>
          <Link to="/provider/requests" className="text-sm text-forest-600 hover:underline font-medium">View all</Link>
        </div>
        {requests.length === 0 ? (
          <p className="text-stone-400 text-sm py-6 text-center">No requests received yet</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {requests.slice(0, 5).map((req) => (
              <div key={req._id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-800 text-sm">{req.foodId?.foodName || '—'}</p>
                  <p className="text-xs text-stone-400 mt-0.5">From: {req.seekerId?.name}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
