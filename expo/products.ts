import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all products
export const list = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let productsQuery = ctx.db.query("products");

    if (args.categoryId) {
      productsQuery = productsQuery.withIndex("by_category", (q) =>
        q.eq("categoryId", args.categoryId)
      );
    }

    if (args.featured !== undefined) {
      productsQuery = productsQuery.withIndex("by_featured", (q) =>
        q.eq("featured", args.featured)
      );
    }

    const products = await productsQuery.filter((q) =>
      q.eq(q.field("isActive"), true)
    ).collect();

    return products;
  },
});

// Get product by ID
export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  },
});

// Search products
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    
    const searchQuery = args.query.toLowerCase();
    return products.filter(
      (product) =>
        product.isActive &&
        (product.name.toLowerCase().includes(searchQuery) ||
          product.description.toLowerCase().includes(searchQuery) ||
          (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchQuery))))
    );
  },
});

// Create product (Admin only)
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categoryId: v.id("categories"),
    image: v.string(),
    images: v.optional(v.array(v.string())),
    stock: v.number(),
    unit: v.string(),
    featured: v.boolean(),
    discount: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const productId = await ctx.db.insert("products", {
      ...args,
      isActive: true,
    });
    return productId;
  },
});

// Update product (Admin only)
export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    stock: v.optional(v.number()),
    unit: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    discount: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Delete product (Admin only)
export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Update stock
export const updateStock = mutation({
  args: {
    id: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }
    
    await ctx.db.patch(args.id, {
      stock: product.stock + args.quantity,
    });
  },
});
