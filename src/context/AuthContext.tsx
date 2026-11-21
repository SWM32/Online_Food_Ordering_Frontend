import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { TOKEN_STORAGE_KEY } from "../services/api";
import { authService } from "../services/authService";
import type { AuthRequest, RegisterRequest, UserResponse } from "../types";

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: AuthRequest) => Promise<UserResponse>;
  register: (data: RegisterRequest) => Promise<UserResponse>;
  logout: () => void;
  refreshUser: () => Promise<UserResponse | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<UserResponse | null> => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setToken(savedToken);
      return currentUser;
    } catch {
      // Token is invalid or expired
      logout();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Verify existing JWT token on startup
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = async (credentials: AuthRequest): Promise<UserResponse> => {
    const { token: jwtToken } = await authService.signIn(credentials);
    localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
    setToken(jwtToken);

    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      logout();
      throw error;
    }
  };

  const register = async (data: RegisterRequest): Promise<UserResponse> => {
    return await authService.signUp(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isAdmin: user?.role === "ADMIN",
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
