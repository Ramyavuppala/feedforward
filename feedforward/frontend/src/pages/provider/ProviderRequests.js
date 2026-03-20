import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getSocket } from '../../services/socket';

export default function ProviderRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  const [assignVolunteerId, setAssignVolunteerId] = useState('');

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/request/provider');
      setRequests(data);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

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
    socket.on('foodUpdated', onFoodUpdated);
    socket.on('quantityUpdated', onQuantityUpdated);
    return () => {
      socket.off('foodUpdated', onFoodUpdated);
      socket.off('quantityUpdated', onQuantityUpdated);
    };
  }, []);

  const handleUpdate = async (id, status) => {
    setUpdating(id);
    try {
      const body = { status };
      // Optional volunteer assignment during acceptance.
      if (status === 'accepted' && assignVolunteerId.trim()) {
        body.volunteerId = assignVolunteerId.trim();
      }

      const { data } = await api.put(`/request/${id}`, body);
      setRequests((prev) => prev.map((r) => (r._id === id ? data : r)));
      const messages = { accepted: 'Request accepted! 🤝', rejected: 'Request rejected', completed: 'Marked as delivered! 🎉' };
      toast.success(messages[status]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update request');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">Food Requests</h2>
        <p className="text-stone-500 text-sm mt-1">
          {requests.filter((r) => r.status === 'pending').length} pending · {requests.length} total
        </p>
      </div>

      {/* Optional volunteer assignment on accept */}
      <div className="card py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-stone-800">Volunteer ID (optional)</p>
            <p className="text-xs text-stone-400 mt-0.5">
              If provided, this volunteer will be assigned when you accept a pending request.
            </p>
          </div>
          <input
            value={assignVolunteerId}
            onChange={(e) => setAssignVolunteerId(e.target.value)}
            className="input flex-1 sm:max-w-xs"
            placeholder="e.g. 660d... (User _id)"
          />
        </div>
      </div>

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
            {s !== 'all' && (
              <span className="ml-1.5 bg-black/10 rounded-full px-1.5 py-0.5 text-xs">
                {requests.filter((r) => r.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-4xl mb-3">📬</div>
          <p className="text-stone-400">No requests here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <div key={req._id} className={`card hover:shadow-md transition-all ${req.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : ''}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-800">{req.foodId?.foodName || 'Food Item'}</h3>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-stone-500">
                    <p>👤 Requested by: <span className="font-medium text-stone-700">{req.seekerId?.name}</span> ({req.seekerId?.email})</p>
                    <p>📍 Pickup: {req.foodId?.location}</p>
                    <p>📦 Requested: {req.requestedQuantity} {req.foodId?.unit}</p>
                    {req.foodId && (
                      <p className="text-xs text-stone-400">
                        Remaining: {req.foodId.remainingQuantity} {req.foodId.unit} / {req.foodId.totalQuantity} {req.foodId.unit}
                      </p>
                    )}
                    {req.message && <p>💬 Message: {req.message}</p>}
                    <p className="text-xs text-stone-400">
                      Requested on {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-[140px]">
                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdate(req._id, 'accepted')}
                        disabled={updating === req._id}
                        className="btn-primary text-sm py-2 flex items-center justify-center gap-1.5"
                      >
                        {updating === req._id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : '🤝'} Accept
                      </button>
                      <button
                        onClick={() => handleUpdate(req._id, 'rejected')}
                        disabled={updating === req._id}
                        className="btn-danger text-sm py-2"
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                  {req.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdate(req._id, 'completed')}
                      disabled={updating === req._id}
                      className="btn-primary text-sm py-2 flex items-center justify-center gap-1.5"
                    >
                      {updating === req._id ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : '🎉'} Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
