import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

// Create order with items array (single row per order)
export const create = mutation({
  args: {
    items: v.array(
      v.object({
        itemId: v.string(),
        itemName: v.string(),
        quantity: v.number(),
      })
    ),
    username: v.string(),
    collectionPoint: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!caller) throw new Error('User not found');
    const callerRoles = caller.roles ?? ((caller as any).role ? [(caller as any).role] : []);
    if (!callerRoles.includes('customer')) throw new Error('Only customers can place orders');

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = Date.now();

    // Pre-compute values for better query performance
    const itemCount = args.items.length;
    const totalQuantity = args.items.reduce((sum, item) => sum + item.quantity, 0);

    // Insert single order with items array
    await ctx.db.insert("orders", {
      orderId,
      username: args.username,
      collectionPoint: args.collectionPoint,
      items: args.items,
      status: "confirmed",
      createdAt,
      statusUpdatedAt: createdAt,
      itemCount,
      totalQuantity,
    });

    return orderId;
  },
});

// Get orders by username (for customers)
export const getByUsername = query({
  args: {
    username: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50; // Default limit of 50 orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .order("desc")
      .take(limit);

    return orders.map((order) => ({
      orderId: order.orderId,
      username: order.username,
      collectionPoint: order.collectionPoint,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
    }));
  },
});

// Get orders by collection point (for collection point managers)
export const getByCollectionPoint = query({
  args: {
    collectionPoint: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100; // Default limit of 100 orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_collection_point", (q) => q.eq("collectionPoint", args.collectionPoint))
      .order("desc")
      .take(limit);

    return orders.map((order) => ({
      orderId: order.orderId,
      username: order.username,
      collectionPoint: order.collectionPoint,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
    }));
  },
});

// Get single order by orderId
export const getByOrderId = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!order) {
      return null;
    }

    return {
      orderId: order.orderId,
      username: order.username,
      collectionPoint: order.collectionPoint,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
    };
  },
});

// Get all orders
export const listAll = query({
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .collect();

    return orders.map((order) => ({
      orderId: order.orderId,
      username: order.username,
      collectionPoint: order.collectionPoint,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
    }));
  },
});

// Update order status (single update per order - much faster!)
export const updateStatus = mutation({
  args: {
    orderId: v.string(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("packed"),
      v.literal("collected")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    const callerRoles = caller?.roles ?? ((caller as any)?.role ? [(caller as any).role] : []);
    if (!caller || (!callerRoles.includes('collection_point_manager') && !callerRoles.includes('admin'))) {
      throw new Error('Unauthorized');
    }

    // Find the order
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!order) {
      throw new Error("Order not found");
    }

    // Single update - much faster than updating multiple rows!
    await ctx.db.patch(order._id, {
      status: args.status,
      statusUpdatedAt: Date.now(), // Track when status changed
    });
  },
});

// Get order statistics
export const getStats = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();

    const totalOrders = orders.length;
    const totalItems = orders.reduce((sum, order) => sum + order.items.length, 0);

    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders,
      totalItems,
      statusCounts,
    };
  },
});

// Get orders by status (for filtering)
export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("confirmed"),
      v.literal("packed"),
      v.literal("collected")
    ),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();

    return orders.map((order) => ({
      orderId: order.orderId,
      username: order.username,
      collectionPoint: order.collectionPoint,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
    }));
  },
});

// OPTIMIZED: Get orders by collection point and status using composite index
export const getByCollectionPointAndStatus = query({
  args: {
    collectionPoint: v.string(),
    status: v.union(
      v.literal("confirmed"),
      v.literal("packed"),
      v.literal("collected")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    // Uses composite index - much faster than filtering after query!
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_collection_point_status", (q) =>
        q.eq("collectionPoint", args.collectionPoint).eq("status", args.status)
      )
      .order("desc")
      .take(limit);

    return orders.map((order) => ({
      orderId: order.orderId,
      username: order.username,
      collectionPoint: order.collectionPoint,
      status: order.status,
      createdAt: order.createdAt,
      statusUpdatedAt: order.statusUpdatedAt,
      itemCount: order.itemCount,
      totalQuantity: order.totalQuantity,
      items: order.items,
    }));
  },
});

