import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { orderService } from "../services/orderService";
import { parseApiError } from "../services/api";
import PaymentModal from "../components/PaymentModal";
import type { OrderResponse } from "../types";

export default function Cart() {
  const {
    cart,
    itemCount,
    isLoading,
    refreshCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const [busyFoodId, setBusyFoodId] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Checkout state
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderResponse | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Feedback banner
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleQuantityChange = async (foodItemId: number, newQuantity: number) => {
    setErrorBanner(null);
    setBusyFoodId(foodItemId);
    try {
      await updateQuantity(foodItemId, Math.max(0, newQuantity));
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorBanner(parsed.message);
    } finally {
      setBusyFoodId(null);
    }
  };

  const handleRemoveItem = async (foodItemId: number) => {
    setErrorBanner(null);
    setBusyFoodId(foodItemId);
    try {
      await removeItem(foodItemId);
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorBanner(parsed.message);
    } finally {
      setBusyFoodId(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("Remove all items from your shopping cart?")) {
      return;
    }
    setErrorBanner(null);
    setIsClearing(true);
    try {
      await clearCart();
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorBanner(parsed.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handlePlaceOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddressError(null);
    setErrorBanner(null);

    const trimmedAddress = deliveryAddress.trim();
    if (!trimmedAddress) {
      setAddressError("Please enter your delivery address.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const order = await orderService.placeOrder({
        deliveryAddress: trimmedAddress,
      });
      setPlacedOrder(order);
      setDeliveryAddress("");
      await refreshCart();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.validationErrors?.deliveryAddress) {
        setAddressError(parsed.validationErrors.deliveryAddress);
      } else {
        setErrorBanner(parsed.message);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (isLoading && !cart) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <span className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading your cart...</span>
        </div>
      </div>
    );
  }

  // Order Confirmation View right after placing an order
  if (placedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
            <svg
              className="w-9 h-9"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            Order #{placedOrder.id} &bull; {placedOrder.status}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            Order Placed Successfully!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your order has been received and will be delivered to:
          </p>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            {placedOrder.deliveryAddress}
          </p>

          {/* Items Summary */}
          <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-4 text-left space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Order Summary
            </p>
            {placedOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-700">
                  <strong>{item.quantity}×</strong> {item.foodItemName}
                </span>
                <span className="font-semibold text-slate-900">
                  Rs.{" "}
                  {item.subtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-base font-extrabold text-slate-900">
              <span>Total Amount</span>
              <span>
                Rs.{" "}
                {placedOrder.totalAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            {placedOrder.paymentStatus === null ? (
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition cursor-pointer"
              >
                Pay Now
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition cursor-pointer"
              >
                View Payment Receipt ({placedOrder.paymentStatus})
              </button>
            )}
            <Link
              to="/orders"
              onClick={() => setPlacedOrder(null)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
            >
              Track in My Orders
            </Link>
            <Link
              to="/"
              onClick={() => setPlacedOrder(null)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 text-sm font-medium transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {isPaymentModalOpen && (
          <PaymentModal
            order={placedOrder}
            onClose={() => setIsPaymentModalOpen(false)}
            onPaymentSuccess={(payment) =>
              setPlacedOrder((prev) =>
                prev ? { ...prev, paymentStatus: payment.status } : prev
              )
            }
          />
        )}
      </div>
    );
  }

  const items = cart?.items ?? [];
  const totalAmount = cart?.totalAmount ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Your Shopping Cart
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {itemCount === 0
                ? "Your cart is currently empty"
                : `You have ${itemCount} ${
                    itemCount === 1 ? "item" : "items"
                  } in your cart`}
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => void handleClearCart()}
              disabled={isClearing}
              className="self-start sm:self-auto px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-xs font-semibold text-red-600 transition cursor-pointer disabled:opacity-50"
            >
              {isClearing ? "Clearing..." : "Clear Entire Cart"}
            </button>
          )}
        </div>

        {/* Error Alert Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between gap-3"
          >
            <span>{errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Empty Cart State */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Your cart is empty
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Looks like you haven&apos;t added any dishes yet. Explore our menu
              and add your favorite food items!
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition"
            >
              Browse Food Menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const isBusy = busyFoodId === item.foodItemId;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold text-base">
                        {item.quantity}×
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {item.foodItemName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Unit Price: Rs.{" "}
                          {item.unitPrice.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void handleQuantityChange(
                              item.foodItemId,
                              item.quantity - 1
                            )
                          }
                          className="w-8 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          &minus;
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void handleQuantityChange(
                              item.foodItemId,
                              item.quantity + 1
                            )
                          }
                          className="w-8 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Item Subtotal */}
                      <div className="text-right min-w-[6.5rem]">
                        <p className="text-xs text-slate-400">Subtotal</p>
                        <p className="text-sm font-extrabold text-slate-900">
                          Rs.{" "}
                          {item.subtotal.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      {/* Remove Item Button */}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleRemoveItem(item.foodItemId)}
                        title="Remove item from cart"
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-40"
                        aria-label={`Remove ${item.foodItemName}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  &larr; Add more items from the menu
                </Link>
              </div>
            </div>

            {/* Order Summary & Checkout Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 pb-4 border-b border-slate-100">
                Order Summary
              </h2>

              <div className="space-y-3 py-4 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Items ({itemCount})</span>
                  <span className="font-semibold text-slate-900">
                    Rs.{" "}
                    {totalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Delivery Charge</span>
                  <span className="text-emerald-600 font-semibold">Free</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-base font-extrabold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-orange-600">
                    Rs.{" "}
                    {totalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Checkout Form (POST /api/orders) */}
              <form
                onSubmit={handlePlaceOrder}
                noValidate
                className="mt-2 pt-4 border-t border-slate-100 space-y-4"
              >
                <div>
                  <label
                    htmlFor="delivery-address"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Delivery Address *
                  </label>
                  <textarea
                    id="delivery-address"
                    rows={3}
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      if (addressError) setAddressError(null);
                    }}
                    placeholder="e.g. 123 Galle Road, Colombo 03"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                      addressError
                        ? "border-red-400 focus:ring-red-200"
                        : "border-slate-300 focus:border-orange-500 focus:ring-orange-100"
                    }`}
                  />
                  {addressError && (
                    <p className="mt-1 text-xs text-red-600">{addressError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPlacingOrder || items.length === 0}
                  className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isPlacingOrder ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
