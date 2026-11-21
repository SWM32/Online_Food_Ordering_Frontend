import { useState, useEffect, type FormEvent } from "react";
import { paymentService } from "../services/paymentService";
import { parseApiError } from "../services/api";
import type { OrderResponse, PaymentResponse } from "../types";

interface PaymentModalProps {
  order: OrderResponse;
  onClose: () => void;
  onPaymentSuccess?: (payment: PaymentResponse) => void;
}

type PaymentMethodOption = "CARD" | "ONLINE" | "CASH_ON_DELIVERY";

const PAYMENT_METHODS: {
  id: PaymentMethodOption;
  label: string;
  description: string;
}[] = [
  {
    id: "CARD",
    label: "Credit / Debit Card",
    description: "Instant payment confirmation (Status: COMPLETED)",
  },
  {
    id: "ONLINE",
    label: "Online Transfer / Wallet",
    description: "Instant online payment confirmation (Status: COMPLETED)",
  },
  {
    id: "CASH_ON_DELIVERY",
    label: "Cash on Delivery",
    description: "Pay when your order arrives (Initial Status: PENDING)",
  },
];

export default function PaymentModal({
  order,
  onClose,
  onPaymentSuccess,
}: PaymentModalProps) {
  const alreadyHasPayment = order.paymentStatus !== null;

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodOption>("CARD");
  const [transactionRef, setTransactionRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(alreadyHasPayment);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentResponse | null>(null);

  // If the order already has a payment recorded, fetch its receipt via GET /api/payments/order/{orderId}
  useEffect(() => {
    if (!alreadyHasPayment) return;

    let cancelled = false;
    const fetchReceipt = async () => {
      setIsLoadingReceipt(true);
      setError(null);
      try {
        const data = await paymentService.getPaymentByOrderId(order.id);
        if (!cancelled) {
          setReceipt(data);
        }
      } catch (err) {
        if (!cancelled) {
          const parsed = parseApiError(err);
          setError(parsed.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingReceipt(false);
        }
      }
    };

    void fetchReceipt();
    return () => {
      cancelled = true;
    };
  }, [alreadyHasPayment, order.id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payment = await paymentService.processPayment({
        orderId: order.id,
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
      });
      setReceipt(payment);
      onPaymentSuccess?.(payment);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {receipt ? "Payment Receipt" : `Pay for Order #${order.id}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Order Total: Rs.{" "}
              {order.totalAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Loading Receipt State */}
        {isLoadingReceipt && (
          <div className="py-12 text-center">
            <span className="inline-block w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 mt-2">
              Loading payment receipt...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && !isLoadingReceipt && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Payment Receipt View */}
        {!isLoadingReceipt && receipt && (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 mb-2">
                <svg
                  className="w-6 h-6"
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
              <p className="text-sm font-bold text-slate-900">
                {receipt.status === "COMPLETED"
                  ? "Payment Completed"
                  : receipt.status === "PENDING"
                  ? "Payment Recorded (Pending Collection)"
                  : "Payment Failed"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Transaction Reference:{" "}
                <span className="font-mono font-semibold text-slate-800">
                  {receipt.transactionRef}
                </span>
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment ID</span>
                <span className="font-mono font-semibold text-slate-800">
                  #{receipt.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Order ID</span>
                <span className="font-semibold text-slate-800">
                  Order #{receipt.orderId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-700">
                  {receipt.paymentMethod}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    receipt.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-700"
                      : receipt.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {receipt.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date &amp; Time</span>
                <span className="text-slate-700">
                  {new Date(receipt.paymentDate).toLocaleString()}
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
                <span>Amount</span>
                <span className="text-orange-600">
                  Rs.{" "}
                  {receipt.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {/* Payment Form View (POST /api/payments) */}
        {!isLoadingReceipt && !receipt && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Payment Method *
              </label>
              <div className="space-y-2.5">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method.id;
                  return (
                    <label
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/70"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={isSelected}
                        onChange={() => setPaymentMethod(method.id)}
                        className="mt-0.5 accent-orange-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {method.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {method.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="transaction-ref"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Transaction Reference (Optional)
              </label>
              <input
                id="transaction-ref"
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Leave blank to auto-generate (e.g. TXN-XXXXXXXX)"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm Payment (Rs. ${order.totalAmount.toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )})`
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
