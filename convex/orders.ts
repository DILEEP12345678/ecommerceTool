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
    if (caller.role !== 'customer') throw new Error('Only customers can place orders');

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
    if (!caller || (caller.role !== 'collection_point_manager' && caller.role !== 'admin')) {
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
