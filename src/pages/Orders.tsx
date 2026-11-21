import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { orderService } from "../services/orderService";
import { parseApiError } from "../services/api";
import PaymentModal from "../components/PaymentModal";
import type { OrderResponse, OrderStatus, PaymentResponse } from "../types";

const PROGRESS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PLACED", label: "Order Placed" },
  { status: "PREPARING", label: "Preparing Food" },
  { status: "DELIVERED", label: "Delivered" },
];

function getStepIndex(status: OrderStatus): number {
  if (status === "PLACED") return 0;
  if (status === "PREPARING") return 1;
  if (status === "DELIVERED") return 2;
  return -1;
}

export default function Orders() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [activePaymentOrder, setActivePaymentOrder] =
    useState<OrderResponse | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadOrders = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const handleCancelOrder = async (order: OrderResponse) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel Order #${order.id}?`
      )
    ) {
      return;
    }

    setCancellingId(order.id);
    try {
      const updated = await orderService.cancelOrder(order.id);
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
      setToast({
        type: "success",
        message: `Order #${order.id} has been cancelled.`,
      });
    } catch (err) {
      const parsed = parseApiError(err);
      setToast({
        type: "error",
        message: parsed.message,
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handlePaymentSuccess = (payment: PaymentResponse) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === payment.orderId ? { ...o, paymentStatus: payment.status } : o
      )
    );
    setActivePaymentOrder((prev) =>
      prev && prev.id === payment.orderId
        ? { ...prev, paymentStatus: payment.status }
        : prev
    );
    setToast({
      type: "success",
      message: `Payment recorded for Order #${payment.orderId} (${payment.transactionRef}).`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <div
            className={`rounded-2xl shadow-lg border px-4 py-3 flex items-center gap-3 text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-red-600 border-red-500 text-white"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/80 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              My Orders &amp; Tracking
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Track your live order status, manage payments, and view past
              receipts.
            </p>
          </div>
          <button
            onClick={() => void loadOrders()}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
          >
            Refresh Orders
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
          {(
            ["ALL", "PLACED", "PREPARING", "DELIVERED", "CANCELLED"] as const
          ).map((st) => {
            const count =
              st === "ALL"
                ? orders.length
                : orders.filter((o) => o.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? "bg-orange-600 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center my-6">
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <button
              onClick={() => void loadOrders()}
              className="mt-3 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-pulse"
              >
                <div className="h-5 w-1/3 bg-slate-200 rounded" />
                <div className="h-12 w-full bg-slate-100 rounded-xl" />
                <div className="h-16 w-full bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {statusFilter === "ALL"
                ? "You haven't placed any orders yet"
                : `No ${statusFilter.toLowerCase()} orders`}
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Browse our food menu, add items to your cart, and place your first
              order!
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition"
            >
              Explore Food Menu
            </Link>
          </div>
        )}

        {/* Orders List */}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const currentStep = getStepIndex(order.status);
              const isCancelled = order.status === "CANCELLED";
              const canCancel = order.status === "PLACED";
              const isUnpaid =
                order.paymentStatus === null && order.status !== "CANCELLED";

              return (
                <article
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs"
                >
                  {/* Top Row: Order Metadata & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">
                          Order #{order.id}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            order.status === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.status === "PREPARING"
                              ? "bg-amber-100 text-amber-700"
                              : order.status === "PLACED"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {order.status}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            order.paymentStatus === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.paymentStatus === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : order.paymentStatus === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Payment: {order.paymentStatus ?? "UNPAID"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Placed on {new Date(order.orderDate).toLocaleString()}{" "}
                        &bull; Deliver to:{" "}
                        <strong className="text-slate-700">
                          {order.deliveryAddress}
                        </strong>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400">
                        Total Amount
                      </span>
                      <p className="text-lg font-extrabold text-slate-900">
                        Rs.{" "}
                        {order.totalAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Visual Progress Stepper */}
                  {!isCancelled ? (
                    <div className="py-5 border-b border-slate-100">
                      <div className="grid grid-cols-3 gap-2">
                        {PROGRESS_STEPS.map((step, idx) => {
                          const isDone = idx <= currentStep;
                          const isCurrent = idx === currentStep;
                          return (
                            <div
                              key={step.status}
                              className="flex flex-col items-center text-center"
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                                  isDone
                                    ? "bg-orange-600 text-white"
                                    : "bg-slate-100 text-slate-400"
                                } ${
                                  isCurrent ? "ring-4 ring-orange-100" : ""
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <span
                                className={`mt-1.5 text-xs font-semibold ${
                                  isDone ? "text-slate-900" : "text-slate-400"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="my-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-medium text-red-700">
                      This order was cancelled.
                    </div>
                  )}

                  {/* Order Items Breakdown */}
                  <div className="py-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Ordered Items ({order.items.length})
                    </p>
                    <div className="divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="py-2 flex items-center justify-between text-sm"
                        >
                          <div className="text-slate-700">
                            <span className="font-bold text-slate-900 mr-1.5">
                              {item.quantity}×
                            </span>
                            <span>{item.foodItemName}</span>
                            <span className="text-xs text-slate-400 ml-2">
                              (@ Rs. {item.unitPrice.toFixed(2)})
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900">
                            Rs.{" "}
                            {item.subtotal.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
                    {canCancel && (
                      <button
                        type="button"
                        disabled={cancellingId === order.id}
                        onClick={() => void handleCancelOrder(order)}
                        className="px-4 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-600 transition cursor-pointer disabled:opacity-50"
                      >
                        {cancellingId === order.id
                          ? "Cancelling..."
                          : "Cancel Order"}
                      </button>
                    )}

                    {isUnpaid && (
                      <button
                        type="button"
                        onClick={() => setActivePaymentOrder(order)}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                      >
                        Pay Now
                      </button>
                    )}

                    {order.paymentStatus !== null && (
                      <button
                        type="button"
                        onClick={() => setActivePaymentOrder(order)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                      >
                        View Payment Receipt
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Modal (Pay Now or View Receipt) */}
      {activePaymentOrder && (
        <PaymentModal
          order={activePaymentOrder}
          onClose={() => setActivePaymentOrder(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
