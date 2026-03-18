import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AddFood() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    foodName: '',
    totalQuantity: '',
    unit: 'kg',
    expiryTime: '',
    location: '',
    lat: '',
    lng: '',
    description: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLocate = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        toast.success('Location captured!');
      },
      () => toast.error('Could not get location')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/food/add', {
        ...form,
        totalQuantity: form.totalQuantity ? Number(form.totalQuantity) : form.totalQuantity,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
      });
      toast.success('Food listed successfully! 🎉');
      navigate('/provider/manage-foods');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add food');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-slide-up">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-stone-800">Add Food Listing</h2>
        <p className="text-stone-500 text-sm mt-1">Share your surplus food with those in need</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Food Name *</label>
              <input name="foodName" value={form.foodName} onChange={handleChange} className="input" placeholder="e.g. Rice and Dal, Biryani..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Quantity *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="totalQuantity"
                  value={form.totalQuantity}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g. 5"
                  required
                />
                <select name="unit" value={form.unit} onChange={handleChange} className="input max-w-[140px]" required>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="liters">liters</option>
                  <option value="plates">plates</option>
                  <option value="servings">servings</option>
                  <option value="packs">packs</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Expiry Date & Time *</label>
            <input type="datetime-local" name="expiryTime" value={form.expiryTime} onChange={handleChange} className="input" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Pickup Location *</label>
            <input name="location" value={form.location} onChange={handleChange} className="input" placeholder="Full address or landmark" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="input resize-none"
              placeholder="Any special notes — allergens, dietary info, packaging..."
            />
          </div>

          {/* Coordinates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-stone-700">GPS Coordinates (optional)</label>
              <button type="button" onClick={handleLocate} className="text-xs text-forest-600 font-medium hover:underline flex items-center gap-1">
                📍 Auto-detect
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input name="lat" value={form.lat} onChange={handleChange} className="input" placeholder="Latitude" />
              <input name="lng" value={form.lng} onChange={handleChange} className="input" placeholder="Longitude" />
            </div>
          </div>

          {/* Preview */}
          {(form.lat && form.lng) && (
            <div className="p-3 bg-forest-50 rounded-xl border border-forest-100 text-sm text-forest-700 flex items-center gap-2">
              📍 Location set: {form.lat}, {form.lng}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Listing food...
                </span>
              ) : '🌿 List Food'}
            </button>
            <button type="button" onClick={() => navigate('/provider/manage-foods')} className="btn-secondary px-6">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
