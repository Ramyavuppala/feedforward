import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seeker' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data);
      toast.success('Account created! Welcome to FeedForward 🌿');
      navigate(`/${data.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roleDescriptions = {
    seeker: 'Find and request available food donations',
    provider: 'Share surplus food with those in need',
    admin: 'Manage the platform and users',
    volunteer: 'Transport food from providers to seekers',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-50 via-stone-50 to-earth-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-forest-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
            🌿
          </div>
          <h1 className="font-display text-3xl font-bold text-stone-800">Join FeedForward</h1>
          <p className="text-stone-500 mt-1 text-sm">Make a difference today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Your name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="input" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} className="input" placeholder="Min. 6 characters" minLength={6} required />
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">I want to join as...</label>
              <div className="grid grid-cols-3 gap-2">
                {['seeker', 'provider', 'volunteer', 'admin'].map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setForm({ ...form, role: r })}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      form.role === r
                        ? 'border-forest-500 bg-forest-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="text-xl mb-1">
                      {r === 'seeker' ? '🙏' : r === 'provider' ? '🍱' : '🛡️'}
                    </div>
                    <div className="text-xs font-semibold capitalize text-stone-700">{r}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">{roleDescriptions[form.role]}</p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-forest-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
