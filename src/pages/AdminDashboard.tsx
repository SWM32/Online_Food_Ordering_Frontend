import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useAuth } from "../context/AuthContext";
import { categoryService } from "../services/categoryService";
import { foodService } from "../services/foodService";
import { orderService } from "../services/orderService";
import { paymentService } from "../services/paymentService";
import { userService } from "../services/userService";
import { parseApiError } from "../services/api";
import type {
  CategoryResponse,
  FoodItemResponse,
  FoodStatus,
  OrderResponse,
  OrderStatus,
  PaymentResponse,
  PaymentStatus,
  UserResponse,
} from "../types";

type AdminTab = "foods" | "categories" | "orders" | "payments" | "users";

const ORDER_STATUSES: OrderStatus[] = [
  "PLACED",
  "PREPARING",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "COMPLETED", "FAILED"];

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("foods");

  // Data states
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [foods, setFoods] = useState<FoodItemResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);

  // Filter states
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    OrderStatus | "ALL"
  >("ALL");
  const [foodSearch, setFoodSearch] = useState("");
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<number | "ALL">(
    "ALL"
  );

  // Loading & feedback states
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Category Form State
  const [editingCategory, setEditingCategory] =
    useState<CategoryResponse | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Food Modal / Form State
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItemResponse | null>(null);
  const [foodName, setFoodName] = useState("");
  const [foodDescription, setFoodDescription] = useState("");
  const [foodImageUrl, setFoodImageUrl] = useState("");
  const [previewBroken, setPreviewBroken] = useState(false);
  const [foodPrice, setFoodPrice] = useState("");
  const [foodStatus, setFoodStatus] = useState<FoodStatus>("AVAILABLE");
  const [foodCategoryId, setFoodCategoryId] = useState<number | "">("");
  const [foodFormError, setFoodFormError] = useState<string | null>(null);
  const [isSavingFood, setIsSavingFood] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Track broken table thumbnails
  const [brokenThumbs, setBrokenThumbs] = useState<Record<number, boolean>>({});

  // Action busy trackers
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
  };

  // Load initial dashboard datasets
  const loadDashboardData = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    try {
      const [catsData, foodsData, ordersData, paymentsData, usersData] =
        await Promise.all([
          categoryService.getAllCategories(),
          foodService.getAllFoods(),
          orderService.getAllOrders(),
          paymentService.getAllPayments(),
          userService.getAllUsers(),
        ]);
      setCategories(catsData);
      setFoods(foodsData);
      setOrders(ordersData);
      setPayments(paymentsData);
      setUsers(usersData);
    } catch (err) {
      const parsed = parseApiError(err);
      showToast("error", parsed.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDashboardData]);

  // Reload orders when orderStatusFilter changes via GET /api/orders?status=...
  const loadFilteredOrders = useCallback(
    async (status: OrderStatus | "ALL") => {
      try {
        const data = await orderService.getAllOrders(
          status === "ALL" ? undefined : status
        );
        setOrders(data);
      } catch (err) {
        const parsed = parseApiError(err);
        showToast("error", parsed.message);
      }
    },
    []
  );

  // ==========================================
  // Category Handlers
  // ==========================================
  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryError(null);
  };

  const startEditCategory = (cat: CategoryResponse) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description ?? "");
    setCategoryError(null);
  };

  const handleCategorySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCategoryError(null);

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setCategoryError("Category name is required.");
      return;
    }

    setIsSavingCategory(true);
    try {
      const payload = {
        name: trimmedName,
        description: categoryDescription.trim() || undefined,
      };

      if (editingCategory) {
        const updated = await categoryService.updateCategory(
          editingCategory.id,
          payload
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        const refreshedFoods = await foodService.getAllFoods();
        setFoods(refreshedFoods);
        showToast("success", `Updated category "${updated.name}".`);
      } else {
        const created = await categoryService.createCategory(payload);
        setCategories((prev) => [...prev, created]);
        showToast("success", `Created category "${created.name}".`);
      }
      resetCategoryForm();
    } catch (err) {
      const parsed = parseApiError(err);
      setCategoryError(parsed.message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryResponse) => {
    if (
      !window.confirm(
        `Are you sure you want to delete category "${cat.name}"?`
      )
    ) {
      return;
    }

    setBusyId(`cat-${cat.id}`);
    try {
      await categoryService.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showToast("success", `Deleted category "${cat.name}".`);
    } catch (err) {
      const parsed = parseApiError(err);
      showToast("error", parsed.message);
    } finally {
      setBusyId(null);
    }
  };

  // ==========================================
  // Food Item Handlers
  // ==========================================
  const openCreateFoodModal = () => {
    setEditingFood(null);
    setFoodName("");
    setFoodDescription("");
    setFoodImageUrl("");
    setPreviewBroken(false);
    setFoodPrice("");
    setFoodStatus("AVAILABLE");
    setFoodCategoryId(categories[0]?.id ?? "");
    setFoodFormError(null);
    setIsFoodModalOpen(true);
  };

  const openEditFoodModal = (food: FoodItemResponse) => {
    setEditingFood(food);
    setFoodName(food.name);
    setFoodDescription(food.description ?? "");
    setFoodImageUrl(food.imageUrl ?? "");
    setPreviewBroken(false);
    setFoodPrice(String(food.price));
    setFoodStatus(food.status);
    setFoodCategoryId(food.categoryId);
    setFoodFormError(null);
    setIsFoodModalOpen(true);
  };

  const handleLocalFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFoodFormError(null);
    try {
      const response = await fetch("/__local-image", {
        method: "POST",
        headers: {
          "x-file-name": encodeURIComponent(file.name),
        },
        body: file,
      });

      if (response.ok) {
        const data = (await response.json()) as { location: string };
        setFoodImageUrl(data.location);
      } else {
        setFoodImageUrl(`/images/${file.name}`);
      }
      setPreviewBroken(false);
    } catch {
      setFoodImageUrl(`/images/${file.name}`);
      setPreviewBroken(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFoodSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFoodFormError(null);

    const trimmedName = foodName.trim();
    const trimmedImageUrl = foodImageUrl.trim();
    const parsedPrice = Number(foodPrice);

    if (!trimmedName) {
      setFoodFormError("Food item name is required.");
      return;
    }
    if (trimmedImageUrl.length > 1000) {
      setFoodFormError("Image location/URL cannot exceed 1000 characters.");
      return;
    }
    if (!foodPrice || Number.isNaN(parsedPrice) || parsedPrice < 0.01) {
      setFoodFormError("Price must be at least 0.01.");
      return;
    }
    if (foodCategoryId === "") {
      setFoodFormError("Please select a category.");
      return;
    }

    setIsSavingFood(true);
    try {
      const payload = {
        name: trimmedName,
        description: foodDescription.trim() || undefined,
        imageUrl: trimmedImageUrl || undefined,
        price: parsedPrice,
        status: foodStatus,
        categoryId: Number(foodCategoryId),
      };

      if (editingFood) {
        const updated = await foodService.updateFood(editingFood.id, payload);
        setFoods((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f))
        );
        setBrokenThumbs((prev) => ({ ...prev, [updated.id]: false }));
        showToast("success", `Updated "${updated.name}".`);
      } else {
        const created = await foodService.createFood(payload);
        setFoods((prev) => [...prev, created]);
        showToast("success", `Created "${created.name}".`);
      }
      setIsFoodModalOpen(false);
    } catch (err) {
      const parsed = parseApiError(err);
      setFoodFormError(parsed.message);
    } finally {
      setIsSavingFood(false);
    }
  };

  const handleToggleFoodStatus = async (food: FoodItemResponse) => {
    const nextStatus: FoodStatus =
      food.status === "AVAILABLE" ? "OUT_OF_STOCK" : "AVAILABLE";
    setBusyId(`food-status-${food.id}`);
    try {
      const updated = await foodService.updateFoodStatus(food.id, nextStatus);
      setFoods((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      showToast(
        "success",
        `"${updated.name}" marked as ${
          updated.status === "AVAILABLE" ? "Available" : "Out of Stock"
        }.`
      );
    } catch (err) {
      const parsed = parseApiError(err);
      showToast("error", parsed.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteFood = async (food: FoodItemResponse) => {
    if (!window.confirm(`Delete food item "${food.name}"?`)) {
      return;
    }

    setBusyId(`food-del-${food.id}`);
    try {
      await foodService.deleteFood(food.id);
      setFoods((prev) => prev.filter((f) => f.id !== food.id));
      showToast("success", `Deleted "${food.name}".`);
    } catch (err) {
      const parsed = parseApiError(err);
      showToast("error", parsed.message);
    } finally {
      setBusyId(null);
    }
  };

  // ==========================================
  // Order & Payment Handlers
  // ==========================================
  const handleUpdateOrderStatus = async (
    orderId: number,
    status: OrderStatus
  ) => {
    setBusyId(`order-${orderId}`);
    try {
      const updated = await orderService.updateOrderStatus(orderId, { status });
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
      showToast("success", `Order #${orderId} status updated to ${status}.`);
    } catch (err) {
      const parsed = parseApiError(err);
      showToast("error", parsed.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdatePaymentStatus = async (
    paymentId: number,
    status: PaymentStatus
  ) => {
    setBusyId(`payment-${paymentId}`);
    try {
      const updated = await paymentService.updatePaymentStatus(paymentId, {
        status,
      });
      setPayments((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === updated.orderId
            ? { ...o, paymentStatus: updated.status }
            : o
        )
      );
      showToast(
        "success",
        `Payment #${paymentId} status updated to ${status}.`
      );
    } catch (err) {
      const parsed = parseApiError(err);
      showToast("error", parsed.message);
    } finally {
      setBusyId(null);
    }
  };

  // ==========================================
  // User Handlers
  // ==========================================
  const handleDeleteUser = async (targetUser: UserResponse) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user ${targetUser.email}?`
      )
    ) {
      return;
    }

    setBusyId(`user-${targetUser.id}`);
    try {
      await userService.deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      showToast("success", `Deleted user ${targetUser.email}.`);
    } catch (err) {
      const parsed = parseApiError(err);
      showToast("error", parsed.message);
    } finally {
      setBusyId(null);
    }
  };

  // Filtered foods for the Food Items tab
  const filteredFoods = foods.filter((f) => {
    const matchesCategory =
      foodCategoryFilter === "ALL" || f.categoryId === foodCategoryFilter;
    const matchesKeyword =
      !foodSearch.trim() ||
      f.name.toLowerCase().includes(foodSearch.trim().toLowerCase()) ||
      f.categoryName.toLowerCase().includes(foodSearch.trim().toLowerCase());
    return matchesCategory && matchesKeyword;
  });

  const totalRevenue = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);

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

      {/* Top Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Admin Control Center
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1.5">
                Restaurant Management Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Manage categories, menu items, customer orders, payments, and
                users.
              </p>
            </div>
            <button
              onClick={() => void loadDashboardData()}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              Refresh Data
            </button>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Food Items</p>
              <p className="text-2xl font-bold mt-1">{foods.length}</p>
              <p className="text-xs text-emerald-400 mt-0.5">
                {foods.filter((f) => f.status === "AVAILABLE").length} available
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Categories</p>
              <p className="text-2xl font-bold mt-1">{categories.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Menu sections</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Orders</p>
              <p className="text-2xl font-bold mt-1">{orders.length}</p>
              <p className="text-xs text-amber-400 mt-0.5">
                {
                  orders.filter(
                    (o) => o.status === "PLACED" || o.status === "PREPARING"
                  ).length
                }{" "}
                active
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Completed Revenue</p>
              <p className="text-xl font-bold mt-1 text-emerald-400">
                Rs.{" "}
                {totalRevenue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {payments.length} total payments
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-400">Users</p>
              <p className="text-2xl font-bold mt-1">{users.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {users.filter((u) => u.role === "CUSTOMER").length} customers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200">
          {(
            [
              { id: "foods", label: `Food Items (${foods.length})` },
              { id: "categories", label: `Categories (${categories.length})` },
              { id: "orders", label: `Orders (${orders.length})` },
              { id: "payments", label: `Payments (${payments.length})` },
              { id: "users", label: `Users (${users.length})` },
            ] as { id: AdminTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <span className="inline-block w-7 h-7 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-600 mt-3">
              Loading dashboard data...
            </p>
          </div>
        ) : (
          <>
            {/* ==========================================
                TAB 1: FOOD ITEMS MANAGEMENT
               ========================================== */}
            {activeTab === "foods" && (
              <section className="space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      placeholder="Filter food items by name..."
                      className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500 sm:w-64"
                    />
                    <select
                      value={foodCategoryFilter}
                      onChange={(e) =>
                        setFoodCategoryFilter(
                          e.target.value === "ALL"
                            ? "ALL"
                            : Number(e.target.value)
                        )
                      }
                      className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-orange-500"
                    >
                      <option value="ALL">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={openCreateFoodModal}
                    disabled={categories.length === 0}
                    title={
                      categories.length === 0
                        ? "Create a category first"
                        : "Add a new food item"
                    }
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    + Add Food Item
                  </button>
                </div>

                {categories.length === 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                    You need at least one category before creating food items.{" "}
                    <button
                      onClick={() => setActiveTab("categories")}
                      className="font-semibold underline cursor-pointer"
                    >
                      Create a category now
                    </button>
                    .
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                          <th className="py-3.5 px-4">ID</th>
                          <th className="py-3.5 px-4">Food Item</th>
                          <th className="py-3.5 px-4">Category</th>
                          <th className="py-3.5 px-4">Price</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredFoods.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="py-10 text-center text-slate-500"
                            >
                              No food items found.
                            </td>
                          </tr>
                        ) : (
                          filteredFoods.map((food) => {
                            const isAvailable = food.status === "AVAILABLE";
                            const showThumb =
                              Boolean(food.imageUrl) && !brokenThumbs[food.id];

                            return (
                              <tr
                                key={food.id}
                                className="hover:bg-slate-50/80"
                              >
                                <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                                  #{food.id}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    {showThumb ? (
                                      <img
                                        src={food.imageUrl!}
                                        alt={food.name}
                                        onError={() =>
                                          setBrokenThumbs((prev) => ({
                                            ...prev,
                                            [food.id]: true,
                                          }))
                                        }
                                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                                      />
                                    ) : (
                                      <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                                        <svg
                                          className="w-5 h-5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.75}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {food.name}
                                      </p>
                                      {food.description && (
                                        <p className="text-xs text-slate-500 line-clamp-1">
                                          {food.description}
                                        </p>
                                      )}
                                      {food.imageUrl && (
                                        <p className="text-[11px] text-slate-400 font-mono line-clamp-1">
                                          {food.imageUrl}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                                    {food.categoryName}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-slate-900">
                                  Rs.{" "}
                                  {food.price.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-3.5 px-4">
                                  <button
                                    onClick={() =>
                                      void handleToggleFoodStatus(food)
                                    }
                                    disabled={
                                      busyId === `food-status-${food.id}`
                                    }
                                    title="Click to toggle stock status"
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                                      isAvailable
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                                    }`}
                                  >
                                    {isAvailable ? "AVAILABLE" : "OUT_OF_STOCK"}
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => openEditFoodModal(food)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteFood(food)}
                                    disabled={busyId === `food-del-${food.id}`}
                                    className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-600 transition cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* ==========================================
                TAB 2: CATEGORIES MANAGEMENT
               ========================================== */}
            {activeTab === "categories" && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit">
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingCategory ? "Edit Category" : "Create Category"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 mb-5">
                    {editingCategory
                      ? `Updating category #${editingCategory.id}`
                      : "Add a new menu category for food items"}
                  </p>

                  {categoryError && (
                    <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                      {categoryError}
                    </div>
                  )}

                  <form
                    onSubmit={handleCategorySubmit}
                    className="space-y-4"
                    noValidate
                  >
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="e.g. Wood-Fired Pizza"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={categoryDescription}
                        onChange={(e) => setCategoryDescription(e.target.value)}
                        placeholder="Short description of this category..."
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSavingCategory}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-semibold transition cursor-pointer"
                      >
                        {isSavingCategory
                          ? "Saving..."
                          : editingCategory
                          ? "Update Category"
                          : "Create Category"}
                      </button>
                      {editingCategory && (
                        <button
                          type="button"
                          onClick={resetCategoryForm}
                          className="py-2.5 px-4 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                          <th className="py-3.5 px-4">ID</th>
                          <th className="py-3.5 px-4">Name</th>
                          <th className="py-3.5 px-4">Description</th>
                          <th className="py-3.5 px-4">Items</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {categories.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-10 text-center text-slate-500"
                            >
                              No categories created yet.
                            </td>
                          </tr>
                        ) : (
                          categories.map((cat) => {
                            const count = foods.filter(
                              (f) => f.categoryId === cat.id
                            ).length;
                            return (
                              <tr key={cat.id} className="hover:bg-slate-50/80">
                                <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                                  #{cat.id}
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-slate-900">
                                  {cat.name}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500">
                                  {cat.description || "—"}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                    {count} {count === 1 ? "item" : "items"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => startEditCategory(cat)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      void handleDeleteCategory(cat)
                                    }
                                    disabled={busyId === `cat-${cat.id}`}
                                    className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-600 transition cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* ==========================================
                TAB 3: ORDERS MANAGEMENT
               ========================================== */}
            {activeTab === "orders" && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(["ALL", ...ORDER_STATUSES] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setOrderStatusFilter(st);
                        void loadFilteredOrders(st);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        orderStatusFilter === st
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
                    No orders matching the selected status.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-bold text-slate-900">
                                Order #{order.id}
                              </span>
                              <span className="text-xs text-slate-500">
                                by{" "}
                                <strong className="text-slate-700">
                                  {order.userEmail}
                                </strong>
                              </span>
                              <span className="text-xs text-slate-400">
                                &bull;{" "}
                                {new Date(order.orderDate).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Delivery Address:{" "}
                              <span className="text-slate-700 font-medium">
                                {order.deliveryAddress}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                order.paymentStatus === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : order.paymentStatus === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              Payment: {order.paymentStatus ?? "UNPAID"}
                            </span>

                            <select
                              value={order.status}
                              disabled={busyId === `order-${order.id}`}
                              onChange={(e) =>
                                void handleUpdateOrderStatus(
                                  order.id,
                                  e.target.value as OrderStatus
                                )
                              }
                              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex flex-wrap gap-2">
                            {order.items.map((item) => (
                              <span
                                key={item.id}
                                className="px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700"
                              >
                                <strong>{item.quantity}×</strong>{" "}
                                {item.foodItemName} (Rs.{" "}
                                {item.subtotal.toFixed(2)})
                              </span>
                            ))}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-slate-400">
                              Total Amount
                            </span>
                            <p className="text-base font-extrabold text-slate-900">
                              Rs.{" "}
                              {order.totalAmount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ==========================================
                TAB 4: PAYMENTS MANAGEMENT
               ========================================== */}
            {activeTab === "payments" && (
              <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <th className="py-3.5 px-4">ID</th>
                        <th className="py-3.5 px-4">Order</th>
                        <th className="py-3.5 px-4">Transaction Ref</th>
                        <th className="py-3.5 px-4">Method</th>
                        <th className="py-3.5 px-4">Amount</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-slate-500"
                          >
                            No payments recorded yet.
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="hover:bg-slate-50/80"
                          >
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                              #{payment.id}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              Order #{payment.orderId}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                              {payment.transactionRef}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                                {payment.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              Rs.{" "}
                              {payment.amount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500">
                              {new Date(payment.paymentDate).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={payment.status}
                                disabled={busyId === `payment-${payment.id}`}
                                onChange={(e) =>
                                  void handleUpdatePaymentStatus(
                                    payment.id,
                                    e.target.value as PaymentStatus
                                  )
                                }
                                className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                              >
                                {PAYMENT_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ==========================================
                TAB 5: USERS MANAGEMENT
               ========================================== */}
            {activeTab === "users" && (
              <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <th className="py-3.5 px-4">ID</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-10 text-center text-slate-500"
                          >
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => {
                          const isSelf = currentUser?.id === u.id;
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/80">
                              <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                                #{u.id}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                {u.email}{" "}
                                {isSelf && (
                                  <span className="ml-1.5 text-xs font-normal text-slate-400">
                                    (You)
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    u.role === "ADMIN"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => void handleDeleteUser(u)}
                                  disabled={
                                    isSelf || busyId === `user-${u.id}`
                                  }
                                  title={
                                    isSelf
                                      ? "You cannot delete your own active admin account"
                                      : "Delete user"
                                  }
                                  className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-40 text-xs font-semibold text-red-600 transition cursor-pointer disabled:cursor-not-allowed"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ==========================================
          MODAL: CREATE / EDIT FOOD ITEM
         ========================================== */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingFood ? "Edit Food Item" : "Add New Food Item"}
              </h3>
              <button
                onClick={() => setIsFoodModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {foodFormError && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {foodFormError}
              </div>
            )}

            <form
              onSubmit={handleFoodSubmit}
              className="mt-4 space-y-4"
              noValidate
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. Margherita Pizza"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={foodPrice}
                    onChange={(e) => setFoodPrice(e.target.value)}
                    placeholder="1850.00"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={foodCategoryId}
                    onChange={(e) =>
                      setFoodCategoryId(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Food Image Location / URL Input + Choose from PC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Image URL / Location
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleLocalFileChange(e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Choose Image from PC
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={foodImageUrl}
                    onChange={(e) => {
                      setFoodImageUrl(e.target.value);
                      setPreviewBroken(false);
                    }}
                    placeholder="https://... or /images/dish.jpg"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                  {foodImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFoodImageUrl("");
                        setPreviewBroken(false);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-600 shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Live Image Preview */}
                {foodImageUrl.trim() && (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-36 flex items-center justify-center">
                    {!previewBroken ? (
                      <img
                        src={foodImageUrl.trim()}
                        alt="Food preview"
                        onError={() => setPreviewBroken(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-xs text-red-500 px-4 text-center">
                        Unable to preview image at &ldquo;{foodImageUrl.trim()}
                        &rdquo;.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Availability Status
                </label>
                <select
                  value={foodStatus}
                  onChange={(e) => setFoodStatus(e.target.value as FoodStatus)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={foodDescription}
                  onChange={(e) => setFoodDescription(e.target.value)}
                  placeholder="Ingredients, portion details, etc."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFoodModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFood}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-semibold transition cursor-pointer"
                >
                  {isSavingFood
                    ? "Saving..."
                    : editingFood
                    ? "Save Changes"
                    : "Create Food Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
