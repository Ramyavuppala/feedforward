import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getSocket } from '../../services/socket';
import StatusTracker from '../../components/StatusTracker';

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
    const onQuantityUpdated = ({ foodId, remainingQuantity, totalQuantity, unit, status }) => {
      setRequests((prev) =>
        prev.map((r) =>
          r.foodId && r.foodId._id === foodId
            ? { ...r, foodId: { ...r.foodId, remainingQuantity, totalQuantity, unit, status: status || r.foodId.status } }
            : r
        )
      );
    };
    const onTaskUpdated = (task) => {
      setRequests((prev) =>
        prev.map((r) => {
          if (!r.foodId || !r.providerId) return r;
          const sameFood = String(r.foodId._id) === String(task.foodId);
          const sameProvider = String(r.providerId._id) === String(task.providerId);
          if (!sameFood || !sameProvider) return r;
          return {
            ...r,
            volunteerTask: { status: task.status },
          };
        })
      );
    };

    const onDeliveryCompleted = ({ task }) => {
      onTaskUpdated(task);
    };

    socket.on('foodUpdated', onFoodUpdated);
    socket.on('quantityUpdated', onQuantityUpdated);
    socket.on('taskUpdated', onTaskUpdated);
    socket.on('deliveryCompleted', onDeliveryCompleted);
    return () => {
      socket.off('foodUpdated', onFoodUpdated);
      socket.off('quantityUpdated', onQuantityUpdated);
      socket.off('taskUpdated', onTaskUpdated);
      socket.off('deliveryCompleted', onDeliveryCompleted);
    };
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

                  {/* Live Status Tracker: Pending -> Accepted -> Picked -> Delivered */}
                  <div className="mt-3 max-w-xs">
                    {req.status === 'rejected' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs">❌</div>
                        <span className="text-xs text-red-500 font-medium">Request was declined</span>
                      </div>
                    ) : (
                      <StatusTracker
                        requestStatus={req.status}
                        volunteerStatus={req.volunteerTask?.status}
                      />
                    )}
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
