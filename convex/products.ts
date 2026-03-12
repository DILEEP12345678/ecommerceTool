import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Default product catalogue ─────────────────────────────────────────────────
// Used only by the `seed` mutation — after seeding, all data lives in Convex.
const DEFAULT_PRODUCTS = [
  {
    productId: "PROD-001", name: "Fresh Apples", weightG: 180, sensitivity: "non-sensitive", price: 120, unit: "each",
    image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop",
    variants: [
      { label: "1 Apple",  price: 120, weightG: 180  },
      { label: "4 Pack",   price: 400, weightG: 720  },
      { label: "6 Pack",   price: 550, weightG: 1080 },
    ],
  },
  {
    productId: "PROD-002", name: "Bananas", weightG: 120, sensitivity: "non-sensitive", price: 20, unit: "each",
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop",
    variants: [
      { label: "Single",   price: 20,  weightG: 120  },
      { label: "Bunch ×5", price: 80,  weightG: 600  },
      { label: "Dozen",    price: 150, weightG: 1440 },
    ],
  },
  {
    productId: "PROD-003", name: "Milk", weightG: 1030, sensitivity: "sensitive", price: 110, unit: "litre",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
    variants: [
      { label: "1 Litre",  price: 110, weightG: 1030 },
      { label: "2 Litre",  price: 200, weightG: 2060 },
      { label: "4 Pint",   price: 160, weightG: 2272 },
    ],
  },
  {
    productId: "PROD-004", name: "Bread", weightG: 400, sensitivity: "sensitive", price: 90, unit: "each",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    variants: [
      { label: "400g Loaf", price: 90,  weightG: 400 },
      { label: "800g Loaf", price: 130, weightG: 800 },
    ],
  },
  {
    productId: "PROD-005", name: "Eggs", weightG: 350, sensitivity: "sensitive", price: 150, unit: "pack",
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop",
    variants: [
      { label: "6 Pack",  price: 150, weightG: 350 },
      { label: "12 Pack", price: 250, weightG: 700 },
    ],
  },
  {
    productId: "PROD-006", name: "Tomatoes", weightG: 150, sensitivity: "sensitive", price: 90, unit: "each",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=400&fit=crop",
    variants: [
      { label: "Single",       price: 90,  weightG: 150 },
      { label: "4 Pack",       price: 300, weightG: 600 },
      { label: "500g Punnet",  price: 250, weightG: 500 },
    ],
  },
  {
    productId: "PROD-007", name: "Carrots", weightG: 80, sensitivity: "non-sensitive", price: 60, unit: "each",
    image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop",
    variants: [
      { label: "Single",  price: 60,  weightG: 80   },
      { label: "500g Bag", price: 90,  weightG: 500  },
      { label: "1kg Bag",  price: 150, weightG: 1000 },
    ],
  },
  {
    productId: "PROD-008", name: "Cheese", weightG: 200, sensitivity: "sensitive", price: 220, unit: "pack",
    image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop",
    variants: [
      { label: "200g", price: 220, weightG: 200 },
      { label: "400g", price: 380, weightG: 400 },
      { label: "750g", price: 650, weightG: 750 },
    ],
  },
  {
    productId: "PROD-009", name: "Chicken", weightG: 500, sensitivity: "sensitive", price: 250, unit: "kg",
    image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=400&fit=crop",
    variants: [
      { label: "500g",  price: 250, weightG: 500  },
      { label: "1kg",   price: 450, weightG: 1000 },
      { label: "1.5kg", price: 620, weightG: 1500 },
    ],
  },
  {
    productId: "PROD-010", name: "Rice", weightG: 500, sensitivity: "non-sensitive", price: 100, unit: "kg",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",
    variants: [
      { label: "500g", price: 100, weightG: 500  },
      { label: "1kg",  price: 180, weightG: 1000 },
      { label: "2kg",  price: 320, weightG: 2000 },
    ],
  },
];

// ── Queries ───────────────────────────────────────────────────────────────────

export const list = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("products").collect();
    if (rows.length > 0) return rows;
    // Fall back to defaults while table is empty (before first seed)
    return DEFAULT_PRODUCTS.map(p => ({ ...p, available: true }));
  },
});

export const getById = query({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_product_id", q => q.eq("productId", args.productId))
      .first();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const upsert = mutation({
  args: {
    productId:   v.string(),
    name:        v.string(),
    image:       v.string(),
    weightG:     v.number(),
    sensitivity: v.string(),
    price:       v.optional(v.number()),
    unit:        v.optional(v.string()),
    available:   v.optional(v.boolean()),
    variants:    v.optional(v.array(v.object({ label: v.string(), price: v.number(), weightG: v.number() }))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_product_id", q => q.eq("productId", args.productId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name:        args.name,
        image:       args.image,
        weightG:     args.weightG,
        sensitivity: args.sensitivity,
        available:   args.available ?? true,
      });
    } else {
      await ctx.db.insert("products", { ...args, available: args.available ?? true });
    }
  },
});

export const update = mutation({
  args: {
    productId:   v.string(),
    weightG:     v.optional(v.number()),
    sensitivity: v.optional(v.string()),
    price:       v.optional(v.number()),
    unit:        v.optional(v.string()),
    name:        v.optional(v.string()),
    available:   v.optional(v.boolean()),
    variants:    v.optional(v.array(v.object({
      label:   v.string(),
      price:   v.number(),
      weightG: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_product_id", q => q.eq("productId", args.productId))
      .first();
    if (!product) throw new Error(`Product ${args.productId} not found`);
    const { productId, ...patch } = args;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(product._id, cleanPatch);
  },
});

export const remove = mutation({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_product_id", q => q.eq("productId", args.productId))
      .first();
    if (product) await ctx.db.delete(product._id);
  },
});

// Seed the table with default products (inserts or updates all defaults)
export const seed = mutation({
  handler: async (ctx) => {
    for (const p of DEFAULT_PRODUCTS) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_product_id", q => q.eq("productId", p.productId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          name:        p.name,
          image:       p.image,
          weightG:     p.weightG,
          sensitivity: p.sensitivity,
          price:       p.price,
          unit:        p.unit,
          variants:    p.variants,
          available:   true,
        });
      } else {
        await ctx.db.insert("products", { ...p, available: true });
      }
    }
  },
});
