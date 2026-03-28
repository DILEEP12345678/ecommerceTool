'use client';

import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, CheckCircle2, Package, ShoppingBag, X } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useHasRole, useUserLoaded } from '../../../../components/UserContext';
import { useTheme } from '../../../../components/ThemeProvider';
import { useSetPageTitle } from '../../../../components/PageTitleContext';
import { api } from '../../../../convex/_generated/api';
import { buildBagPlan, type BagEntry, type ProductMeta } from '../../../../lib/bagPlan';


export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isManager = useHasRole('collection_point_manager');
  const isAdmin = useHasRole('admin');
  const loaded = useUserLoaded();
  const orderId = params.orderId as string;
  const cpParam = searchParams.get('cp');
  const cpSuffix = cpParam ? `?cp=${encodeURIComponent(cpParam)}` : '';
  const { theme } = useTheme();
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const [showBagPlan, setShowBagPlan] = useState(false);
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevAllCompleteRef = useRef(false);
  const [flashContent, setFlashContent] = useState<{
    message: string;
    speedLabel?: string;
    speedEmoji?: string;
    packTime?: string;
    isPersonalBest?: boolean;
  } | null>(null);
  const [milestoneContent, setMilestoneContent] = useState<{ message: string; emoji: string } | null>(null);

  // ── Confetti ─────────────────────────────────────────────
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; color: string; size: number; duration: number; delay: number }>>([]);
  const prevAllCompleteForConfetti = useRef(false);

  // ── Credits ─────────────────────────────────────────────
  const [creditPops, setCreditPops] = useState<Array<{ id: number; amount: number; label?: string }>>([]);
  const creditPopId = useRef(0);
  const awardCreditsMutation = useMutation(api.users.awardCredits);

  const awardCredits = (amount: number, label?: string) => {
    const id = ++creditPopId.current;
    setCreditPops(prev => [...prev, { id, amount, label }]);
    setTimeout(() => setCreditPops(prev => prev.filter(p => p.id !== id)), 1200);
    awardCreditsMutation({ orderId, amount, label: label ?? '' }).catch(() => {});
  };

  // ── Pack timer ──────────────────────────────────────────
  const packStartRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [packedQty, setPackedQty] = useState<Map<number, number>>(() => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`packed-items-${params.orderId}`);
      if (!saved) return new Map();
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !Array.isArray(parsed[0])) {
        localStorage.removeItem(`packed-items-${params.orderId}`);
        return new Map();
      }
      return new Map<number, number>(parsed);
    } catch {
      return new Map();
    }
  });

  useEffect(() => {
    if (!orderId) return;
    localStorage.setItem(`packed-items-${orderId}`, JSON.stringify(Array.from(packedQty.entries())));
  }, [packedQty, orderId]);

  // Per-bag-slot packed state (for items split across multiple bags)
  const [bagSlotPacked, setBagSlotPacked] = useState<Map<string, boolean>>(() => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`bag-slots-${params.orderId}`);
      if (!saved) return new Map();
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return new Map();
      return new Map<string, boolean>(parsed);
    } catch { return new Map(); }
  });

  useEffect(() => {
    if (!orderId) return;
    localStorage.setItem(`bag-slots-${orderId}`, JSON.stringify(Array.from(bagSlotPacked.entries())));
  }, [bagSlotPacked, orderId]);

  const order = useQuery(
    api.orders.getByOrderId,
    orderId ? { orderId } : 'skip'
  );
  const updateStatus = useMutation(api.orders.updateStatus);
  const productRows = useQuery(api.products.list);
  const confirmedOrders = useQuery(
    api.orders.getByCollectionPointAndStatus,
    order?.collectionPoint ? { collectionPoint: order.collectionPoint, status: 'confirmed', limit: 20 } : 'skip'
  );
  const nextConfirmedOrderId = confirmedOrders?.find((o: any) => o.orderId !== orderId)?.orderId ?? null;

  // Build image lookup: by productId and by name (for legacy orders that stored Convex _id as itemId)
  const productImageByName = new Map<string, string>();
  const productImageById = new Map<string, string>();
  for (const p of (productRows ?? []) as any[]) {
    productImageById.set(p.productId, p.image);
    productImageByName.set(p.name.toLowerCase(), p.image);
  }
  const getItemImage = (itemId: string, itemName: string): string | undefined => {
    const baseId = itemId.split(':')[0];
    return productImageById.get(baseId)
      ?? productImageByName.get(itemName.toLowerCase())
      ?? productImageByName.get(itemName.split('(')[0].trim().toLowerCase());
  };

  // Build productId → { weightG, sensitivity } map for bagPlan
  // Also add variant-keyed entries so PROD-005:12 Pack uses the variant's weightG
  const productMap = new Map<string, ProductMeta>();
  for (const p of (productRows ?? []) as any[]) {
    for (const v of (p.variants ?? [])) {
      productMap.set(`${p.productId}:${v.label}`, { weightG: v.weightG, sensitivity: p.sensitivity });
    }
    // Also register base productId using first variant weight as fallback
    if (p.variants?.length) {
      productMap.set(p.productId, { weightG: p.variants[0].weightG, sensitivity: p.sensitivity });
    }
  }

  useEffect(() => {
    if (!loaded) return;
    if (!isManager && !isAdmin) router.push('/login');
  }, [isManager, isAdmin, router, loaded]);

  const setPageTitle = useSetPageTitle();
  useEffect(() => {
    if (order?.username) setPageTitle(order.username);
    return () => setPageTitle(null);
  }, [order?.username, setPageTitle]);

  // Start timer once order loads as confirmed — persisted in localStorage so
  // navigating away and back does not reset the clock
  useEffect(() => {
    if (order?.status !== 'confirmed') return;
    const storageKey = `pack-timer-start-${orderId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      packStartRef.current = parseInt(saved, 10);
    } else if (packStartRef.current === null) {
      packStartRef.current = Date.now();
      localStorage.setItem(storageKey, String(packStartRef.current));
    }
  }, [order?.status, orderId]);

  // Tick every second while packing
  useEffect(() => {
    if (order?.status !== 'confirmed') return;
    const interval = setInterval(() => {
      if (packStartRef.current !== null) {
        setElapsedSeconds(Math.floor((Date.now() - packStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.status]);

  // ── Combo counter ────────────────────────────────────────
  const lastPackTimeRef = useRef<number>(0);
  const comboCountRef = useRef(0);
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [comboDisplay, setComboDisplay] = useState<{ count: number; id: number } | null>(null);
  const comboDisplayId = useRef(0);

  const triggerCombo = () => {
    const now = Date.now();
    if (now - lastPackTimeRef.current < 2000) {
      comboCountRef.current += 1;
    } else {
      comboCountRef.current = 1;
    }
    lastPackTimeRef.current = now;
    if (comboCountRef.current >= 2) {
      const id = ++comboDisplayId.current;
      setComboDisplay({ count: comboCountRef.current, id });
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = setTimeout(() => {
        setComboDisplay(null);
        comboCountRef.current = 0;
      }, 1800);
    }
  };

  // ── Sound on single item packed ─────────────────────────
  const soundEnabledRef = useRef(true);
  useEffect(() => {
    soundEnabledRef.current = localStorage.getItem('pack-sound-enabled') !== 'false';
    const onChanged = () => { soundEnabledRef.current = localStorage.getItem('pack-sound-enabled') !== 'false'; };
    window.addEventListener('pack-sound-changed', onChanged);
    return () => window.removeEventListener('pack-sound-changed', onChanged);
  }, []);

  const playPackSound = (isPacking = true) => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const isRare = isPacking && Math.random() < 0.1;
      if (isRare) {
        // 🌟 Rare: sparkle arpeggio
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.2);
          osc.start(ctx.currentTime + i * 0.07);
          osc.stop(ctx.currentTime + i * 0.07 + 0.22);
        });
      } else {
        // Normal rising boing
        const times = [0, 0.07];
        const freqs = [520, 780];
        times.forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.5, ctx.currentTime + t + 0.08);
          gain.gain.setValueAtTime(0.18, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.2);
        });
      }
    } catch {}
  };

  // ── Sound on all-packed ──────────────────────────────────
  const allPackedForSound = !!(order && order.status === 'confirmed' &&
    order.items?.length > 0 &&
    order.items?.every((_: any, i: number) => (packedQty.get(i) ?? 0) >= order.items[i].quantity));

  useEffect(() => {
    if (!allPackedForSound) { prevAllCompleteRef.current = false; return; }
    if (prevAllCompleteRef.current) return;
    prevAllCompleteRef.current = true;
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      [880, 1100, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.35);
      });
    } catch {}
  }, [allPackedForSound]);

  // ── Confetti burst on all-packed ────────────────────────
  useEffect(() => {
    if (!allPackedForSound) { prevAllCompleteForConfetti.current = false; return; }
    if (prevAllCompleteForConfetti.current) return;
    prevAllCompleteForConfetti.current = true;
    const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF8C94', '#A8E6CF', '#DDA0DD', '#F7DC6F'];
    const particles = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: 6 + Math.random() * 8,
      duration: 1.8 + Math.random() * 1.4,
      delay: Math.random() * 0.6,
    }));
    setConfetti(particles);
    setTimeout(() => setConfetti([]), 3500);
  }, [allPackedForSound]);

  if (order === undefined) {
    const bone = (w: string, h: string, delay: string, radius = 'rounded-lg', extra = '') =>
      <div className={`${radius} ${extra}`} style={{ width: w, height: h, background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite ${delay}` }} />;
    return (
      <div className="flex flex-col bg-gray-50 h-[calc(100vh-3.5rem)]">
        {/* Top bar skeleton */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm px-4 py-2.5 flex items-center gap-3">
          {bone('80px', '28px', '0s', 'rounded-xl')}
          <div className="flex-1" />
          {bone('64px', '32px', '0.05s', 'rounded-full')}
        </div>

        {/* Instruction banner skeleton */}
        <div className="flex-shrink-0 flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-4 py-2.5">
          {bone('24px', '24px', '0s', 'rounded-md')}
          {bone('200px', '14px', '0.05s')}
        </div>

        {/* Progress bar skeleton */}
        <div className="flex-shrink-0 h-2 bg-gray-100" />

        {/* Items grid skeleton */}
        <div className="flex-1 overflow-hidden px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white animate-card-enter" style={{ animationDelay: `${i * 70}ms` }}>
                {/* Mobile layout */}
                <div className="flex sm:hidden">
                  <div className="w-36 h-36 flex-shrink-0" style={{ background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite ${i * 0.1}s` }} />
                  <div className="flex-1 px-3 pt-3 pb-3 flex flex-col gap-2.5 border-l border-gray-200">
                    <div className="h-3.5 rounded-md" style={{ width: '70%', background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite ${i * 0.1 + 0.05}s` }} />
                    {[0, 1].map(j => (
                      <div key={j} className="flex items-center justify-between gap-2">
                        <div className="h-8 rounded-xl flex-1" style={{ background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite ${i * 0.1 + j * 0.06}s` }} />
                        <div className="h-8 w-10 rounded-xl flex-shrink-0" style={{ background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite ${i * 0.1 + j * 0.06 + 0.03}s` }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Desktop layout */}
                <div className="hidden sm:block">
                  <div className="w-full aspect-square" style={{ background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite ${i * 0.1}s` }} />
                  <div className="p-3 space-y-2 border-t border-gray-100">
                    <div className="h-3 rounded-md" style={{ width: '80%', background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite ${i * 0.1 + 0.05}s` }} />
                    <div className="h-8 rounded-xl" style={{ background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite ${i * 0.1 + 0.1}s` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 text-lg">Order not found</p>
      </div>
    );
  }

  // ── Helpers ─────────────────────────────────────────────
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getSpeedRating = (s: number) => {
    if (s < 120) return { label: 'Lightning fast!', emoji: '⚡' };
    if (s < 300) return { label: 'Nice work!',      emoji: '🎯' };
    return               { label: 'All packed!',     emoji: '✓'  };
  };

  const getAndSavePersonalBest = (s: number): boolean => {
    try {
      const prev = parseInt(localStorage.getItem('pack-personal-best') ?? '0', 10);
      if (!prev || s < prev) {
        localStorage.setItem('pack-personal-best', String(s));
        return !!prev; // only "new PB" if there was a previous one
      }
    } catch {}
    return false;
  };

  const incrementDailyCount = (): number => {
    try {
      const today = new Date().toDateString();
      const saved = JSON.parse(localStorage.getItem('daily-pack-count') ?? '{}');
      const next = (saved[today] ?? 0) + 1;
      localStorage.setItem('daily-pack-count', JSON.stringify({ [today]: next }));
      return next;
    } catch { return 1; }
  };

  const getMilestone = (count: number): { message: string; emoji: string } | null => {
    if (count === 1)          return { message: "First one done! Let's go!",  emoji: '🚀' };
    if (count === 5)          return { message: "5 down! You're on a roll!",  emoji: '🔥' };
    if (count === 10)         return { message: '10 packed! Absolute legend', emoji: '🏆' };
    if (count === 20)         return { message: '20 packed! Unstoppable!',    emoji: '💪' };
    if (count % 10 === 0)    return { message: `${count} packed! Keep it up!`, emoji: '⭐' };
    return null;
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({
        orderId: order.orderId,
        status: newStatus as any,
      });

      if (newStatus === 'packed' && packStartRef.current !== null) {
        const elapsed = Math.floor((Date.now() - packStartRef.current) / 1000);
        const rating = getSpeedRating(elapsed);
        const isNewPB = getAndSavePersonalBest(elapsed);
        const dailyCount = incrementDailyCount();
        const milestone = getMilestone(dailyCount);

        // Speed bonus credits: faster = more bonus
        const speedBonus = elapsed < 300 ? 10 : elapsed < 600 ? 7 : elapsed < 1200 ? 5 : 3;
        awardCredits(speedBonus, elapsed < 300 ? '⚡ Speed Bonus!' : '🎉 Order Done!');

        setFlashContent({
          message: 'Packed!',
          speedLabel: rating.label,
          speedEmoji: rating.emoji,
          packTime: formatTime(elapsed),
          isPersonalBest: isNewPB,
        });

        const FLASH_MS = 1400;
        const MILESTONE_MS = 5000;

        setTimeout(() => {
          setFlashContent(null);
          localStorage.removeItem(`packed-items-${order.orderId}`);
          localStorage.removeItem(`pack-timer-start-${order.orderId}`);
          localStorage.removeItem(`bag-slots-${order.orderId}`);
          setPackedQty(new Map());
          setBagSlotPacked(new Map());

          const dest = `/collection-point${cpSuffix}`;
          if (milestone) {
            setMilestoneContent(milestone);
            setTimeout(() => {
              setMilestoneContent(null);
              router.push(dest);
            }, MILESTONE_MS);
          } else {
            router.push(dest);
          }
        }, FLASH_MS);
      } else {
        setFlashContent({ message: newStatus === 'collected' ? 'Marked as Collected!' : 'Done!' });
        setTimeout(() => {
          setFlashContent(null);
          if (newStatus === 'collected') {
            const sep = cpSuffix ? '&' : '?';
            router.push(`/collection-point${cpSuffix}${sep}tab=packed`);
          }
        }, 700);
      }
    } catch {
      toast.error('Failed to update order status. Please try again.');
    }
  };

  const allComplete =
    order.status === 'confirmed' &&
    order.items.length > 0 &&
    order.items.every((_: any, i: number) => (packedQty.get(i) ?? 0) >= order.items[i].quantity);

  const totalQty = order.items.reduce((s: number, item: any) => s + item.quantity, 0);
  const totalPacked = order.items.reduce((s: number, item: any, i: number) => s + Math.min(packedQty.get(i) ?? 0, item.quantity), 0);
  const bagPlan = order.status === 'confirmed' ? buildBagPlan(order.items, productMap) : [];

  const backPath = (() => {
    const params = new URLSearchParams();
    if (cpParam) params.set('cp', cpParam);
    if (order.status === 'packed') params.set('tab', 'packed');
    else if (order.status === 'collected') params.set('tab', 'collected');
    const qs = params.toString();
    return `/collection-point${qs ? `?${qs}` : ''}`;
  })();

  return (
    <div className="flex flex-col bg-gray-50 h-[calc(100vh-3.5rem)]">
      {/* Fixed top bar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => router.push(backPath)}
          className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-xl px-2 py-1.5 -ml-1 flex-shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Order #{orderId.split('-')[1]}</span>
        </button>
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {order.status === 'confirmed' ? (
            <>
              {/* Timer */}
              <div className={`flex flex-col items-center px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                elapsedSeconds < 120 ? 'bg-yellow-50 text-yellow-600' :
                elapsedSeconds < 300 ? 'bg-blue-50 text-blue-600' :
                                      'bg-gray-100 text-gray-500'
              }`}>
                <span className="text-[9px] font-semibold opacity-60 leading-none">packing</span>
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
              {/* Bags button — mobile only */}
              {bagPlan.length > 0 && (
                <button
                  onClick={() => setShowBagPlan(true)}
                  className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold bg-primary-500 text-white shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Fill bags
                </button>
              )}
            </>
          ) : (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              order.status === 'packed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              {order.status === 'packed' ? 'Packed' : 'Collected'}
            </span>
          )}
        </div>
      </div>

      {/* Confetti burst */}
      {confetti.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[210] overflow-hidden">
          {confetti.map(p => (
            <div
              key={p.id}
              className="absolute top-0 rounded-sm animate-confetti-fall"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size * (0.5 + Math.random() * 0.8),
                backgroundColor: p.color,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Combo display */}
      {comboDisplay && (
        <div key={comboDisplay.id} className="pointer-events-none fixed bottom-36 left-1/2 z-[210] animate-combo-in">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black drop-shadow-lg" style={{ color: comboDisplay.count >= 5 ? '#FF6B6B' : comboDisplay.count >= 3 ? '#FF8C00' : '#FFD700', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {comboDisplay.count >= 5 ? '🔥' : comboDisplay.count >= 3 ? '⚡' : '✨'} COMBO ×{comboDisplay.count}
            </span>
            <span className="text-sm font-bold text-white bg-black/40 px-3 py-0.5 rounded-full mt-1">
              {comboDisplay.count >= 5 ? "YOU'RE ON FIRE!" : comboDisplay.count >= 3 ? "Speed streak!" : "Nice!"}
            </span>
          </div>
        </div>
      )}

      {/* Floating credit pops */}
      <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
        {creditPops.map(pop => (
          <div
            key={pop.id}
            className="absolute left-1/2 top-20 -translate-x-1/2 flex flex-col items-center animate-credit-pop"
          >
            <span className="text-2xl font-black text-yellow-500 drop-shadow-lg">+{pop.amount} ⭐</span>
            {pop.label && <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full mt-0.5">{pop.label}</span>}
          </div>
        ))}
      </div>

      {/* Sticky instruction / success banner */}
      {order.status === 'confirmed' && (() => {
        if (allComplete) return (
          <div className="flex-shrink-0 flex items-center gap-3 bg-green-50 border-b border-green-300 px-4 py-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-800">All items packed! 🎉</p>
              <p className="text-xs text-green-600">Tap the green button below to confirm ↓</p>
            </div>
          </div>
        );
        const remaining = totalQty - totalPacked;
        const emoji = totalPacked === 0 ? '👆' : remaining <= 2 ? '🎯' : '👆';
        const text = totalPacked === 0
          ? 'Tap each item as you put it in the bag'
          : remaining <= 2
          ? `Almost there — ${remaining} item${remaining !== 1 ? 's' : ''} left!`
          : `${remaining} items left to pack`;
        return (
          <div className="flex-shrink-0 flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
            <span className="text-lg">{emoji}</span>
            <p className="text-sm font-semibold text-amber-700">{text}</p>
          </div>
        );
      })()}

      {/* Progress bar */}
      {order.status === 'confirmed' && totalQty > 0 && (
        <div className="flex-shrink-0 h-2 bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full transition-all duration-500 ease-out rounded-r-full"
            style={{
              width: `${Math.min((totalPacked / totalQty) * 100, 100)}%`,
              backgroundColor: totalPacked === 0 ? '#FCD34D' : totalPacked >= totalQty ? '#10B981' : totalPacked / totalQty > 0.6 ? '#34D399' : '#60A5FA',
            }}
          />
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex gap-4 items-start">

        {/* ── LEFT: items section ─────────────────────────── */}
        <div className="flex-[5] min-w-0 flex flex-col gap-3">

        {/* Items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {(() => {
            // Build item → bag mapping
            const itemBagMap = new Map<string, Array<{ bagNo: number; qty: number; entry: BagEntry }>>();
            if (order.status === 'confirmed') {
              for (const bag of bagPlan) {
                for (const bagItem of bag.items) {
                  if (!itemBagMap.has(bagItem.itemId)) itemBagMap.set(bagItem.itemId, []);
                  itemBagMap.get(bagItem.itemId)!.push({ bagNo: bag.bagNo, qty: bagItem.quantity, entry: bag });
                }
              }
            }

            // Build a position index from the bag plan's exact item order
            const bagPlanPosition = new Map<string, number>();
            let pos = 0;
            for (const bag of bagPlan) {
              for (const bagItem of bag.items) {
                if (!bagPlanPosition.has(bagItem.itemId)) {
                  bagPlanPosition.set(bagItem.itemId, pos++);
                }
              }
            }

            // Sort by bag plan position; items not in plan go to the end
            const sortedItems = order.items
              .map((item: any, idx: number) => ({ item, originalIndex: idx }))
              .sort((a: any, b: any) => {
                const aPos = bagPlanPosition.get(a.item.itemId) ?? Infinity;
                const bPos = bagPlanPosition.get(b.item.itemId) ?? Infinity;
                return aPos - bPos;
              });

            // Group by base product ID
            type Group = { baseId: string; baseName: string; imgSrc: string | undefined; variants: Array<{ item: any; originalIndex: number }> };
            const groups: Group[] = [];
            const groupMap = new Map<string, Group>();
            for (const { item, originalIndex } of sortedItems) {
              const baseId = item.itemId.split(':')[0];
              const baseName = item.itemName.includes('(')
                ? item.itemName.slice(0, item.itemName.lastIndexOf('(')).trim()
                : item.itemName;
              if (!groupMap.has(baseId)) {
                const g: Group = { baseId, baseName, imgSrc: getItemImage(item.itemId, item.itemName), variants: [] };
                groupMap.set(baseId, g);
                groups.push(g);
              }
              groupMap.get(baseId)!.variants.push({ item, originalIndex });
            }

            return groups.map((group) => {
              const totalQty = group.variants.reduce((s, { item }) => s + item.quantity, 0);
              const totalPacked = group.variants.reduce((s, { item, originalIndex: idx }) => s + Math.min(packedQty.get(idx) ?? 0, item.quantity), 0);
              const anyPacked = totalPacked > 0;
              const allGroupComplete = totalPacked >= totalQty;

              const tileStyle = order.status !== 'confirmed' || !anyPacked
                ? 'bg-white border-gray-200'
                : allGroupComplete
                ? 'bg-green-50 border-green-400'
                : 'bg-blue-50 border-blue-200';

              const isConfirmed = order.status === 'confirmed';

              return (
                <div key={group.baseId} ref={(el: HTMLDivElement | null) => { if (el) groupRefs.current.set(group.baseId, el); else groupRefs.current.delete(group.baseId); }} className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${tileStyle}`}>

                  {/* ── MOBILE: horizontal row ── */}
                  <div className="flex sm:hidden">
                    {/* Image + name */}
                    <div className="w-36 flex-shrink-0 flex flex-col">
                      <div
                        className={`relative w-36 h-36 bg-gray-100 ${group.imgSrc ? 'cursor-zoom-in' : ''}`}
                        onClick={() => group.imgSrc && setZoomedImage({ src: group.imgSrc, alt: group.baseName })}
                      >
                        {group.imgSrc
                          ? <img src={group.imgSrc} alt={group.baseName} className="w-full h-full object-contain" />
                          : <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                              <Package className="w-8 h-8 text-gray-300" />
                              <span className="text-[10px] font-semibold text-gray-400 text-center leading-tight">{group.baseName}</span>
                            </div>
                        }
                        {allGroupComplete && isConfirmed && (
                          <div className="absolute inset-0 bg-green-500/75 flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-white drop-shadow-lg" />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5 border-t border-black/5 flex-1">
                        <p className="text-sm font-bold text-gray-700 leading-snug line-clamp-2">{group.baseName}</p>
                      </div>
                    </div>

                    {/* Variants */}
                    <div className={`flex-1 min-w-0 px-3 flex flex-col justify-start border-l border-gray-200 ${isConfirmed ? 'pt-2 pb-3 gap-2' : 'pt-2 pb-2 gap-1'}`}>
                      {group.variants.flatMap(({ item, originalIndex: index }) => {
                        const packed = packedQty.get(index) ?? 0;
                        const isItemComplete = packed >= item.quantity;
                        const variantLabel = item.itemId.includes(':') ? item.itemId.split(':').slice(1).join(':') : null;
                        const bagAssignments = itemBagMap.get(item.itemId) ?? [];
                        const isSplit = bagAssignments.length > 1;

                        const handleSlotClick = (bagSlot: typeof bagAssignments[0] | null) => {
                          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(30);

                          if (isSplit && bagSlot) {
                            const slotKey = `${index}-bag${bagSlot.bagNo}`;
                            const wasSlotDone = bagSlotPacked.get(slotKey) ?? false;
                            const newSlotDone = !wasSlotDone;
                            playPackSound(newSlotDone);
                            if (newSlotDone) triggerCombo();
                            setBagSlotPacked(prev => { const n = new Map(prev); n.set(slotKey, newSlotDone); return n; });
                            const newTotal = bagAssignments.reduce((sum, a) => {
                              const key = `${index}-bag${a.bagNo}`;
                              const done = key === slotKey ? newSlotDone : (bagSlotPacked.get(key) ?? false);
                              return sum + (done ? a.qty : 0);
                            }, 0);
                            setPackedQty(prev => { const n = new Map(prev); n.set(index, newTotal); return n; });
                            if (newSlotDone && newTotal >= item.quantity) {
                              const willGroupBeComplete = group.variants.every(({ item: vi, originalIndex: vi_idx }) =>
                                vi_idx === index ? true : (packedQty.get(vi_idx) ?? 0) >= vi.quantity
                              );
                              if (willGroupBeComplete) {
                                const currentIdx = groups.indexOf(group);
                                const nextIncomplete = groups.slice(currentIdx + 1).find(g =>
                                  g.variants.some(({ item: vi, originalIndex: vi_idx }) =>
                                    vi_idx !== index && (packedQty.get(vi_idx) ?? 0) < vi.quantity
                                  )
                                );
                                if (nextIncomplete) {
                                  setTimeout(() => {
                                    groupRefs.current.get(nextIncomplete.baseId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 150);
                                }
                              }
                            }
                          } else {
                            const isCompleting = !isItemComplete;
                            playPackSound(isCompleting);
                            if (isCompleting) triggerCombo();
                            setPackedQty(prev => { const n = new Map(prev); n.set(index, isItemComplete ? 0 : item.quantity); return n; });
                            if (isCompleting) {
                              const willGroupBeComplete = group.variants.every(({ item: vi, originalIndex: vi_idx }) =>
                                vi_idx === index ? true : (packedQty.get(vi_idx) ?? 0) >= vi.quantity
                              );
                              if (willGroupBeComplete) {
                                const currentIdx = groups.indexOf(group);
                                const nextIncomplete = groups.slice(currentIdx + 1).find(g =>
                                  g.variants.some(({ item: vi, originalIndex: vi_idx }) =>
                                    vi_idx !== index && (packedQty.get(vi_idx) ?? 0) < vi.quantity
                                  )
                                );
                                if (nextIncomplete) {
                                  setTimeout(() => {
                                    groupRefs.current.get(nextIncomplete.baseId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 150);
                                }
                              }
                            }
                          }
                        };

                        const rows = isSplit ? bagAssignments : [null];
                        return rows.map((bagSlot) => {
                          const displayQty = bagSlot ? bagSlot.qty : item.quantity;
                          const rowKey = bagSlot ? `${index}-bag${bagSlot.bagNo}` : `${index}`;
                          const isRowComplete = isSplit && bagSlot
                            ? (bagSlotPacked.get(`${index}-bag${bagSlot.bagNo}`) ?? false)
                            : isItemComplete;
                          return (
                            <button
                              key={rowKey}
                              type="button"
                              disabled={!isConfirmed}
                              onClick={() => handleSlotClick(bagSlot)}
                              className={`flex items-center gap-2 text-left font-semibold transition-all ${
                                isConfirmed
                                  ? `px-3 py-3 min-h-[52px] rounded-xl border-2 active:scale-95 ${isRowComplete ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-primary-300'}`
                                  : 'px-2 py-1 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 text-sm cursor-default'
                              }`}
                            >
                              {isConfirmed && (isRowComplete
                                ? <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                                : <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                              )}
                              {variantLabel && <span className="flex-1 text-sm leading-snug">{variantLabel}</span>}
                              <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${isRowComplete && isConfirmed ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700'}`}>×{displayQty}</span>
                              {isConfirmed && bagSlot && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isRowComplete ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'}`}>Bag {bagSlot.bagNo}</span>
                              )}
                              {isConfirmed && !bagSlot && bagAssignments.length === 1 && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isItemComplete ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'}`}>Bag {bagAssignments[0].bagNo}</span>
                              )}
                            </button>
                          );
                        });
                      })}
                    </div>
                  </div>

                  {/* ── DESKTOP: vertical card ── */}
                  <div className="hidden sm:flex flex-col">
                    <div
                      className="relative aspect-square bg-gray-100 cursor-zoom-in"
                      onClick={() => group.imgSrc && setZoomedImage({ src: group.imgSrc, alt: group.baseName })}
                    >
                      {group.imgSrc
                        ? <img src={group.imgSrc} alt={group.baseName} className="w-full h-full object-contain" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-gray-300" /></div>
                      }
                      {allGroupComplete && isConfirmed && (
                        <div className="absolute inset-0 bg-green-500/75 flex items-center justify-center">
                          <CheckCircle2 className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-2">
                        <p className="text-white text-sm font-bold leading-tight">{group.baseName}</p>
                      </div>
                    </div>
                    <div className="p-1.5 flex flex-col gap-1">
                      {group.variants.flatMap(({ item, originalIndex: index }) => {
                        const packed = packedQty.get(index) ?? 0;
                        const isItemComplete = packed >= item.quantity;
                        const variantLabel = item.itemId.includes(':') ? item.itemId.split(':').slice(1).join(':') : 'Single';
                        const bagAssignments = itemBagMap.get(item.itemId) ?? [];
                        const isSplit = bagAssignments.length > 1;

                        const handleDesktopSlotClick = (bagSlot: typeof bagAssignments[0] | null) => {
                          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(30);
                          if (isSplit && bagSlot) {
                            const slotKey = `${index}-bag${bagSlot.bagNo}`;
                            const wasSlotDone = bagSlotPacked.get(slotKey) ?? false;
                            const newSlotDone = !wasSlotDone;
                            playPackSound(newSlotDone);
                            if (newSlotDone) triggerCombo();
                            setBagSlotPacked(prev => { const n = new Map(prev); n.set(slotKey, newSlotDone); return n; });
                            const newTotal = bagAssignments.reduce((sum, a) => {
                              const key = `${index}-bag${a.bagNo}`;
                              const done = key === slotKey ? newSlotDone : (bagSlotPacked.get(key) ?? false);
                              return sum + (done ? a.qty : 0);
                            }, 0);
                            setPackedQty(prev => { const n = new Map(prev); n.set(index, newTotal); return n; });
                            if (newSlotDone && newTotal >= item.quantity) {
                              const willGroupBeComplete = group.variants.every(({ item: vi, originalIndex: vi_idx }) =>
                                vi_idx === index ? true : (packedQty.get(vi_idx) ?? 0) >= vi.quantity
                              );
                              if (willGroupBeComplete) {
                                const currentIdx = groups.indexOf(group);
                                const nextIncomplete = groups.slice(currentIdx + 1).find(g =>
                                  g.variants.some(({ item: vi, originalIndex: vi_idx }) =>
                                    vi_idx !== index && (packedQty.get(vi_idx) ?? 0) < vi.quantity
                                  )
                                );
                                if (nextIncomplete) setTimeout(() => groupRefs.current.get(nextIncomplete.baseId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
                              }
                            }
                          } else {
                            playPackSound(!isItemComplete);
                            if (!isItemComplete) triggerCombo();
                            setPackedQty(prev => { const n = new Map(prev); n.set(index, isItemComplete ? 0 : item.quantity); return n; });
                          }
                        };

                        const rows = isSplit ? bagAssignments : [null];
                        return rows.map((bagSlot) => {
                          const displayQty = bagSlot ? bagSlot.qty : item.quantity;
                          const rowKey = bagSlot ? `${index}-bag${bagSlot.bagNo}` : `${index}`;
                          const isRowComplete = isSplit && bagSlot
                            ? (bagSlotPacked.get(`${index}-bag${bagSlot.bagNo}`) ?? false)
                            : isItemComplete;
                          return (
                            <button
                              key={rowKey}
                              type="button"
                              disabled={!isConfirmed}
                              onClick={() => handleDesktopSlotClick(bagSlot)}
                              className={`w-full flex px-2 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all duration-150 active:scale-95 text-left ${
                                isRowComplete && isConfirmed
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : isConfirmed
                                  ? 'bg-white border-gray-300 text-gray-900 hover:border-primary-300 hover:bg-primary-50'
                                  : 'bg-gray-50 border-transparent text-gray-800'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{variantLabel}</span>
                                  {bagSlot && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isRowComplete ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'}`}>Bag {bagSlot.bagNo}</span>
                                  )}
                                  {!bagSlot && bagAssignments.length === 1 && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isItemComplete ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'}`}>Bag {bagAssignments[0].bagNo}</span>
                                  )}
                                </div>
                                <span className={`text-xs font-bold flex-shrink-0 ${isRowComplete && isConfirmed ? 'text-white/70' : 'text-gray-400'}`}>×{displayQty}</span>
                              </div>
                            </button>
                          );
                        });
                      })}
                    </div>
                  </div>

                </div>
              );
            });
          })()}
        </div>{/* end items grid */}

        </div>{/* end left column */}

        {/* RIGHT: sticky bag plan (sm+ only) */}
        {order.status === 'confirmed' && bagPlan.length > 0 && (
          <div className="hidden sm:block flex-[2] sticky top-0 max-h-[calc(100vh-14rem)] overflow-y-auto no-scrollbar">
            <BagPlanPanel bagPlan={bagPlan} />
          </div>
        )}

      </div>{/* end flex */}
      </div>{/* end max-w */}
      </div>{/* end scrollable */}

      {/* Footer action bar — fixed at very bottom */}
      {order.status !== 'collected' && (
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-lg px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          {order.status === 'confirmed' && (
            <>
              {!allComplete && totalPacked > 0 && (
                <p className="text-xs text-center text-gray-400 mb-2 font-semibold">
                  {totalQty - totalPacked} item{totalQty - totalPacked !== 1 ? 's' : ''} still to pack
                </p>
              )}
              <button
                onClick={() => handleStatusChange('packed')}
                disabled={!allComplete}
                className={`w-full py-4 rounded-xl text-base font-bold transition-all ${
                  allComplete
                    ? 'bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {allComplete ? '✓ All done! Mark as Packed' : 'Mark as Packed'}
              </button>
            </>
          )}

          {order.status === 'packed' && (
            <button
              onClick={() => handleStatusChange('collected')}
              className="w-full py-4 bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white rounded-xl text-base font-bold transition-all shadow-sm"
            >
              ✓ Mark as Collected
            </button>
          )}

        </div>
      </div>
      )}


      {/* Success flash overlay */}
      {flashContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-success-flash bg-gray-900">
          <div className="flex flex-col items-center gap-2 text-white px-10 py-8 min-w-[220px]">
            <CheckCircle2 className="w-14 h-14 text-white" />
            <p className="text-2xl font-bold">{flashContent.message}</p>
            {flashContent.speedLabel && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl">{flashContent.speedEmoji}</span>
                <span className="text-lg font-semibold text-gray-300">{flashContent.speedLabel}</span>
              </div>
            )}
            {flashContent.packTime && (
              <p className="text-sm text-gray-500 font-semibold tabular-nums">
                {flashContent.isPersonalBest ? '🏅 New personal best · ' : ''}{flashContent.packTime}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Milestone popup */}
      {milestoneContent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-32 animate-slide-up">
          <div className="flex items-center gap-3 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl">
            <span className="text-3xl">{milestoneContent.emoji}</span>
            <p className="text-base font-bold">{milestoneContent.message}</p>
          </div>
        </div>
      )}

      {/* Bag plan bottom sheet — mobile */}
      {showBagPlan && (
        <div
          className="sm:hidden fixed inset-0 bg-black/60 z-50 flex items-end"
          onClick={() => setShowBagPlan(false)}
        >
          <div
            className="w-full max-h-[85vh] overflow-y-auto no-scrollbar bg-white rounded-t-3xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-500" />
                <h2 className="text-base font-bold text-gray-900">How to fill the bags</h2>
              </div>
              <button
                onClick={() => setShowBagPlan(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <BagPlanPanel bagPlan={bagPlan} hideHeader />
          </div>
        </div>
      )}

      {/* Image zoom modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-lg w-full animate-pop-in"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
            />
            <p className="text-white text-base font-semibold text-center mt-4">{zoomedImage.alt}</p>
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Close image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BagPlanPanel({ bagPlan, className = '', hideHeader = false }: { bagPlan: BagEntry[]; className?: string; hideHeader?: boolean }) {
  if (bagPlan.length === 0) return null;
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col ${className}`}>
      {!hideHeader && (
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <ShoppingBag className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">How to fill the bags</h3>
          <span className="ml-auto text-sm bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold px-2.5 py-0.5 rounded-full">
            {bagPlan.length} bag{bagPlan.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {/* Pack-order legend */}
      <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-b border-amber-100">
        <span className="text-lg">📦</span>
        <span className="text-sm font-bold text-amber-800">Heavy items go in first (at the bottom)</span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {bagPlan.map((bag) => (
          <div key={bag.bagNo} className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">Bag {bag.bagNo}</span>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                ~{bag.weightG >= 1000 ? `${(bag.weightG / 1000).toFixed(1)}kg` : `${bag.weightG}g`}
              </span>
            </div>
            <div className="space-y-2.5">
              {bag.items.map((item: any, i: number) => {
                const isFirst = i === 0;
                const isLast = i === bag.items.length - 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 w-5">{i + 1}.</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-1">{item.itemName}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">×{item.quantity}</span>
                    {isFirst && bag.items.length > 1 && (
                      <span className="text-xs font-bold text-white bg-gray-500 dark:bg-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">in first</span>
                    )}
                    {isLast && bag.items.length > 1 && (
                      <span className="text-xs font-bold text-white bg-primary-500 dark:bg-primary-400 px-2 py-0.5 rounded-full flex-shrink-0">in last</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

