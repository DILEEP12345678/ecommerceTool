// ── BAG PLAN HELPERS ─────────────────────────────────────
export type SensitivityGroup = { key: string; label: string; emoji: string; color: string; border: string };

export const SENSITIVITY_GROUPS: SensitivityGroup[] = [
  { key: 'non-sensitive',     label: 'Non-Sensitive',     emoji: '📦', color: 'bg-gray-50',   border: 'border-gray-200'  },
  { key: 'sensitive',         label: 'Sensitive',         emoji: '⚠️', color: 'bg-amber-50',  border: 'border-amber-200' },
  { key: 'extreme-sensitive', label: 'Extreme Sensitive', emoji: '🚨', color: 'bg-red-50',    border: 'border-red-200'   },
];

// Pack order: non-sensitive first (bottom), sensitive middle, extreme-sensitive last (top)
const PACK_ORDER: Record<string, number> = {
  'non-sensitive':     0,
  'sensitive':         1,
  'extreme-sensitive': 2,
};

const GROUP_BY_KEY = new Map(SENSITIVITY_GROUPS.map(g => [g.key, g]));

// Single 6 kg capacity for all bags
const BAG_CAPACITY_G = 6000;

// Fallback metadata for products not yet in Convex (e.g. before first seed)
const FALLBACK_WEIGHT_G = 200;
const FALLBACK_SENSITIVITY = 'general';

export type ProductMeta = { weightG: number; sensitivity: string };

export type BagEntry = { bagNo: number; group: SensitivityGroup; items: any[]; weightG: number };

/**
 * Builds a packing plan for a single order's items.
 *
 * @param items       Array of { itemId, itemName, quantity } from the order
 * @param productMap  Map<productId, { weightG, sensitivity }> — loaded from Convex products table
 *
 * Strategy:
 *  1. Expand items into individual units with weight + sensitivity from productMap.
 *  2. Sort: sturdy/heavy first (they go at the bottom of each bag), fragile last (on top).
 *  3. Next-Fit packing — fill current 6 kg bag before opening a new one.
 *  4. Within each bag, merge same-item units and keep the pack order.
 *  5. Derive the bag's display group from the most sensitive item it contains.
 */
export function buildBagPlan(items: any[], productMap: Map<string, ProductMeta>): BagEntry[] {
  if (!items || items.length === 0) return [];

  type Unit = { itemId: string; itemName: string; group: SensitivityGroup; weightG: number };
  const units: Unit[] = [];

  for (const item of items) {
    const baseId = item.itemId.split(':')[0];
    const meta = productMap.get(item.itemId) ?? productMap.get(baseId);
    const weightG = meta?.weightG ?? FALLBACK_WEIGHT_G;
    const groupKey = meta?.sensitivity ?? FALLBACK_SENSITIVITY;
    const group = GROUP_BY_KEY.get(groupKey) ?? SENSITIVITY_GROUPS[SENSITIVITY_GROUPS.length - 1];
    for (let i = 0; i < item.quantity; i++) {
      units.push({ itemId: item.itemId, itemName: item.itemName, group, weightG });
    }
  }

  // Sort: non-sensitive first (bottom), sensitive last (top)
  // Within non-sensitive: heaviest first (most stable at bottom)
  // Within sensitive: lightest first (bottom of sensitive layer), heaviest/most fragile last (top)
  units.sort((a, b) => {
    const packDiff = (PACK_ORDER[a.group.key] ?? 8) - (PACK_ORDER[b.group.key] ?? 8);
    if (packDiff !== 0) return packDiff;
    if (a.group.key === 'sensitive') return a.weightG - b.weightG; // ascending: lighter first, heavier (fragile) on top
    return b.weightG - a.weightG; // descending: heavier first at bottom
  });

  // Next-Fit: fill current bag, only open next when item won't fit
  const rawBags: { units: Unit[]; weightG: number }[] = [];
  for (const unit of units) {
    const current = rawBags[rawBags.length - 1];
    if (current && current.weightG + unit.weightG <= BAG_CAPACITY_G) {
      current.units.push(unit);
      current.weightG += unit.weightG;
    } else {
      rawBags.push({ units: [unit], weightG: unit.weightG });
    }
  }

  return rawBags.map((raw, i) => {
    // Merge repeated items, preserve pack order
    const mergedMap = new Map<string, { itemId: string; itemName: string; quantity: number; group: SensitivityGroup; weightG: number }>();
    for (const u of raw.units) {
      const ex = mergedMap.get(u.itemId);
      if (ex) { ex.quantity += 1; ex.weightG += u.weightG; }
      else mergedMap.set(u.itemId, { itemId: u.itemId, itemName: u.itemName, quantity: 1, group: u.group, weightG: u.weightG });
    }

    const bagItems = Array.from(mergedMap.values());

    // Display group = most sensitive item in bag
    const displayGroup = bagItems.reduce((worst, item) => {
      return (PACK_ORDER[item.group.key] ?? 8) > (PACK_ORDER[worst.key] ?? 8) ? item.group : worst;
    }, bagItems[0].group);

    return { bagNo: i + 1, group: displayGroup, items: bagItems, weightG: raw.weightG };
  });
}
