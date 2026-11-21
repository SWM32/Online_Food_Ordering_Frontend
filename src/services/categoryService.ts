import api from "./api";
import type { CategoryRequest, CategoryResponse } from "../types";

export const categoryService = {
  /**
   * GET /api/categories (Public)
   * Returns all categories.
   */
  async getAllCategories(): Promise<CategoryResponse[]> {
    const response = await api.get<CategoryResponse[]>("/categories");
    return response.data;
  },

  /**
   * GET /api/categories/{id} (Public)
   * Returns a single category by ID.
   */
  async getCategoryById(id: number): Promise<CategoryResponse> {
    const response = await api.get<CategoryResponse>(`/categories/${id}`);
    return response.data;
  },

  /**
   * POST /api/categories (ADMIN)
   * Creates a new category.
   */
  async createCategory(data: CategoryRequest): Promise<CategoryResponse> {
    const response = await api.post<CategoryResponse>("/categories", data);
    return response.data;
  },

  /**
   * PUT /api/categories/{id} (ADMIN)
   * Updates an existing category.
   */
  async updateCategory(
    id: number,
    data: CategoryRequest
  ): Promise<CategoryResponse> {
    const response = await api.put<CategoryResponse>(`/categories/${id}`, data);
    return response.data;
  },

  /**
   * DELETE /api/categories/{id} (ADMIN)
   * Deletes a category by ID.
   */
  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
