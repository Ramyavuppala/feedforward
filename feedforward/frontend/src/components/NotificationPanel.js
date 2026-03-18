import React, { useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

const typeColors = {
  request: 'bg-blue-50 border-blue-100',
  accepted: 'bg-green-50 border-green-100',
  rejected: 'bg-red-50 border-red-100',
  completed: 'bg-forest-50 border-forest-100',
  expired: 'bg-amber-50 border-amber-100',
  info: 'bg-stone-50 border-stone-100',
};

const typeIcons = {
  request: '📬',
  accepted: '✅',
  rejected: '❌',
  completed: '🎉',
  expired: '⏰',
  info: 'ℹ️',
};

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const ref = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 animate-slide-up overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-800 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-stone-500">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-forest-600 hover:text-forest-800 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-stone-50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-3xl mb-2">🔔</div>
            <p className="text-stone-400 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.read && markRead(n._id)}
              className={`px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors ${!n.read ? 'bg-forest-50/50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-base mt-0.5">{typeIcons[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-stone-800' : 'text-stone-600'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-forest-500 rounded-full mt-1.5 flex-shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
