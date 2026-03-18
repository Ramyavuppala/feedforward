import React from 'react';

export default function StatCard({ label, value, icon, color = 'forest', trend }) {
  const colors = {
    forest: 'from-forest-500 to-forest-600',
    earth:  'from-earth-500 to-earth-600',
    blue:   'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    red:    'from-red-500 to-red-600',
    amber:  'from-amber-500 to-amber-600',
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500 font-medium">{label}</p>
          <p className="text-3xl font-display font-bold text-stone-800 mt-1">{value ?? '—'}</p>
          {trend !== undefined && (
            <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-forest-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% this month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-xl shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
