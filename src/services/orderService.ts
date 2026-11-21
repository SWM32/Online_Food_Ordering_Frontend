import api from "./api";
import type {
  OrderRequest,
  OrderResponse,
  OrderStatus,
  OrderStatusUpdateRequest,
} from "../types";

export const orderService = {
  /**
   * POST /api/orders (Authenticated)
   * Converts all items in the user's cart into a new Order with status PLACED.
   */
  async placeOrder(data: OrderRequest): Promise<OrderResponse> {
    const response = await api.post<OrderResponse>("/orders", data);
    return response.data;
  },

  /**
   * GET /api/orders/my (Authenticated)
   * Returns all orders placed by the logged-in user, newest first.
   */
  async getMyOrders(): Promise<OrderResponse[]> {
    const response = await api.get<OrderResponse[]>("/orders/my");
    return response.data;
  },

  /**
   * GET /api/orders/{id} (Order Owner or ADMIN)
   * Returns a single order by ID.
   */
  async getOrderById(id: number): Promise<OrderResponse> {
    const response = await api.get<OrderResponse>(`/orders/${id}`);
    return response.data;
  },

  /**
   * PATCH /api/orders/{id}/cancel (Order Owner while PLACED, or ADMIN)
   * Cancels an order.
   */
  async cancelOrder(id: number): Promise<OrderResponse> {
    const response = await api.patch<OrderResponse>(`/orders/${id}/cancel`);
    return response.data;
  },

  /**
   * GET /api/orders?status={status} (ADMIN)
   * Lists all orders across the platform, optionally filtered by status.
   */
  async getAllOrders(status?: OrderStatus): Promise<OrderResponse[]> {
    const response = await api.get<OrderResponse[]>("/orders", {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  /**
   * PATCH /api/orders/{id}/status (ADMIN)
   * Updates the status of an order (PLACED, PREPARING, DELIVERED, CANCELLED).
   */
  async updateOrderStatus(
    id: number,
    data: OrderStatusUpdateRequest
  ): Promise<OrderResponse> {
    const response = await api.patch<OrderResponse>(
      `/orders/${id}/status`,
      data
    );
    return response.data;
  },
};
