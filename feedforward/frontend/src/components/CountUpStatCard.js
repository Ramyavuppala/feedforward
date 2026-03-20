import React, { useEffect, useMemo, useState } from 'react';

export default function CountUpStatCard({ label, value, icon, color = 'forest', durationMs = 900, suffix = '' }) {
  const [display, setDisplay] = useState(0);

  const colors = useMemo(
    () => ({
      forest: 'from-forest-500 to-forest-600',
      earth: 'from-earth-500 to-earth-600',
      blue: 'from-blue-500 to-blue-600',
      purple: 'from-purple-500 to-purple-600',
      red: 'from-red-500 to-red-600',
      amber: 'from-amber-500 to-amber-600',
    }),
    []
  );

  useEffect(() => {
    const target = Number(value) || 0;
    const start = 0;
    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      // Ease-out curve for a smoother beginner-friendly animation.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round((start + (target - start) * eased) * 100) / 100);
      if (t < 1) requestAnimationFrame(tick);
    };

    setDisplay(0);
    requestAnimationFrame(tick);
  }, [value, durationMs]);

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500 font-medium">{label}</p>
          <p className="text-3xl font-display font-bold text-stone-800 mt-1">
            {display.toLocaleString()}
            {suffix}
          </p>
        </div>
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
            colors[color] || colors.forest
          } flex items-center justify-center text-xl shadow-sm`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

