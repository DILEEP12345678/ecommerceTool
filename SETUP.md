# Grocery Store Setup Guide

This guide will walk you through setting up the complete online groceries store with customer mobile app and admin dashboard.

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** and npm installed
- **Git** installed
- **Expo CLI**: `npm install -g expo-cli`
- **Convex account** (free): https://convex.dev
- **iOS Simulator** (Mac) or **Android Emulator** for testing mobile app

## Step-by-Step Setup

### 1. Clone/Download the Project

If you haven't already, navigate to the project directory:
```bash
cd grocery-store
```

### 2. Setup Convex Backend

The backend is shared between both the customer app and admin dashboard.

```bash
# Install Convex CLI globally
npm install -g convex

# Initialize Convex (run from project root)
cd grocery-store
npx convex dev
```

This will:
- Prompt you to login/signup to Convex
- Create a new project
- Generate a deployment URL (looks like: `https://your-project.convex.cloud`)
- Start watching for changes

**Important:** Copy the Convex deployment URL - you'll need it for both apps!

#### Seed Sample Data

Once Convex is running, open a new terminal and run:

```bash
# In the Convex dashboard or using the CLI
npx convex run seed:seedData
```

This will populate your database with:
- 5 categories (Fruits & Vegetables, Dairy & Eggs, Bakery, Beverages, Snacks)
- 12 sample products with images and realistic data

### 3. Setup Customer Mobile App (Expo)

```bash
# Navigate to customer app
cd customer-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` and add your Convex URL:
```
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

#### Start the Customer App

```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code in the terminal
- Open Expo DevTools in your browser

**To run on iOS Simulator:**
```bash
npm run ios
```

**To run on Android Emulator:**
```bash
npm run android
```

**To test on your physical device:**
- Install "Expo Go" app from App Store/Play Store
- Scan the QR code shown in terminal

### 4. Setup Admin Dashboard (Next.js)

Open a new terminal window:

```bash
# Navigate to admin dashboard
cd admin-dashboard

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

Edit `.env.local` and add your Convex URL:
```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

#### Start the Admin Dashboard

```bash
npm run dev
```

Visit: http://localhost:3000

## Project Structure Overview

```
grocery-store/
├── convex/                      # Shared backend
│   ├── schema.ts               # Database schema
│   ├── products.ts             # Product operations
│   ├── categories.ts           # Category operations
│   ├── cart.ts                 # Cart management
│   ├── orders.ts               # Order processing
│   ├── users.ts                # User management
│   └── seed.ts                 # Sample data seeder
│
├── customer-app/               # React Native mobile app
│   ├── app/                    # Expo Router pages
│   │   ├── (tabs)/            # Bottom tab navigation
│   │   │   ├── index.tsx      # Home/Browse
│   │   │   ├── categories.tsx # Categories
│   │   │   ├── cart.tsx       # Shopping cart
│   │   │   ├── orders.tsx     # Order history
│   │   │   └── profile.tsx    # User profile
│   │   └── _layout.tsx        # Root layout
│   ├── lib/                   # Utilities
│   └── package.json
│
└── admin-dashboard/           # Next.js admin panel
    ├── app/                   # Next.js 14 App Router
    │   ├── page.tsx          # Dashboard home
    │   ├── products/         # Product management
    │   ├── categories/       # Category management
    │   ├── orders/           # Order management
    │   └── layout.tsx        # Root layout
    └── package.json
```

## Development Workflow

1. **Start Convex** (if not running):
   ```bash
   npx convex dev
   ```

2. **Start Customer App**:
   ```bash
   cd customer-app && npm start
   ```

3. **Start Admin Dashboard**:
   ```bash
   cd admin-dashboard && npm run dev
   ```

## Features Implemented

### Customer App ✓
- ✅ Browse products with featured items
- ✅ Category-based browsing
- ✅ Search functionality
- ✅ Shopping cart management
- ✅ Real-time updates
- ⏳ Order placement (coming soon)
- ⏳ Order history (coming soon)
- ⏳ User authentication (coming soon)

### Admin Dashboard ✓
- ✅ Analytics dashboard
- ✅ Product management (view, add, edit, delete)
- ✅ Category management
- ✅ Order tracking
- ✅ Low stock alerts
- ✅ Order status management
- ⏳ Customer management (coming soon)
- ⏳ Reports & analytics (coming soon)

## Next Steps

### Immediate Improvements

1. **Add Authentication**
   - Sign up for Clerk (https://clerk.dev)
   - Add API keys to `.env` files
   - Uncomment authentication code in layouts

2. **Complete Order Flow**
   - Implement checkout screen
   - Add payment integration (Stripe)
   - Create order confirmation

3. **Add Image Upload**
   - Use Convex file storage
   - Allow admins to upload product images
   - Handle multiple product images

### Advanced Features

4. **Push Notifications**
   - Order status updates
   - Special offers
   - Low stock alerts for users

5. **Delivery Tracking**
   - Real-time delivery status
   - Map integration
   - Delivery person details

6. **Reviews & Ratings**
   - Product reviews
   - Rating system
   - Review moderation

7. **Promotions**
   - Coupon codes
   - Flash sales
   - Bundle offers

## Troubleshooting

### Convex not connecting
- Check that `npx convex dev` is running
- Verify the CONVEX_URL in `.env` files
- Try restarting the dev server

### Mobile app not loading
- Clear Expo cache: `expo start -c`
- Check network connection
- Verify you're on the same network as your computer

### Admin dashboard blank page
- Check browser console for errors
- Verify Next.js is running on port 3000
- Clear browser cache

### Database not seeding
- Ensure Convex dev is running
- Check for errors in terminal
- Try running seed command again

## Support

For issues or questions:
1. Check the Convex docs: https://docs.convex.dev
2. Expo documentation: https://docs.expo.dev
3. Next.js documentation: https://nextjs.org/docs

## License

MIT License - feel free to use this for your own projects!
