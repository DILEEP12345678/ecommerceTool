# Online Groceries Store

A full-stack online groceries marketplace with separate customer mobile app and admin web dashboard.

## Tech Stack

- **Customer App**: React Native (Expo)
- **Admin Dashboard**: Next.js 14 (App Router)
- **Backend**: Convex (Real-time Database & API)
- **Authentication**: Convex Auth
- **Payment**: Stripe (ready to integrate)

## Project Structure

```
grocery-store/
├── customer-app/          # Expo React Native mobile app
├── admin-dashboard/       # Next.js admin web interface
└── convex/               # Convex backend (shared)
```

## Features

### Customer App
- Browse products by category
- Search functionality
- Shopping cart management
- Order placement
- Order history
- User authentication
- Real-time inventory updates

### Admin Dashboard
- Product management (CRUD)
- Category management
- Order management & tracking
- Inventory control
- Analytics dashboard
- Customer management

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- Convex account (free): https://convex.dev

### 1. Setup Convex Backend

```bash
# Install Convex CLI
npm install -g convex

# Initialize Convex (run from project root)
npx convex dev

# This will:
# - Create a new Convex project
# - Generate deployment URL
# - Set up authentication
```

### 2. Setup Customer App (Expo)

```bash
cd customer-app
npm install

# Create .env file
echo "EXPO_PUBLIC_CONVEX_URL=<your-convex-url>" > .env

# Start development
npm start
# Or for specific platform:
npm run ios
npm run android
```

### 3. Setup Admin Dashboard (Next.js)

```bash
cd admin-dashboard
npm install

# Create .env.local file
echo "NEXT_PUBLIC_CONVEX_URL=<your-convex-url>" > .env.local

# Start development
npm run dev
```

Visit http://localhost:3000

## Environment Variables

### Customer App (.env)
```
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Admin Dashboard (.env.local)
```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

## Development Workflow

1. **Convex functions** are shared between both apps
2. Start Convex dev: `npx convex dev` (in project root)
3. Start customer app: `cd customer-app && npm start`
4. Start admin dashboard: `cd admin-dashboard && npm run dev`

## Database Schema

### Products
- id, name, description, price, category, image, stock, featured

### Categories
- id, name, description, image, displayOrder

### Orders
- id, userId, items, total, status, deliveryAddress, createdAt

### Users
- id, email, name, role (customer/admin), phone, addresses

## Deployment

### Convex
- Automatically deploys on git push (configure in Convex dashboard)

### Customer App
- Build: `cd customer-app && eas build`
- Submit to App Store/Play Store via EAS

### Admin Dashboard
- Deploy to Vercel: `cd admin-dashboard && vercel`
- Or use Vercel GitHub integration

## Next Steps

1. Add payment integration (Stripe)
2. Implement push notifications
3. Add delivery tracking
4. Integrate maps for delivery
5. Add product reviews
6. Implement promotional codes

## License

MIT
