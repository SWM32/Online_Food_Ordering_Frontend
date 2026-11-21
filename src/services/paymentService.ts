import api from "./api";
import type {
  PaymentRequest,
  PaymentResponse,
  PaymentStatusUpdateRequest,
} from "../types";

export const paymentService = {
  /**
   * POST /api/payments (Order Owner or ADMIN)
   * Processes payment for an order.
   */
  async processPayment(data: PaymentRequest): Promise<PaymentResponse> {
    const response = await api.post<PaymentResponse>("/payments", data);
    return response.data;
  },

  /**
   * GET /api/payments/{id} (Order Owner or ADMIN)
   * Returns a payment by its Payment ID.
   */
  async getPaymentById(id: number): Promise<PaymentResponse> {
    const response = await api.get<PaymentResponse>(`/payments/${id}`);
    return response.data;
  },

  /**
   * GET /api/payments/order/{orderId} (Order Owner or ADMIN)
   * Returns the payment associated with a specific Order ID.
   */
  async getPaymentByOrderId(orderId: number): Promise<PaymentResponse> {
    const response = await api.get<PaymentResponse>(
      `/payments/order/${orderId}`
    );
    return response.data;
  },

  /**
   * GET /api/payments (ADMIN)
   * Lists all payments in the system.
   */
  async getAllPayments(): Promise<PaymentResponse[]> {
    const response = await api.get<PaymentResponse[]>("/payments");
    return response.data;
  },

  /**
   * PATCH /api/payments/{id}/status (ADMIN)
   * Updates the status of a payment (PENDING, COMPLETED, FAILED).
   */
  async updatePaymentStatus(
    id: number,
    data: PaymentStatusUpdateRequest
  ): Promise<PaymentResponse> {
    const response = await api.patch<PaymentResponse>(
      `/payments/${id}/status`,
      data
    );
    return response.data;
  },
};
