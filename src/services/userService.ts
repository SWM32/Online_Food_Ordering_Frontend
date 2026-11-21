import api from "./api";
import type { UserResponse } from "../types";

export const userService = {
  /**
   * GET /api/users/me (Authenticated)
   * Returns the profile of the currently logged-in user.
   */
  async getCurrentUser(): Promise<UserResponse> {
    const response = await api.get<UserResponse>("/users/me");
    return response.data;
  },

  /**
   * GET /api/users (ADMIN)
   * Lists all users in the system.
   */
  async getAllUsers(): Promise<UserResponse[]> {
    const response = await api.get<UserResponse[]>("/users");
    return response.data;
  },

  /**
   * GET /api/users/{id} (ADMIN)
   * Gets a single user by ID.
   */
  async getUserById(id: number): Promise<UserResponse> {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  /**
   * DELETE /api/users/{id} (ADMIN)
   * Deletes a user by ID.
   */
  async deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
