import api from "./api";
import type { FoodItemRequest, FoodItemResponse, FoodStatus } from "../types";

export const foodService = {
  /**
   * GET /api/foods (Public)
   * Returns all food items across all categories.
   */
  async getAllFoods(): Promise<FoodItemResponse[]> {
    const response = await api.get<FoodItemResponse[]>("/foods");
    return response.data;
  },

  /**
   * GET /api/foods/available (Public)
   * Returns only food items where status == "AVAILABLE".
   */
  async getAvailableFoods(): Promise<FoodItemResponse[]> {
    const response = await api.get<FoodItemResponse[]>("/foods/available");
    return response.data;
  },

  /**
   * GET /api/foods/category/{categoryId} (Public)
   * Returns food items belonging to a specific category.
   */
  async getFoodsByCategory(categoryId: number): Promise<FoodItemResponse[]> {
    const response = await api.get<FoodItemResponse[]>(
      `/foods/category/${categoryId}`
    );
    return response.data;
  },

  /**
   * GET /api/foods/search?keyword={keyword} (Public)
   * Case-insensitive partial match on food name.
   */
  async searchFoods(keyword: string): Promise<FoodItemResponse[]> {
    const response = await api.get<FoodItemResponse[]>("/foods/search", {
      params: { keyword },
    });
    return response.data;
  },

  /**
   * GET /api/foods/{id} (Public)
   * Returns a single food item by ID.
   */
  async getFoodById(id: number): Promise<FoodItemResponse> {
    const response = await api.get<FoodItemResponse>(`/foods/${id}`);
    return response.data;
  },

  /**
   * POST /api/foods (ADMIN)
   * Creates a new food item.
   */
  async createFood(data: FoodItemRequest): Promise<FoodItemResponse> {
    const response = await api.post<FoodItemResponse>("/foods", data);
    return response.data;
  },

  /**
   * PUT /api/foods/{id} (ADMIN)
   * Updates an existing food item.
   */
  async updateFood(
    id: number,
    data: FoodItemRequest
  ): Promise<FoodItemResponse> {
    const response = await api.put<FoodItemResponse>(`/foods/${id}`, data);
    return response.data;
  },

  /**
   * PATCH /api/foods/{id}/status?status={status} (ADMIN)
   * Updates availability status of a food item.
   */
  async updateFoodStatus(
    id: number,
    status: FoodStatus
  ): Promise<FoodItemResponse> {
    const response = await api.patch<FoodItemResponse>(
      `/foods/${id}/status`,
      null,
      { params: { status } }
    );
    return response.data;
  },

  /**
   * DELETE /api/foods/{id} (ADMIN)
   * Deletes a food item by ID.
   */
  async deleteFood(id: number): Promise<void> {
    await api.delete(`/foods/${id}`);
  },
};