// Get recent orders for a collection point (optimized with composite index)
export const getRecentByCollectionPoint = query({
  args: {
    collectionPoint: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    // Uses composite index for faster sorting by creation date
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_collection_point_created", (q) =>
        q.eq("collectionPoint", args.collectionPoint)
      )
      .order("desc")
      .take(limit);

    return orders.map((order) => ({
      orderId: order.orderId,
      username: order.username,
      collectionPoint: order.collectionPoint,
      status: order.status,
      createdAt: order.createdAt,
      statusUpdatedAt: order.statusUpdatedAt,
      itemCount: order.itemCount,
      totalQuantity: order.totalQuantity,
      items: order.items,
    }));
  },
});

// ─── P0 FIX: Paginated query with smart index routing ────────────────────────
// Handles all filter combinations (status, collectionPoint, or both) and routes
// to the most efficient composite index. Replaces listAll / getByCollectionPoint.
export const listAllPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(
        v.literal("confirmed"),
        v.literal("packed"),
        v.literal("collected"),
        v.literal("cancelled")
      )
    ),
    collectionPoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orderShape = (order: any) => ({
      orderId: order.orderId,
      username: order.username,
      collectionPoint: order.collectionPoint,
      status: order.status,
      createdAt: order.createdAt,
      statusUpdatedAt: order.statusUpdatedAt,
      itemCount: order.itemCount,
      totalQuantity: order.totalQuantity,
      items: order.items,
    });

    // Both filters → composite index (most selective)
    if (args.collectionPoint && args.status) {
      const result = await ctx.db
        .query("orders")
        .withIndex("by_collection_point_status", (q) =>
          q
            .eq("collectionPoint", args.collectionPoint!)
            .eq("status", args.status!)
        )
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...result, page: result.page.map(orderShape) };
    }

    // Status only → status index
    if (args.status) {
      const result = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...result, page: result.page.map(orderShape) };
    }

    // Collection point only → collection point index
    if (args.collectionPoint) {
      const result = await ctx.db
        .query("orders")
        .withIndex("by_collection_point", (q) =>
          q.eq("collectionPoint", args.collectionPoint!)
        )
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...result, page: result.page.map(orderShape) };
    }

    // No filters → full table scan, paginated (admin all-orders view)
    const result = await ctx.db
      .query("orders")
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(orderShape) };
  },
});

// ─── P0 FIX: Paginated customer order history ────────────────────────────────
export const getByUsernamePaginated = query({
  args: {
    username: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("orders")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((order) => ({
        orderId: order.orderId,
        username: order.username,
        collectionPoint: order.collectionPoint,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items,
      })),
    };
  },
});

// ─── P0 FIX: Server-side status counts using indexes ─────────────────────────
export const getStatusCounts = query({
  args: {
    collectionPoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const countIndex = async (
      status: "confirmed" | "packed" | "collected"
    ): Promise<number> => {
      if (args.collectionPoint) {
        const rows = await ctx.db
          .query("orders")
          .withIndex("by_collection_point_status", (q) =>
            q
              .eq("collectionPoint", args.collectionPoint!)
              .eq("status", status)
          )
          .collect();
        return rows.length;
      }
      const rows = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      return rows.length;
    };

    const [confirmed, packed, collected] = await Promise.all([
      countIndex("confirmed"),
      countIndex("packed"),
      countIndex("collected"),
    ]);

    return { confirmed, packed, collected, total: confirmed + packed + collected };
  },
});

