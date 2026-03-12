import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 65;  // px of pull needed to trigger
const MAX_PULL  = 90;  // max visual travel distance

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef    = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshingRef.current) {
      startYRef.current  = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0 && window.scrollY === 0) {
      // Dampen pull with rubber-band feel
      setPullDistance(Math.min(delta * 0.45, MAX_PULL));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    setPullDistance(prev => {
      if (prev >= THRESHOLD) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        Promise.resolve(onRefresh()).finally(() => {
          setTimeout(() => {
            setIsRefreshing(false);
            isRefreshingRef.current = false;
          }, 900);
        });
        return 0;
      }
      return 0;
    });
  }, [onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove',  handleTouchMove,  { passive: true });
    document.addEventListener('touchend',   handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove',  handleTouchMove);
      document.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
