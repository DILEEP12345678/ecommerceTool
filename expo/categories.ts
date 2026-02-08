import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all active categories
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_display_order")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get all categories (including inactive, for admin)
export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_display_order")
      .collect();
  },
});

// Get category by ID
export const get = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create category
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    image: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const categoryId = await ctx.db.insert("categories", {
      ...args,
      isActive: true,
    });
    return categoryId;
  },
});

// Update category
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Delete category
export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    // Check if any products are using this category
    const products = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .collect();

    if (products.length > 0) {
      throw new Error("Cannot delete category with existing products");
    }

    await ctx.db.delete(args.id);
  },
});
