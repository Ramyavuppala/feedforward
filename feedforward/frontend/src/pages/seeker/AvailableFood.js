import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

function RequestModal({ food, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/request', { foodId: food._id, message });
      toast.success('Request sent! The provider will be notified. 🎉');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-display text-xl font-bold text-stone-800">Request Food</h3>
          <p className="text-stone-500 text-sm mt-1">Send a request to the provider</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Food Summary */}
          <div className="p-4 bg-forest-50 rounded-xl border border-forest-100">
            <p className="font-semibold text-forest-800">{food.foodName}</p>
            <div className="mt-1.5 space-y-1 text-sm text-forest-700">
              <p>📦 Qty: {food.quantity}</p>
              <p>📍 {food.location}</p>
              <p>⏰ Expires: {new Date(food.expiryTime).toLocaleString()}</p>
              <p>👤 Provider: {food.providerId?.name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Message to Provider (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Introduce yourself or share any relevant info..."
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : '🙏 Send Request'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary px-5">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AvailableFood() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchFoods = async () => {
    try {
      const { data } = await api.get('/food/all');
      setFoods(data);
    } catch {
      toast.error('Failed to load food listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFoods(); }, []);

  const filtered = foods.filter(
    (f) =>
      f.foodName.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner text="Finding food near you..." />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">Available Food</h2>
        <p className="text-stone-500 text-sm mt-1">{foods.length} listings available right now</p>
      </div>

      {/* Search */}
      <div className="card py-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Search by food name or location..."
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-5xl mb-3">🥲</div>
          <p className="text-stone-500 font-medium">No food found</p>
          <p className="text-stone-400 text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((food) => {
            const isExpiringSoon =
              new Date(food.expiryTime) - new Date() < 2 * 60 * 60 * 1000;

            return (
              <div
                key={food._id}
                className="card hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-forest-100 rounded-xl flex items-center justify-center text-2xl">
                    🍱
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={food.status} />
                    {isExpiringSoon && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        ⚡ Expiring Soon
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-stone-800">{food.foodName}</h3>
                {food.description && (
                  <p className="text-xs text-stone-400 mt-1 line-clamp-2">{food.description}</p>
                )}

                <div className="mt-3 space-y-1.5 text-xs text-stone-500 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span>📦</span> {food.quantity}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>📍</span> {food.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>👤</span> {food.providerId?.name}
                  </div>
                  <div className={`flex items-center gap-1.5 ${isExpiringSoon ? 'text-red-500 font-medium' : ''}`}>
                    <span>⏰</span> {new Date(food.expiryTime).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => setSelected(food)}
                  className="btn-primary w-full mt-4 py-2 text-sm"
                >
                  🙏 Request This Food
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <RequestModal
          food={selected}
          onClose={() => setSelected(null)}
          onSuccess={fetchFoods}
        />
      )}
    </div>
  );
}
