import { useEffect, useRef, useState } from 'react';

/**
 * Returns a human-readable "last updated" string that refreshes every 10s.
 * Watches `data` for changes — updates the timestamp whenever data changes.
 */
export function useLastUpdated(data: unknown): string {
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [display, setDisplay] = useState('');
  const prevRef = useRef<string>('');

  useEffect(() => {
    if (data === undefined) return;
    const serialized = JSON.stringify(data);
    if (serialized !== prevRef.current) {
      prevRef.current = serialized;
      setLastUpdated(Date.now());
    }
  }, [data]);

  useEffect(() => {
    if (!lastUpdated) return;
    const format = () => {
      const diff = Math.floor((Date.now() - lastUpdated) / 1000);
      if (diff < 10)  return 'just now';
      if (diff < 60)  return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return `${Math.floor(diff / 3600)}h ago`;
    };
    setDisplay(format());
    const id = setInterval(() => setDisplay(format()), 10_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  return display;
}
