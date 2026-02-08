import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user's cart
export const getUserCart = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const cartItems = await ctx.db
      .query("cart")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get product details for each cart item
    const cartWithProducts = await Promise.all(
      cartItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    return cartWithProducts;
  },
});

// Add item to cart
export const addItem = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if item already exists in cart
    const existingItem = await ctx.db
      .query("cart")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", args.userId).eq("productId", args.productId)
      )
      .first();

    if (existingItem) {
      // Update quantity
      await ctx.db.patch(existingItem._id, {
        quantity: existingItem.quantity + args.quantity,
      });
      return existingItem._id;
    } else {
      // Create new cart item
      const cartItemId = await ctx.db.insert("cart", args);
      return cartItemId;
    }
  },
});

// Update cart item quantity
export const updateQuantity = mutation({
  args: {
    id: v.id("cart"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      await ctx.db.delete(args.id);
    } else {
      await ctx.db.patch(args.id, { quantity: args.quantity });
    }
  },
});

// Remove item from cart
export const removeItem = mutation({
  args: { id: v.id("cart") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Clear user's cart
export const clearCart = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const cartItems = await ctx.db
      .query("cart")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const item of cartItems) {
      await ctx.db.delete(item._id);
    }
  },
});