// ─── P0 FIX: Server-side items-to-pack aggregation ───────────────────────────
export const getConfirmedItemsSummary = query({
  args: {
    collectionPoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const confirmedOrders = args.collectionPoint
      ? await ctx.db
          .query("orders")
          .withIndex("by_collection_point_status", (q) =>
            q
              .eq("collectionPoint", args.collectionPoint!)
              .eq("status", "confirmed")
          )
          .collect()
      : await ctx.db
          .query("orders")
          .withIndex("by_status", (q) => q.eq("status", "confirmed"))
          .collect();

    // Group by base product ID, collect variants as sub-items
    type VariantEntry = { itemId: string; variantLabel: string; quantity: number };
    type ProductEntry = { baseId: string; productName: string; totalQuantity: number; variants: Map<string, VariantEntry> };
    const productMap = new Map<string, ProductEntry>();

    for (const order of confirmedOrders) {
      for (const item of order.items) {
        const baseId = item.itemId.split(':')[0];
        const variantLabel = item.itemId.includes(':')
          ? item.itemId.split(':').slice(1).join(':')
          : '';
        // Base product name: strip variant suffix from itemName if present
        const productName = item.itemName.includes('(')
          ? item.itemName.slice(0, item.itemName.lastIndexOf('(')).trim()
          : item.itemName;

        if (!productMap.has(baseId)) {
          productMap.set(baseId, { baseId, productName, totalQuantity: 0, variants: new Map() });
        }
        const product = productMap.get(baseId)!;
        product.totalQuantity += item.quantity;
        product.productName = productName; // keep most recent (consistent)

        const variantKey = variantLabel || '__base__';
        const existing = product.variants.get(variantKey);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          product.variants.set(variantKey, { itemId: item.itemId, variantLabel, quantity: item.quantity });
        }
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => a.productName.localeCompare(b.productName))
      .map(p => ({
        baseId: p.baseId,
        productName: p.productName,
        totalQuantity: p.totalQuantity,
        variants: Array.from(p.variants.values()).sort((a, b) =>
          a.variantLabel.localeCompare(b.variantLabel)
        ),
      }));
  },
});

