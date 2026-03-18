import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getSocket } from '../../services/socket';

const statusSteps = ['pending', 'accepted', 'completed'];

function RequestTracker({ status }) {
  const current = statusSteps.indexOf(status);
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 mt-3">
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs">❌</div>
        <span className="text-xs text-red-500 font-medium">Request was declined</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 mt-3">
      {statusSteps.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i <= current ? 'bg-forest-500 text-white' : 'bg-stone-200 text-stone-400'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs capitalize ${i <= current ? 'text-forest-600 font-medium' : 'text-stone-400'}`}>
              {step}
            </span>
          </div>
          {i < statusSteps.length - 1 && (
            <div className={`flex-1 h-0.5 mb-4 ${i < current ? 'bg-forest-400' : 'bg-stone-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/request/my')
      .then(({ data }) => setRequests(data))
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onFoodUpdated = (food) => {
      setRequests((prev) =>
        prev.map((r) => (r.foodId && r.foodId._id === food._id ? { ...r, foodId: food } : r))
      );
    };
    socket.on('foodUpdated', onFoodUpdated);
    return () => socket.off('foodUpdated', onFoodUpdated);
  }, []);

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">My Requests</h2>
        <p className="text-stone-500 text-sm mt-1">
          Track the status of all your food requests
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: requests.length, color: 'bg-stone-100 text-stone-700' },
          { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, color: 'bg-amber-100 text-amber-700' },
          { label: 'Accepted', count: requests.filter(r => r.status === 'accepted').length, color: 'bg-teal-100 text-teal-700' },
          { label: 'Received', count: requests.filter(r => r.status === 'completed').length, color: 'bg-forest-100 text-forest-700' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-display font-bold">{s.count}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'accepted', 'completed', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === s ? 'bg-forest-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-stone-500 font-medium">No requests here</p>
          <p className="text-stone-400 text-sm mt-1">Browse available food to make a request</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <div
              key={req._id}
              className={`card hover:shadow-md transition-all ${
                req.status === 'accepted' ? 'border-teal-200 bg-teal-50/20' :
                req.status === 'completed' ? 'border-forest-200 bg-forest-50/20' :
                req.status === 'rejected' ? 'border-red-100 bg-red-50/10' : ''
              }`}
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-800">
                      {req.foodId?.foodName || 'Food Item'}
                    </h3>
                    <StatusBadge status={req.status} />
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-stone-500">
                    <p>📍 {req.foodId?.location || '—'}</p>
                    <p>📦 Requested: {req.requestedQuantity} {req.foodId?.unit || ''}</p>
                    {req.foodId && (
                      <p className="text-xs text-stone-400">
                        Remaining: {req.foodId.remainingQuantity} {req.foodId.unit} / {req.foodId.totalQuantity} {req.foodId.unit}
                      </p>
                    )}
                    <p>👤 Provider: <span className="font-medium text-stone-700">{req.providerId?.name}</span></p>
                    {req.message && <p>💬 Your message: {req.message}</p>}
                    <p className="text-xs text-stone-400">
                      Requested on {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Tracker */}
                  <div className="mt-3 max-w-xs">
                    <RequestTracker status={req.status} />
                  </div>
                </div>

                {req.status === 'completed' && (
                  <div className="flex flex-col items-center gap-1 bg-forest-50 rounded-xl p-4 border border-forest-100">
                    <span className="text-3xl">🎉</span>
                    <span className="text-xs text-forest-700 font-semibold text-center">Delivered!</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
