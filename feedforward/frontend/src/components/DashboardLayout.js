import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import api from '../services/api';

const navItems = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/users', label: 'Users', icon: '👥' },
    { to: '/admin/providers-analytics', label: 'Providers', icon: '🏪' },
    { to: '/admin/seekers-analytics', label: 'Seekers', icon: '🙋' },
    { to: '/admin/food-analytics', label: 'Food Analytics', icon: '🍱' },
  ],
  provider: [
    { to: '/provider', label: 'Dashboard', icon: '🏠', end: true },
    { to: '/provider/add-food', label: 'Add Food', icon: '➕' },
    { to: '/provider/manage-foods', label: 'My Listings', icon: '🥘' },
    { to: '/provider/requests', label: 'Requests', icon: '📬' },
  ],
  seeker: [
    { to: '/seeker', label: 'Dashboard', icon: '🏠', end: true },
    { to: '/seeker/available', label: 'Available Food', icon: '🍱' },
    { to: '/seeker/my-requests', label: 'My Requests', icon: '📋' },
    { to: '/seeker/map', label: 'Food Map', icon: '🗺️' },
  ],
  volunteer: [
    { to: '/volunteer', label: 'Volunteer Tasks', icon: '🚚', end: true },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const items = navItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    admin: 'bg-purple-600',
    provider: 'bg-forest-700',
    seeker: 'bg-earth-600',
    volunteer: 'bg-blue-700',
  };

  const roleBadgeColors = {
    admin: 'bg-purple-100 text-purple-700',
    provider: 'bg-forest-100 text-forest-700',
    seeker: 'bg-earth-100 text-earth-700',
    volunteer: 'bg-blue-100 text-blue-700',
  };

  const [trustScore, setTrustScore] = useState(0);
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustBump, setTrustBump] = useState(false);
  const prevTrustRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    prevTrustRef.current = prevTrustRef.current ?? 0;
    setTrustLoading(true);
    api
      .get('/user/trust-score')
      .then(({ data }) => {
        const next = Number.isFinite(data?.trustScore) ? data.trustScore : 0;
        setTrustScore(next);
      })
      .catch(() => {
        setTrustScore(0);
      })
      .finally(() => setTrustLoading(false));
  }, [user?._id]);

  useEffect(() => {
    if (!trustLoading && prevTrustRef.current == null) prevTrustRef.current = trustScore;
    if (!trustLoading && prevTrustRef.current != null && trustScore > prevTrustRef.current) {
      setTrustBump(true);
      const t = setTimeout(() => setTrustBump(false), 650);
      prevTrustRef.current = trustScore;
      return () => clearTimeout(t);
    }
    prevTrustRef.current = trustScore;
  }, [trustScore, trustLoading]);

  const trustTier = useMemo(() => {
    const ts = Number.isFinite(trustScore) ? trustScore : 0;
    if (ts >= 100) return { label: 'Top Contributor', color: 'bg-purple-100 text-purple-700', icon: '🏆' };
    if (ts >= 50) return { label: 'Trusted', color: 'bg-blue-100 text-blue-700', icon: '⭐' };
    return { label: 'New User', color: 'bg-forest-100 text-forest-700', icon: '🐣' };
  }, [trustScore]);

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
        ${roleColors[user?.role] || 'bg-forest-700'}
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg">🌿</div>
            <div>
              <h1 className="font-display font-bold text-white text-lg leading-none">FeedForward</h1>
              <p className="text-white/60 text-xs mt-0.5">Share Food, Share Hope</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${roleBadgeColors[user?.role]} font-medium`}>
                {user?.role}
              </span>
              <div className="mt-2">
                <p
                  className={`text-xs text-white/80 flex items-center gap-2 ${
                    trustBump ? 'transform scale-[1.06] transition-transform' : ''
                  }`}
                >
                  {trustLoading ? 'Calculating trust...' : `Trust Score: ${trustScore} ⭐`}
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${trustTier.color} ${
                    trustLoading ? 'opacity-70' : ''
                  }`}
                >
                  <span>{trustTier.icon}</span>
                  <span>{trustTier.label}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-stone-100 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-stone-100 text-stone-600"
          >
            ☰
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl hover:bg-stone-100 transition-colors text-stone-600"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
