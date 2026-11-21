# Online Food Ordering System — Frontend

A responsive React + TypeScript frontend application built for **Food Ordering Platform**. It integrates with the Spring Boot **Online Food Ordering System** REST API using JWT authentication, role-based access control (`CUSTOMER` and `ADMIN`), shopping cart management, order processing, and payment tracking.

---

## Tech Stack

- **Framework:** React 19 + TypeScript (`~6.0`)
- **Build Tool:** Vite 8
- **Routing:** React Router v7 (`react-router-dom`)
- **HTTP Client:** Axios (with JWT `Bearer` request interceptor & centralized error parsing)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) & Context API (`AuthContext`, `CartContext`)

---

## Features

### 1. Authentication & Role-Based Access
- **Sign-Up (`/register`) & Sign-In (`/login`):** Client-side form validation (email format, password length, password confirmation, role selection) and backend validation/error handling (`401 Unauthorized`, `409 Conflict`).
- **JWT Session Management:** Persists JWT token in `localStorage` (`jwt_token`), attaches `Authorization: Bearer <token>` on every API request, and verifies active user sessions on startup via `GET /api/users/me`.
- **Protected Routes:** Role-based route guards (`ProtectedRoute`) protecting authenticated customer views (`/cart`, `/orders`, `/profile`) and admin views (`/admin`).

### 2. Public Food Menu & Discovery (`/`)
- **Browse Menu:** Publicly accessible menu grid displaying food images, category badges, descriptions, prices (`Rs.`), and real-time stock status (`AVAILABLE` / `OUT_OF_STOCK`).
- **Category Filtering:** Filter dishes by category (`GET /api/categories` and `GET /api/foods/category/{categoryId}`).
- **Keyword Search:** Live debounced search and search submission (`GET /api/foods/search?keyword={keyword}`).
- **Availability & Sorting:** Toggle **"Available only"** (`GET /api/foods/available`) and sort dishes by Recommended, Price (Low to High / High to Low), or Name (A–Z).
- **Quick Add to Cart:** Select quantity directly on any available food card and add it to the cart (`POST /api/cart/items`).

### 3. Shopping Cart & Checkout (`/cart`)
- **Live Cart Sync (`CartContext`):** Real-time item count badge in the navigation bar.
- **Cart Management:** Increment/decrement item quantities (`PUT /api/cart/items/{foodItemId}?quantity={quantity}`), remove individual items (`DELETE /api/cart/items/{foodItemId}`), or clear the entire cart (`DELETE /api/cart`).
- **Order Placement:** Enter a delivery address and convert the cart into a new order (`POST /api/orders`), followed by an immediate option to pay or track the order.

### 4. Order Tracking & Payments (`/orders`)
- **Order History & Progress Stepper:** View customer orders (`GET /api/orders/my`), filter by status (`ALL`, `PLACED`, `PREPARING`, `DELIVERED`, `CANCELLED`), and track progress across a 3-step visual progress bar.
- **Order Cancellation:** Cancel orders while their status is `PLACED` (`PATCH /api/orders/{id}/cancel`).
- **Payment Processing (`PaymentModal`):** Pay for orders via `POST /api/payments` using **Credit / Debit Card (`CARD`)**, **Online Transfer (`ONLINE`)**, or **Cash on Delivery (`CASH_ON_DELIVERY`)**, and view formatted payment receipts (`GET /api/payments/order/{orderId}`).

### 5. User Profile (`/profile`)
- View current user account details (`GET /api/users/me`), order statistics (Total, Active, Delivered, Total Ordered), current shopping cart summary, and recent orders.

