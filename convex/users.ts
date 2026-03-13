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
      const roles = existing.roles ?? (existing.role ? [existing.role] : ["customer"]);
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

    const roles = user.roles ?? (user.role ? [user.role] : ["customer"]);
    if (!roles.includes('customer')) throw new Error('Only customers can set a collection point here');

    await ctx.db.patch(user._id, { collectionPoint: args.collectionPoint });
  },
});

// Update roles for a user (admin only)
export const updateRoles = mutation({
  args: {
    userId: v.id("users"),
    roles: v.array(ROLE),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    const callerRoles = caller?.roles ?? (caller?.role ? [caller.role] : []);
    if (!callerRoles.includes('admin')) throw new Error('Unauthorized: admins only');

    await ctx.db.patch(args.userId, { roles: args.roles });
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
    return allUsers
      .filter((u) => {
        const roles = u.roles ?? (u.role ? [u.role] : []);
        return roles.includes("collection_point_manager") && u.collectionPoint;
      })
      .map((u) => u.collectionPoint as string);
  },
});

// Migrate all legacy `role` fields to `roles` arrays (run once)
export const migrateRolesToArray = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    const callerRoles = caller?.roles ?? (caller?.role ? [caller.role] : []);
    if (!callerRoles.includes('admin')) throw new Error('Unauthorized: admins only');

    const users = await ctx.db.query("users").collect();
    let migrated = 0;
    for (const user of users) {
      if (!user.roles) {
        const roles = user.role ? [user.role] : ["customer"];
        await ctx.db.patch(user._id, { roles });
        migrated++;
      }
    }
    return { migrated };
  },
});
