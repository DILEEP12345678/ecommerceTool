import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const ROLE = v.union(v.literal("customer"), v.literal("collection_point_manager"), v.literal("admin"));

// Get user by Clerk ID
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get user by ID
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create or update user from Clerk (called automatically on sign-in)
export const upsertFromClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    if (identity.subject !== args.clerkId) throw new Error('Unauthorized');

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      // Migrate legacy `role` field to `roles` array if needed
      const roles: ("customer" | "collection_point_manager" | "admin")[] =
        existing.roles ?? ((existing as any).role ? [(existing as any).role] : ["customer"]);
      await ctx.db.patch(existing._id, { name: args.name, email: args.email, roles });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      roles: ["customer"],
    });
  },
});

// Set or update the collection point for the calling customer
export const updateCollectionPoint = mutation({
  args: { collectionPoint: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error('User not found');

    if (!(user.roles ?? []).includes('customer')) throw new Error('Only customers can set a collection point here');

    await ctx.db.patch(user._id, { collectionPoint: args.collectionPoint });
  },
});

// Update roles (and optionally collectionPoint) for a user (admin only)
export const updateRoles = mutation({
  args: {
    userId: v.id("users"),
    roles: v.array(ROLE),
    collectionPoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!(caller?.roles ?? []).includes('admin')) throw new Error('Unauthorized: admins only');

    await ctx.db.patch(args.userId, {
      roles: args.roles,
      ...(args.collectionPoint !== undefined ? { collectionPoint: args.collectionPoint } : {}),
    });
  },
});

// Create user
export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    clerkId: v.string(),
    roles: v.optional(v.array(ROLE)),
    collectionPoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      clerkId: args.clerkId,
      roles: args.roles ?? ["customer"],
      collectionPoint: args.collectionPoint,
    });
  },
});

// Get all users
export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Get collection points list (from users with collection_point_manager role)
export const getCollectionPoints = query({
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const names = allUsers
      .filter((u) => (u.roles ?? []).includes("collection_point_manager") && u.collectionPoint)
      .map((u) => u.collectionPoint as string);
    return [...new Set(names)].sort();
  },
});

// Get credits + history for the calling user
export const getCredits = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { credits: 0, history: [] };
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).first();
    if (!user) return { credits: 0, history: [] };
    const history = await ctx.db.query("creditHistory").withIndex("by_user", q => q.eq("userId", user._id)).order("desc").take(100);
    return { credits: user.credits ?? 0, history };
  },
});

// Award credits for packing an order
export const awardCredits = mutation({
  args: { orderId: v.string(), amount: v.number(), label: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { credits: (user.credits ?? 0) + args.amount });
    await ctx.db.insert("creditHistory", {
      userId: user._id,
      orderId: args.orderId,
      amount: args.amount,
      label: args.label,
      timestamp: Date.now(),
    });
  },
});

// Reset credits for the calling user
export const resetCredits = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { credits: 0 });
    const history = await ctx.db.query("creditHistory").withIndex("by_user", q => q.eq("userId", user._id)).collect();
    await Promise.all(history.map(h => ctx.db.delete(h._id)));
  },
});

// Migrate all legacy `role` fields to `roles` arrays (run once, then safe to remove)
export const migrateRolesToArray = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!caller?.roles?.includes('admin')) throw new Error('Unauthorized: admins only');

    const users = await ctx.db.query("users").collect();
    let migrated = 0;
    for (const user of users) {
      if (!user.roles) {
        const roles: ("customer" | "collection_point_manager" | "admin")[] =
          (user as any).role ? [(user as any).role] : ["customer"];
        await ctx.db.patch(user._id, { roles });
        migrated++;
      }
    }
    return { migrated };
  },
});
