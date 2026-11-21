import api from "./api";
import type { CartItemRequest, CartResponse } from "../types";

export const cartService = {
  /**
   * GET /api/cart (Authenticated)
   * Fetches the currently authenticated user's cart.
   */
  async getCart(): Promise<CartResponse> {
    const response = await api.get<CartResponse>("/cart");
    return response.data;
  },

  /**
   * POST /api/cart/items (Authenticated)
   * Adds a food item to the cart or increments its quantity.
   */
  async addItemToCart(data: CartItemRequest): Promise<CartResponse> {
    const response = await api.post<CartResponse>("/cart/items", data);
    return response.data;
  },

  /**
   * PUT /api/cart/items/{foodItemId}?quantity={quantity} (Authenticated)
   * Updates the quantity of an item in the cart (quantity=0 removes it).
   */
  async updateItemQuantity(
    foodItemId: number,
    quantity: number
  ): Promise<CartResponse> {
    const response = await api.put<CartResponse>(
      `/cart/items/${foodItemId}`,
      null,
      { params: { quantity } }
    );
    return response.data;
  },

  /**
   * DELETE /api/cart/items/{foodItemId} (Authenticated)
   * Removes a specific food item from the cart.
   */
  async removeItemFromCart(foodItemId: number): Promise<CartResponse> {
    const response = await api.delete<CartResponse>(
      `/cart/items/${foodItemId}`
    );
    return response.data;
  },

  /**
   * DELETE /api/cart (Authenticated)
   * Clears all items from the user's cart.
   */
  async clearCart(): Promise<CartResponse> {
    const response = await api.delete<CartResponse>("/cart");
    return response.data;
  },
};
