/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { cartService } from "../services/cartService";
import type { CartItemRequest, CartResponse } from "../types";

interface CartContextType {
  cart: CartResponse | null;
  itemCount: number;
  isLoading: boolean;
  refreshCart: () => Promise<CartResponse | null>;
  addToCart: (data: CartItemRequest) => Promise<CartResponse>;
  updateQuantity: (foodItemId: number, quantity: number) => Promise<CartResponse>;
  removeItem: (foodItemId: number) => Promise<CartResponse>;
  clearCart: () => Promise<CartResponse>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshCart = useCallback(async (): Promise<CartResponse | null> => {
    await Promise.resolve();
    if (!isAuthenticated) {
      setCart(null);
      return null;
    }

    setIsLoading(true);
    try {
      const data = await cartService.getCart();
      setCart(data);
      return data;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshCart();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshCart]);

  const addToCart = useCallback(
    async (data: CartItemRequest): Promise<CartResponse> => {
      const updated = await cartService.addItemToCart(data);
      setCart(updated);
      return updated;
    },
    []
  );

  const updateQuantity = useCallback(
    async (foodItemId: number, quantity: number): Promise<CartResponse> => {
      const updated = await cartService.updateItemQuantity(
        foodItemId,
        quantity
      );
      setCart(updated);
      return updated;
    },
    []
  );

  const removeItem = useCallback(
    async (foodItemId: number): Promise<CartResponse> => {
      const updated = await cartService.removeItemFromCart(foodItemId);
      setCart(updated);
      return updated;
    },
    []
  );

  const clearCart = useCallback(async (): Promise<CartResponse> => {
    const updated = await cartService.clearCart();
    setCart(updated);
    return updated;
  }, []);

  const itemCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isLoading,
        refreshCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
