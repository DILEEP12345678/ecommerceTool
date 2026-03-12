'use client';

import { Loader2, ArrowDown } from 'lucide-react';

interface Props {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export default function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold = 65 }: Props) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const triggered = progress >= 1;

  return (
    <div
      className="fixed top-14 left-0 right-0 flex justify-center z-30 pointer-events-none"
      style={{ transform: `translateY(${isRefreshing ? 12 : pullDistance * 0.5}px)`, transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none' }}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
          triggered || isRefreshing
            ? 'bg-primary-500 text-white scale-100'
            : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300'
        }`}
        style={{ opacity: Math.max(progress, isRefreshing ? 1 : 0) }}
      >
        {isRefreshing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowDown
            className="w-4 h-4 transition-transform duration-200"
            style={{ transform: `rotate(${triggered ? 180 : progress * 180}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
