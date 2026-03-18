import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getSocket } from '../../services/socket';

export default function ManageFoods() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchFoods = async () => {
    try {
      const { data } = await api.get('/food/provider');
      setFoods(data);
    } catch {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFoods(); }, []);

  useEffect(() => {
    const socket = getSocket();
    const onFoodUpdated = (food) => setFoods((prev) => prev.map((f) => (f._id === food._id ? food : f)));
    const onFoodDeleted = ({ _id }) => setFoods((prev) => prev.filter((f) => f._id !== _id));
    const onFoodAdded = (food) => setFoods((prev) => [food, ...prev]);
    const onQuantityUpdated = ({ foodId, remainingQuantity, totalQuantity, unit, status }) => {
      setFoods((prev) =>
        prev.map((f) =>
          f._id === foodId ? { ...f, remainingQuantity, totalQuantity, unit, status: status || f.status } : f
        )
      );
    };

    socket.on('foodUpdated', onFoodUpdated);
    socket.on('foodDeleted', onFoodDeleted);
    socket.on('foodAdded', onFoodAdded);
    socket.on('quantityUpdated', onQuantityUpdated);

    return () => {
      socket.off('foodUpdated', onFoodUpdated);
      socket.off('foodDeleted', onFoodDeleted);
      socket.off('foodAdded', onFoodAdded);
      socket.off('quantityUpdated', onQuantityUpdated);
    };
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/food/${id}`);
      setFoods((prev) => prev.filter((f) => f._id !== id));
      toast.success('Listing deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleMarkDelivered = async (id) => {
    try {
      const { data } = await api.put(`/food/status/${id}`, { status: 'delivered' });
      setFoods((prev) => prev.map((f) => (f._id === id ? data : f)));
      toast.success('Marked as delivered!');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = filter === 'all' ? foods : foods.filter((f) => f.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-800">My Listings</h2>
          <p className="text-stone-500 text-sm mt-1">{foods.length} total listings</p>
        </div>
        <Link to="/provider/add-food" className="btn-primary flex items-center gap-2">
          ➕ Add Food
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'available', 'completed', 'delivered', 'expired', 'requested', 'accepted'].map((s) => (
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
          <div className="text-4xl mb-3">🥘</div>
          <p className="text-stone-400">No listings in this category</p>
          <Link to="/provider/add-food" className="text-forest-600 text-sm font-medium hover:underline mt-2 block">
            Add a listing →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((food) => (
            <div key={food._id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-stone-800 truncate">{food.foodName}</h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {food.remainingQuantity} {food.unit} left · {food.totalQuantity} {food.unit} total
                  </p>
                </div>
                <StatusBadge status={food.status} />
              </div>

              <div className="space-y-1.5 text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <span>📍</span> {food.location}
                </div>
                <div className="flex items-center gap-1.5">
                  <span>⏰</span> Expires: {new Date(food.expiryTime).toLocaleString()}
                </div>
                {food.description && (
                  <div className="flex items-start gap-1.5">
                    <span>📝</span>
                    <span className="line-clamp-2">{food.description}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-stone-50">
                {food.status === 'accepted' && (
                  <button
                    onClick={() => handleMarkDelivered(food._id)}
                    className="btn-primary text-xs py-1.5 flex-1"
                  >
                    ✅ Mark Delivered
                  </button>
                )}
                <button
                  onClick={() => handleDelete(food._id, food.foodName)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
