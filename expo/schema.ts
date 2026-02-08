import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("customer"), v.literal("admin")),
    phone: v.optional(v.string()),
    addresses: v.optional(
      v.array(
        v.object({
          street: v.string(),
          city: v.string(),
          state: v.string(),
          zipCode: v.string(),
          isDefault: v.boolean(),
        })
      )
    ),
    clerkId: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),

  categories: defineTable({
    name: v.string(),
    description: v.string(),
    image: v.string(),
    displayOrder: v.number(),
    isActive: v.boolean(),
  }).index("by_display_order", ["displayOrder"]),

  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categoryId: v.id("categories"),
    image: v.string(),
    images: v.optional(v.array(v.string())),
    stock: v.number(),
    unit: v.string(), // e.g., "kg", "piece", "liter"
    featured: v.boolean(),
    discount: v.optional(v.number()), // percentage
    isActive: v.boolean(),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_category", ["categoryId"])
    .index("by_featured", ["featured"]),

  cart: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_product", ["userId", "productId"]),

  orders: defineTable({
    userId: v.id("users"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        image: v.string(),
      })
    ),
    subtotal: v.number(),
    tax: v.number(),
    deliveryFee: v.number(),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    deliveryAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
    }),
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  reviews: defineTable({
    productId: v.id("products"),
    userId: v.id("users"),
    rating: v.number(), // 1-5
    comment: v.string(),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_user", ["userId"]),
});
