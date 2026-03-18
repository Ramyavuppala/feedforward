import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      toast.success(`Welcome back, ${data.name}!`);
      navigate(`/${data.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-50 via-stone-50 to-earth-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-forest-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
            🌿
          </div>
          <h1 className="font-display text-3xl font-bold text-stone-800">FeedForward</h1>
          <p className="text-stone-500 mt-1 text-sm">Share Food, Share Hope</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 animate-slide-up">
          <h2 className="font-display text-2xl font-semibold text-stone-800 mb-1">Sign in</h2>
          <p className="text-stone-400 text-sm mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-5">
            No account?{' '}
            <Link to="/register" className="text-forest-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Demo hints */}
        <div className="mt-4 p-4 bg-white/80 rounded-xl border border-stone-100">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Demo Roles</p>
          <div className="flex flex-wrap gap-2">
            {['admin', 'provider', 'seeker'].map(r => (
              <span key={r} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-lg capitalize">{r}</span>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-2">Register with any role to explore.</p>
        </div>
      </div>
    </div>
  );
}
