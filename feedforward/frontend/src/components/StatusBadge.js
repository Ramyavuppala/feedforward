import React from 'react';

const styles = {
  available:  'bg-green-100 text-green-700',
  requested:  'bg-blue-100 text-blue-700',
  accepted:   'bg-teal-100 text-teal-700',
  delivered:  'bg-forest-100 text-forest-700',
  expired:    'bg-stone-100 text-stone-500',
  pending:    'bg-amber-100 text-amber-700',
  rejected:   'bg-red-100 text-red-600',
  completed:  'bg-forest-100 text-forest-700',
};

const icons = {
  available: '✅',
  requested: '📬',
  accepted:  '🤝',
  delivered: '🎉',
  expired:   '⏰',
  pending:   '⏳',
  rejected:  '❌',
  completed: '✔️',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${styles[status] || 'bg-stone-100 text-stone-500'}`}>
      <span className="mr-1">{icons[status] || '•'}</span>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}
