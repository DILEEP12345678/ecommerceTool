import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
      await ctx.db.patch(existing._id, { name: args.name, email: args.email });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role: "customer",
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
    if (user.role !== 'customer') throw new Error('Only customers can set a collection point here');

    await ctx.db.patch(user._id, { collectionPoint: args.collectionPoint });
  },
});

// Create user
export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    clerkId: v.string(),
    role: v.optional(
      v.union(v.literal("customer"), v.literal("collection_point_manager"))
    ),
    collectionPoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      clerkId: args.clerkId,
      role: args.role || "customer",
      collectionPoint: args.collectionPoint,
    });
    return userId;
  },
});

// Get all users
export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Get collection points list
export const getCollectionPoints = query({
  handler: async (ctx) => {
    const managers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "collection_point_manager"))
      .collect();

    return managers
      .filter((m) => m.collectionPoint)
      .map((m) => m.collectionPoint as string);
  },
});
