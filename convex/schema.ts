import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Sensitivity group keys — must match SENSITIVITY_GROUPS in lib/bagPlan.ts
// Pack order (bottom → top): dry → general → produce → delicate-produce → bakery → chilled → fragile → frozen

export default defineSchema({
  products: defineTable({
    productId:   v.string(),
    name:        v.string(),
    image:       v.string(), // legacy field — kept optional for existing documents
    sensitivity: v.string(),             // key from SENSITIVITY_GROUPS in lib/bagPlan.ts
    price:       v.optional(v.number()), // price per unit in pence (integer, e.g. 150 = £1.50)
    unit:        v.optional(v.string()), // measurement unit: each | kg | g | litre | dozen | pack | bunch
    available:         v.optional(v.boolean()),
    collectionPoints:  v.optional(v.array(v.string())), // CPs where this product is stocked; undefined/empty = all CPs
    variants:    v.optional(v.array(v.object({
      label:   v.string(),  // e.g. "500g", "1kg", "6 pack"
      price:   v.number(),  // pence
      weightG: v.number(),
    }))),
  }).index("by_product_id", ["productId"]),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    roles: v.array(v.union(v.literal("customer"), v.literal("collection_point_manager"), v.literal("admin"))),
    role: v.optional(v.union(v.literal("customer"), v.literal("collection_point_manager"), v.literal("admin"))), // legacy
    collectionPoint: v.optional(v.string()),
    clerkId: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),

  orders: defineTable({
    orderId: v.string(),
    username: v.string(),
    collectionPoint: v.string(),
    items: v.array(
      v.object({
        itemId: v.string(),
        itemName: v.string(),
        quantity: v.number(),
      })
    ),
    status: v.union(
      v.literal("confirmed"),
      v.literal("packed"),
      v.literal("collected"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    statusUpdatedAt: v.optional(v.number()), // Track when status changed
    itemCount: v.optional(v.number()), // Pre-computed item count
    totalQuantity: v.optional(v.number()), // Pre-computed total quantity
  })
    .index("by_order_id", ["orderId"])
    .index("by_username", ["username"])
    .index("by_collection_point", ["collectionPoint"])
    .index("by_status", ["status"])
    // Composite indexes for common query patterns - MUCH faster!
    .index("by_collection_point_status", ["collectionPoint", "status"])
    .index("by_username_status", ["username", "status"])
    .index("by_created_at", ["createdAt"])
    .index("by_collection_point_created", ["collectionPoint", "createdAt"]),
});
