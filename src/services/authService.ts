import api from "./api";
import type {
  AuthRequest,
  AuthResponse,
  RegisterRequest,
  UserResponse,
} from "../types";

export const authService = {
  /**
   * POST /api/auth/signup
   * Registers a new user and automatically creates an empty shopping cart for them.
   */
  async signUp(data: RegisterRequest): Promise<UserResponse> {
    const response = await api.post<UserResponse>("/auth/signup", data);
    return response.data;
  },

  /**
   * POST /api/auth/signin
   * Authenticates user credentials and returns a JWT token.
   */
  async signIn(data: AuthRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/signin", data);
    return response.data;
  },

  /**
   * GET /api/users/me
   * Returns the profile (id, email, role) of the currently logged-in user.
   */
  async getCurrentUser(): Promise<UserResponse> {
    const response = await api.get<UserResponse>("/users/me");
    return response.data;
  },
};
