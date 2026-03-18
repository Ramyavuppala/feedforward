import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';

// Layouts
import DashboardLayout from './components/DashboardLayout';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import ProvidersAnalytics from './pages/admin/ProvidersAnalytics';
import SeekersAnalytics from './pages/admin/SeekersAnalytics';
import FoodAnalytics from './pages/admin/FoodAnalytics';

// Provider pages
import ProviderDashboard from './pages/provider/ProviderDashboard';
import AddFood from './pages/provider/AddFood';
import ManageFoods from './pages/provider/ManageFoods';
import ProviderRequests from './pages/provider/ProviderRequests';

// Seeker pages
import SeekerDashboard from './pages/seeker/SeekerDashboard';
import AvailableFood from './pages/seeker/AvailableFood';
import MyRequests from './pages/seeker/MyRequests';
import FoodMap from './pages/seeker/FoodMap';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} />;
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={`/${user.role}`} />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px' },
              success: { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' } },
              error: { style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="providers-analytics" element={<ProvidersAnalytics />} />
              <Route path="seekers-analytics" element={<SeekersAnalytics />} />
              <Route path="food-analytics" element={<FoodAnalytics />} />
            </Route>

            {/* Provider */}
            <Route path="/provider" element={<ProtectedRoute roles={['provider']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<ProviderDashboard />} />
              <Route path="add-food" element={<AddFood />} />
              <Route path="manage-foods" element={<ManageFoods />} />
              <Route path="requests" element={<ProviderRequests />} />
            </Route>

            {/* Seeker */}
            <Route path="/seeker" element={<ProtectedRoute roles={['seeker']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<SeekerDashboard />} />
              <Route path="available" element={<AvailableFood />} />
              <Route path="my-requests" element={<MyRequests />} />
              <Route path="map" element={<FoodMap />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
