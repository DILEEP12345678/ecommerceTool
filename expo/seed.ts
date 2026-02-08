import { mutation } from "./_generated/server";

// Seed initial data for development
export const seedData = mutation({
  handler: async (ctx) => {
    // Create categories
    const categories = [
      {
        name: "Fruits & Vegetables",
        description: "Fresh produce delivered daily",
        image: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400",
        displayOrder: 1,
        isActive: true,
      },
      {
        name: "Dairy & Eggs",
        description: "Farm fresh dairy products",
        image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
        displayOrder: 2,
        isActive: true,
      },
      {
        name: "Bakery",
        description: "Freshly baked goods",
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
        displayOrder: 3,
        isActive: true,
      },
      {
        name: "Beverages",
        description: "Drinks and refreshments",
        image: "https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=400",
        displayOrder: 4,
        isActive: true,
      },
      {
        name: "Snacks",
        description: "Tasty snacks and treats",
        image: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400",
        displayOrder: 5,
        isActive: true,
      },
    ];

    const categoryIds = [];
    for (const category of categories) {
      const id = await ctx.db.insert("categories", category);
      categoryIds.push(id);
    }

    // Create products
    const products = [
      // Fruits & Vegetables
      {
        name: "Fresh Bananas",
        description: "Ripe yellow bananas, perfect for breakfast",
        price: 40,
        categoryId: categoryIds[0],
        image: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400",
        stock: 50,
        unit: "dozen",
        featured: true,
        isActive: true,
      },
      {
        name: "Organic Tomatoes",
        description: "Juicy red tomatoes, organically grown",
        price: 60,
        categoryId: categoryIds[0],
        image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400",
        stock: 30,
        unit: "kg",
        featured: true,
        discount: 10,
        isActive: true,
      },
      {
        name: "Fresh Spinach",
        description: "Nutritious green spinach leaves",
        price: 35,
        categoryId: categoryIds[0],
        image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",
        stock: 25,
        unit: "bunch",
        featured: false,
        isActive: true,
      },
      // Dairy & Eggs
      {
        name: "Fresh Milk",
        description: "Full cream milk, farm fresh",
        price: 55,
        categoryId: categoryIds[1],
        image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
        stock: 40,
        unit: "liter",
        featured: true,
        isActive: true,
      },
      {
        name: "Farm Eggs",
        description: "Free-range chicken eggs",
        price: 90,
        categoryId: categoryIds[1],
        image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400",
        stock: 35,
        unit: "dozen",
        featured: false,
        isActive: true,
      },
      {
        name: "Greek Yogurt",
        description: "Creamy Greek style yogurt",
        price: 120,
        categoryId: categoryIds[1],
        image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
        stock: 20,
        unit: "500g",
        featured: false,
        isActive: true,
      },
      // Bakery
      {
        name: "Whole Wheat Bread",
        description: "Freshly baked whole wheat bread",
        price: 45,
        categoryId: categoryIds[2],
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
        stock: 30,
        unit: "loaf",
        featured: true,
        isActive: true,
      },
      {
        name: "Croissants",
        description: "Buttery French croissants",
        price: 150,
        categoryId: categoryIds[2],
        image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
        stock: 15,
        unit: "pack of 6",
        featured: false,
        discount: 15,
        isActive: true,
      },
      // Beverages
      {
        name: "Orange Juice",
        description: "100% pure orange juice",
        price: 110,
        categoryId: categoryIds[3],
        image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400",
        stock: 25,
        unit: "liter",
        featured: true,
        isActive: true,
      },
      {
        name: "Green Tea",
        description: "Premium green tea bags",
        price: 180,
        categoryId: categoryIds[3],
        image: "https://images.unsplash.com/photo-1597318181409-f6d2c0e7be39?w=400",
        stock: 20,
        unit: "pack of 25",
        featured: false,
        isActive: true,
      },
      // Snacks
      {
        name: "Mixed Nuts",
        description: "Roasted and salted mixed nuts",
        price: 250,
        categoryId: categoryIds[4],
        image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400",
        stock: 8,
        unit: "500g",
        featured: true,
        isActive: true,
      },
      {
        name: "Potato Chips",
        description: "Crispy salted potato chips",
        price: 40,
        categoryId: categoryIds[4],
        image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400",
        stock: 50,
        unit: "pack",
        featured: false,
        isActive: true,
      },
    ];

    for (const product of products) {
      await ctx.db.insert("products", product);
    }

    return {
      message: "Database seeded successfully!",
      categoriesCreated: categoryIds.length,
      productsCreated: products.length,
    };
  },
});
