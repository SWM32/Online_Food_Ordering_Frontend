import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { userService } from "../services/userService";
import { orderService } from "../services/orderService";
import { parseApiError } from "../services/api";
import type { OrderResponse, UserResponse } from "../types";

export default function Profile() {
  const { user, isAdmin, logout, refreshUser } = useAuth();
  const { cart, itemCount } = useCart();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserResponse | null>(user);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileData = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const [meData, myOrders] = await Promise.all([
        userService.getCurrentUser(),
        orderService.getMyOrders(),
      ]);
      setProfile(meData);
      setOrders(myOrders);
      await refreshUser();
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProfileData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfileData]);

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayUser = profile ?? user;
  const initial = displayUser?.email
    ? displayUser.email.charAt(0).toUpperCase()
    : "U";

  const activeOrdersCount = orders.filter(
    (o) => o.status === "PLACED" || o.status === "PREPARING"
  ).length;
  const deliveredOrdersCount = orders.filter(
    (o) => o.status === "DELIVERED"
  ).length;
  const totalSpent = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              My Account Profile
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              View your account details, order statistics, and recent activity.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadProfileData()}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Refresh Profile
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-semibold text-red-600 transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => void loadProfileData()}
              className="text-xs font-semibold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Account Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit shadow-2xs">
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-xs shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">
                  {displayUser?.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                    {displayUser?.role}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID #{displayUser?.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Account ID</span>
                <span className="font-mono font-semibold text-slate-800">
                  #{displayUser?.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-800 truncate max-w-[12rem]">
                  {displayUser?.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Access Role</span>
                <span className="font-semibold text-slate-800">
                  {displayUser?.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Session Status</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Authenticated (JWT)
                </span>
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Quick Shortcuts
              </p>
              <Link
                to="/"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-orange-50 text-sm font-medium text-slate-700 hover:text-orange-700 transition"
              >
                <span>Browse Food Menu</span>
                <span>&rarr;</span>
              </Link>
              <Link
                to="/cart"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-orange-50 text-sm font-medium text-slate-700 hover:text-orange-700 transition"
              >
                <span>
                  Shopping Cart ({itemCount}{" "}
                  {itemCount === 1 ? "item" : "items"})
                </span>
                <span>&rarr;</span>
              </Link>
              <Link
                to="/orders"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-orange-50 text-sm font-medium text-slate-700 hover:text-orange-700 transition"
              >
                <span>My Order History ({orders.length})</span>
                <span>&rarr;</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white transition"
                >
                  <span>Open Admin Dashboard</span>
                  <span>&rarr;</span>
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Stats & Recent Orders */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <p className="text-xs text-slate-500">Total Orders</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {isLoading ? "—" : orders.length}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <p className="text-xs text-slate-500">Active Orders</p>
                <p className="text-2xl font-extrabold text-orange-600 mt-1">
                  {isLoading ? "—" : activeOrdersCount}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <p className="text-xs text-slate-500">Delivered</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {isLoading ? "—" : deliveredOrdersCount}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <p className="text-xs text-slate-500">Total Ordered</p>
                <p className="text-base font-extrabold text-slate-900 mt-2">
                  {isLoading
                    ? "—"
                    : `Rs. ${totalSpent.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </p>
              </div>
            </div>

            {/* Active Cart Summary Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Current Shopping Cart
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {itemCount === 0
                    ? "You have no items waiting in your cart."
                    : `${itemCount} ${
                        itemCount === 1 ? "item" : "items"
                      } totaling Rs. ${(cart?.totalAmount ?? 0).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}`}
                </p>
              </div>
              <Link
                to={itemCount > 0 ? "/cart" : "/"}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition"
              >
                {itemCount > 0 ? "Go to Checkout" : "Browse Menu"}
              </Link>
            </div>

            {/* Recent Orders Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Recent Orders
                </h2>
                {orders.length > 0 && (
                  <Link
                    to="/orders"
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                  >
                    View All ({orders.length}) &rarr;
                  </Link>
                )}
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Loading recent orders...
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">
                    You haven&apos;t placed any orders yet.
                  </p>
                  <Link
                    to="/"
                    className="mt-3 inline-block text-xs font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Explore the menu &rarr;
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            Order #{order.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              order.paymentStatus === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : order.paymentStatus === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {order.paymentStatus ?? "UNPAID"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(order.orderDate).toLocaleString()} &bull;{" "}
                          {order.items.length}{" "}
                          {order.items.length === 1 ? "dish" : "dishes"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-sm font-extrabold text-slate-900">
                          Rs.{" "}
                          {order.totalAmount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <Link
                          to="/orders"
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
