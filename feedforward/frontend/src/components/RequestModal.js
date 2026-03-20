import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ExpiryCountdown from './ExpiryCountdown';

export default function RequestModal({ food, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (food?.remainingQuantity != null) {
      // Default to a small request (min 1, or remainingQuantity if < 1).
      setRequestedQuantity(String(Math.min(1, food.remainingQuantity)));
    }
  }, [food]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(requestedQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return toast.error('Enter a valid quantity');
    }
    if (food?.remainingQuantity != null && qty > food.remainingQuantity) {
      return toast.error(`Only ${food.remainingQuantity} ${food.unit} left`);
    }

    setLoading(true);
    try {
      await api.post('/request', { foodId: food._id, message, requestedQuantity: qty });
      toast.success('Request sent! The provider will be notified. 🎉');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  if (!food) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-display text-xl font-bold text-stone-800">Request Food</h3>
          <p className="text-stone-500 text-sm mt-1">Send a request to the provider</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-forest-50 rounded-xl border border-forest-100">
            <p className="font-semibold text-forest-800">{food.foodName}</p>
            <div className="mt-1.5 space-y-1 text-sm text-forest-700">
              <p>
                📦 Left: {food.remainingQuantity} {food.unit}
              </p>
              <p>📍 {food.location}</p>
              <p>
                <ExpiryCountdown expiryTime={food.expiryTime} />
              </p>
              <p>👤 Provider: {food.providerId?.name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Quantity to request *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(e.target.value)}
                  className="input"
                  placeholder="e.g. 2"
                  required
                />
                <div className="input flex items-center justify-center max-w-[120px] bg-stone-50 text-stone-600">
                  {food.unit}
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {food.remainingQuantity} {food.unit} available
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Message to Provider (optional)</label>
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
                ) : (
                  '🙏 Send Request'
                )}
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