// ─── Admin Dashboard Metrics ──────────────────────────────────────────────────
export const getDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const [orders, products] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("products").collect(),
    ]);

    // Build price lookup: productId -> { basePrice, variants: { label -> price } }
    const priceMap = new Map<string, { base: number; variants: Map<string, number> }>();
    for (const p of products) {
      const variantMap = new Map<string, number>();
      for (const v of (p.variants ?? [])) variantMap.set(v.label, v.price);
      priceMap.set(p.productId, { base: p.price ?? 0, variants: variantMap });
    }

    // Helper: pence for one order item
    const itemRevenue = (itemId: string, quantity: number): number => {
      const [baseId, ...rest] = itemId.split(':');
      const entry = priceMap.get(baseId);
      if (!entry) return 0;
      const variantLabel = rest.join(':');
      const unitPrice = variantLabel ? (entry.variants.get(variantLabel) ?? entry.base) : entry.base;
      return unitPrice * quantity;
    };

    const total = orders.length;
    const confirmed = orders.filter(o => o.status === 'confirmed').length;
    const packed = orders.filter(o => o.status === 'packed').length;
    const collected = orders.filter(o => o.status === 'collected').length;
    const fulfillmentRate = total > 0 ? Math.round((collected / total) * 100) : 0;

    // Total revenue (pence) — exclude cancelled orders
    let totalRevenuePence = 0;
    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    for (const order of activeOrders) {
      for (const item of (order.items ?? []) as any[]) {
        totalRevenuePence += itemRevenue(item.itemId, item.quantity);
      }
    }

    // Average order value (pence)
    const avgOrderValuePence = activeOrders.length > 0
      ? Math.round(totalRevenuePence / activeOrders.length)
      : 0;

    // Active customers (unique) + repeat customer rate
    const customerOrderCount: Record<string, number> = {};
    for (const order of orders) {
      customerOrderCount[order.username] = (customerOrderCount[order.username] ?? 0) + 1;
    }
    const activeCustomers = Object.keys(customerOrderCount).length;
    const repeatCustomers = Object.values(customerOrderCount).filter(c => c > 1).length;
    const repeatRate = activeCustomers > 0 ? Math.round((repeatCustomers / activeCustomers) * 100) : 0;

    // Average turnaround time: confirmed → collected (ms → hours, for collected orders with statusUpdatedAt)
    const collectedOrders = orders.filter(o => o.status === 'collected' && o.statusUpdatedAt);
    const avgTurnaroundMs = collectedOrders.length > 0
      ? collectedOrders.reduce((sum, o) => sum + (o.statusUpdatedAt! - o.createdAt), 0) / collectedOrders.length
      : 0;
    // Format as "Xh Ym" or "Xm"
    const avgTurnaroundHours = Math.floor(avgTurnaroundMs / 3600000);
    const avgTurnaroundMins = Math.round((avgTurnaroundMs % 3600000) / 60000);
    const avgTurnaround = avgTurnaroundMs === 0 ? null
      : avgTurnaroundHours > 0 ? `${avgTurnaroundHours}h ${avgTurnaroundMins}m`
      : `${avgTurnaroundMins}m`;

    // Daily order counts + revenue — last 14 days
    const now = Date.now();
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const dailyMap: Record<string, { count: number; revenuePence: number }> = {};
    // Use activeOrders for revenue in daily map
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      dailyMap[`${d.getMonth() + 1}/${d.getDate()}`] = { count: 0, revenuePence: 0 };
    }
    for (const order of orders) {
      if (order.createdAt < fourteenDaysAgo) continue;
      const d = new Date(order.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!(key in dailyMap)) continue;
      dailyMap[key].count++;
      for (const item of (order.items ?? []) as any[]) {
        dailyMap[key].revenuePence += itemRevenue(item.itemId, item.quantity);
      }
    }
    const dailyOrders = Object.entries(dailyMap).map(([date, { count }]) => ({ date, count }));
    const dailyRevenue = Object.entries(dailyMap).map(([date, { revenuePence }]) => ({ date, revenuePence }));

    // Orders + revenue by collection point (sorted by revenue)
    const cpMap: Record<string, { count: number; revenuePence: number }> = {};
    for (const order of orders) {
      if (!cpMap[order.collectionPoint]) cpMap[order.collectionPoint] = { count: 0, revenuePence: 0 };
      cpMap[order.collectionPoint].count++;
      for (const item of (order.items ?? []) as any[]) {
        cpMap[order.collectionPoint].revenuePence += itemRevenue(item.itemId, item.quantity);
      }
    }
    const byCollectionPoint = Object.entries(cpMap)
      .sort((a, b) => b[1].revenuePence - a[1].revenuePence)
      .map(([name, { count, revenuePence }]) => ({ name, count, revenuePence }));

    // Top products by quantity (for pie chart)
    const productQtyMap: Record<string, number> = {};
    for (const order of orders) {
      for (const item of (order.items ?? []) as any[]) {
        const name = item.itemName.includes('(')
          ? item.itemName.slice(0, item.itemName.lastIndexOf('(')).trim()
          : item.itemName;
        productQtyMap[name] = (productQtyMap[name] ?? 0) + item.quantity;
      }
    }
    const topProducts = Object.entries(productQtyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    // Status breakdown
    const statusBreakdown = [
      { name: 'Confirmed', value: confirmed, color: '#f59e0b' },
      { name: 'Packed',    value: packed,    color: '#3b82f6' },
      { name: 'Collected', value: collected, color: '#10b981' },
    ];

    return {
      total, confirmed, packed, collected, fulfillmentRate,
      totalRevenuePence, avgOrderValuePence,
      activeCustomers, repeatCustomers, repeatRate,
      avgTurnaround,
      dailyOrders, dailyRevenue, byCollectionPoint, topProducts, statusBreakdown,
    };
  },
});
