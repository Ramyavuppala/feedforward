import React from 'react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 border-4 border-forest-200 border-t-forest-600 rounded-full animate-spin" />
      <p className="text-sm text-stone-500 font-medium">{text}</p>
    </div>
  );
}