### 6. Admin Dashboard (`/admin`)
- **KPI Overview:** Real-time metrics for total food items, categories, active orders, completed revenue, and registered users.
- **Food Items Management:** Create, edit, and delete food items (`POST /api/foods`, `PUT /api/foods/{id}`, `DELETE /api/foods/{id}`), set food images via direct URL or **Choose Image from PC** (saved directly to `public/images/<filename>` and stored as `/images/<filename>` in the database), and toggle stock status (`PATCH /api/foods/{id}/status`).
- **Categories Management:** Create, edit, and delete menu categories (`POST /api/categories`, `PUT /api/categories/{id}`, `DELETE /api/categories/{id}`).
- **Orders Management:** View all platform orders (`GET /api/orders?status={status}`) and update order statuses (`PATCH /api/orders/{id}/status` — `PLACED` → `PREPARING` → `DELIVERED` / `CANCELLED`).
- **Payments Management:** View all payments (`GET /api/payments`) and update payment statuses (`PATCH /api/payments/{id}/status`).
- **Users Management:** View all registered users (`GET /api/users`) and delete user accounts (`DELETE /api/users/{id}`).

---

## Project Structure

```text
cw3-front/
├── backend-info/
│   ├── FRONTEND_API_SPEC.md     # Complete backend REST API specification
│   └── FOOD_IMAGE_UPDATE.md     # FoodItem imageUrl column & DTO specification
├── public/
│   └── images/                  # Local food images selected from PC via Admin panel
├── src/
│   ├── components/
│   │   ├── Login.tsx            # Sign-In page component
│   │   ├── Register.tsx         # Sign-Up page component
│   │   ├── ProtectedRoute.tsx   # Authentication & role-based route guard
│   │   └── PaymentModal.tsx     # Payment checkout & receipt modal
│   ├── context/
│   │   ├── AuthContext.tsx      # JWT authentication & user session state
│   │   └── CartContext.tsx      # Shopping cart state & live item count
│   ├── pages/
│   │   ├── Home.tsx             # Public menu browsing, search & category filters
│   │   ├── Cart.tsx             # Shopping cart management & order checkout
│   │   ├── Orders.tsx           # Customer order tracking & payment triggers
│   │   ├── Profile.tsx          # Authenticated user profile & activity summary
│   │   └── AdminDashboard.tsx   # Admin control panel (Foods, Categories, Orders, Payments, Users)
│   ├── services/
│   │   ├── api.ts               # Axios instance, JWT interceptor & error parser
│   │   ├── authService.ts       # /api/auth & /api/users/me endpoints
│   │   ├── categoryService.ts   # /api/categories endpoints
│   │   ├── foodService.ts       # /api/foods endpoints
│   │   ├── cartService.ts       # /api/cart endpoints
│   │   ├── orderService.ts      # /api/orders endpoints
│   │   ├── paymentService.ts    # /api/payments endpoints
│   │   └── userService.ts       # /api/users endpoints
│   ├── types/
│   │   └── index.ts             # TypeScript DTO interfaces & union types
│   ├── App.tsx                  # Main layout, navigation bar & route configuration
│   ├── main.tsx                 # React DOM entry point
│   └── index.css                # Tailwind CSS entry point
├── package.json
├── tsconfig.json
└── vite.config.ts               # Vite configuration + local PC image saver middleware
```

---

## Getting Started

### Prerequisites
1. **Node.js** (v18+ recommended) and **npm**
2. **Spring Boot Backend** running on `http://localhost:8080`

### Installation & Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite development server (http://localhost:5173)
npm run dev
```

### Build & Lint Verification

```bash
# Run ESLint check
npm run lint

# Type-check and build production bundle
npm run build

# Preview production build
npm run preview
```

---

## Application Routes

| Path | Access | Component | Description |
| :--- | :--- | :--- | :--- |
| `/` | Public | `Home` | Browse food menu, filter by category/availability, search by keyword, add to cart |
| `/login` | Public | `Login` | Sign in with email and password |
| `/register` | Public | `Register` | Register a new `CUSTOMER` or `ADMIN` account |
| `/cart` | Authenticated | `Cart` | View cart items, adjust quantities, remove items, and place an order |
| `/orders` | Authenticated | `Orders` | Track order status, cancel `PLACED` orders, process payments, and view receipts |
| `/profile` | Authenticated | `Profile` | View user profile, order statistics, and recent activity |
| `/admin` | `ADMIN` only | `AdminDashboard` | Manage food items, categories, platform orders, payments, and users |
