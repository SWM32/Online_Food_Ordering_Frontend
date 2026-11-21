// ==========================================
// 1. Enums / Union Types
// ==========================================

export type Role = "ADMIN" | "CUSTOMER";

export type FoodStatus = "AVAILABLE" | "OUT_OF_STOCK";

export type OrderStatus = "PLACED" | "PREPARING" | "DELIVERED" | "CANCELLED";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

// ==========================================
// 2. Auth & User DTOs
// ==========================================

export interface RegisterRequest {
  email: string;
  password: string;
  role?: Role;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface UserResponse {
  id: number;
  email: string;
  role: Role;
}

// ==========================================
// 3. Category DTOs
// ==========================================

export interface CategoryRequest {
  name: string;
  description?: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
}

// ==========================================
// 4. Food Item DTOs
// ==========================================

export interface FoodItemRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  status?: FoodStatus;
  categoryId: number;
}

export interface FoodItemResponse {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  status: FoodStatus;
  categoryId: number;
  categoryName: string;
}

// ==========================================
// 5. Shopping Cart DTOs
// ==========================================

export interface CartItemRequest {
  foodItemId: number;
  quantity: number;
}

export interface CartItemResponse {
  id: number;
  foodItemId: number;
  foodItemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  id: number;
  userId: number;
  items: CartItemResponse[];
  totalAmount: number;
}

// ==========================================
// 6. Order DTOs
// ==========================================

export interface OrderRequest {
  deliveryAddress: string;
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus;
}

export interface OrderItemResponse {
  id: number;
  foodItemId: number;
  foodItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  userId: number;
  userEmail: string;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress: string;
  items: OrderItemResponse[];
  paymentStatus: PaymentStatus | null;
}

// ==========================================
// 7. Payment DTOs
// ==========================================

export interface PaymentRequest {
  orderId: number;
  paymentMethod: string;
  transactionRef?: string;
}

export interface PaymentStatusUpdateRequest {
  status: PaymentStatus;
}

export interface PaymentResponse {
  id: number;
  orderId: number;
  amount: number;
  paymentMethod: string;
  status: PaymentStatus;
  transactionRef: string;
  paymentDate: string;
}

// ==========================================
// 8. Standard Error Response DTO
// ==========================================

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string>;
}
