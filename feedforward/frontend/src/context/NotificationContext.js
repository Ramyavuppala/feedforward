import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notification');
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {}
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const socket = getSocket();
    socket.emit('join', user._id);

    const handleNotif = ({ notification }) => {
      if (notification) {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((c) => c + 1);
        toast(notification.message, { icon: '🔔' });
      }
    };

    socket.on('foodRequested', handleNotif);
    socket.on('requestUpdated', handleNotif);
    socket.on('foodAdded', () => {});
    socket.on('foodExpired', ({ foodId }) => {
      toast('A food item has expired', { icon: '⏰' });
    });

    return () => {
      socket.off('foodRequested', handleNotif);
      socket.off('requestUpdated', handleNotif);
      socket.off('foodExpired');
    };
  }, [user]);

  const markRead = async (id) => {
    await api.put(`/notification/read/${id}`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.put('/notification/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
