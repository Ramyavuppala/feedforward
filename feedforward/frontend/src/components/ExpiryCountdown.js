import React, { useEffect, useMemo, useState } from 'react';

function formatHMS(totalSeconds) {
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Live expiry countdown for a single food item.
 *
 * Notes:
 * - Uses setInterval to update once per second.
 * - Stops the interval after the timer reaches zero for this item.
 * - Color rules:
 *   - < 2 hours: orange
 *   - < 1 hour: red + "Expiring Soon"
 */
export default function ExpiryCountdown({ expiryTime, className = '' }) {
  const expiryMs = useMemo(() => {
    const ms = new Date(expiryTime).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [expiryTime]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiryMs) return;

    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (expiryMs - n <= 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [expiryMs]);

  if (!expiryMs) {
    return <span className={`text-[11px] text-stone-400 ${className}`}>Expires in: —</span>;
  }

  const remainingMs = expiryMs - now;
  if (remainingMs <= 0) {
    return <span className={`text-[11px] text-stone-500 ${className}`}>Expired</span>;
  }

  const remainingSeconds = Math.floor(remainingMs / 1000);
  const hms = formatHMS(remainingSeconds);

  const under1Hour = remainingMs <= 60 * 60 * 1000;
  const under2Hours = remainingMs <= 2 * 60 * 60 * 1000;

  const colorClass = under1Hour
    ? 'text-red-600 font-semibold'
    : under2Hours
      ? 'text-orange-600 font-semibold'
      : 'text-stone-600';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`text-[11px] ${colorClass}`}>
        Expires in: {hms}
      </span>
      {under1Hour && (
        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
          Expiring Soon
        </span>
      )}
    </span>
  );
}

