import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [available, setAvailable] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/food/all'),
      api.get('/request/my'),
    ]).then(([f, r]) => {
      setAvailable(f.data);
      setRequests(r.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const stats = {
    available: available.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">
          Welcome, {user?.name?.split(' ')[0]} 🙏
        </h2>
        <p className="text-stone-500 text-sm mt-1">Find food available near you</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Food Available" value={stats.available} icon="🍱" color="forest" />
        <StatCard label="My Requests" value={requests.length} icon="📋" color="blue" />
        <StatCard label="Accepted" value={stats.accepted} icon="🤝" color="earth" />
        <StatCard label="Received" value={stats.completed} icon="🎉" color="amber" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/seeker/available', icon: '🍱', label: 'Browse Food', desc: `${stats.available} items available`, color: 'bg-forest-600' },
          { to: '/seeker/my-requests', icon: '📋', label: 'My Requests', desc: `${stats.pending} pending requests`, color: 'bg-blue-600' },
          { to: '/seeker/map', icon: '🗺️', label: 'Food Map', desc: 'Find food near you', color: 'bg-earth-600' },
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

      {/* Nearby Food */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Available Food Nearby</h3>
          <Link to="/seeker/available" className="text-sm text-forest-600 hover:underline font-medium">View all</Link>
        </div>
        {available.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-4xl mb-2">🥲</div>
            <p className="text-stone-400 text-sm">No food available right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {available.slice(0, 4).map((food) => (
              <div key={food._id} className="p-3 rounded-xl border border-stone-100 hover:border-forest-200 hover:bg-forest-50/30 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-stone-800 text-sm">{food.foodName}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {food.quantity} · {food.location}
                    </p>
                    <p className="text-xs text-stone-400">
                      By {food.providerId?.name} · Expires {new Date(food.expiryTime).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={food.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">My Recent Requests</h3>
          <Link to="/seeker/my-requests" className="text-sm text-forest-600 hover:underline font-medium">View all</Link>
        </div>
        {requests.length === 0 ? (
          <p className="text-stone-400 text-sm py-6 text-center">You haven't made any requests yet</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {requests.slice(0, 5).map((req) => (
              <div key={req._id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-800 text-sm">{req.foodId?.foodName || '—'}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    From {req.providerId?.name} · {new Date(req.createdAt).toLocaleDateString()}
                  </p>
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
