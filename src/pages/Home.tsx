import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { categoryService } from "../services/categoryService";
import { foodService } from "../services/foodService";
import { cartService } from "../services/cartService";
import { parseApiError } from "../services/api";
import type { CategoryResponse, FoodItemResponse } from "../types";

type SortOption = "default" | "price-asc" | "price-desc" | "name-asc";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [foods, setFoods] = useState<FoodItemResponse[]>([]);

  // Filter & Search state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [searchInput, setSearchInput] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("default");

  // Loading & Error states
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-item quantity selection, broken image tracking & Add-to-Cart state
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});
  const [addingFoodId, setAddingFoodId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-hide toast notification
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Debounce search input -> activeKeyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveKeyword(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch all categories on mount
  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const data = await categoryService.getAllCategories();
      setCategories(data);
    } catch {
      // Categories error will also surface on food fetch if server is down
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Fetch foods based on active filters using the backend REST endpoints
  const loadFoods = useCallback(async () => {
    setIsLoadingFoods(true);
    setError(null);

    try {
      let data: FoodItemResponse[];

      if (activeKeyword) {
        data = await foodService.searchFoods(activeKeyword);
      } else if (selectedCategoryId !== null) {
        data = await foodService.getFoodsByCategory(selectedCategoryId);
      } else if (onlyAvailable) {
        data = await foodService.getAvailableFoods();
      } else {
        data = await foodService.getAllFoods();
      }

      setFoods(data);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setIsLoadingFoods(false);
    }
  }, [activeKeyword, selectedCategoryId, onlyAvailable]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadFoods();
  }, [loadFoods]);

  // Combine client-side filters when multiple filters are active simultaneously
  const displayedFoods = useMemo(() => {
    let filtered = [...foods];

    if (selectedCategoryId !== null) {
      filtered = filtered.filter(
        (item) => item.categoryId === selectedCategoryId
      );
    }

    if (onlyAvailable) {
      filtered = filtered.filter((item) => item.status === "AVAILABLE");
    }

    if (sortBy === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [foods, selectedCategoryId, onlyAvailable, sortBy]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveKeyword(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSelectedCategoryId(null);
    setSearchInput("");
    setActiveKeyword("");
    setOnlyAvailable(false);
    setSortBy("default");
  };

  const getQuantity = (foodId: number): number => quantities[foodId] ?? 1;

  const updateQuantity = (foodId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[foodId] ?? 1;
      const next = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [foodId]: next };
    });
  };

  const handleAddToCart = async (food: FoodItemResponse) => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: { pathname: "/" },
          message: `Please sign in to add "${food.name}" to your cart.`,
        },
      });
      return;
    }

    const quantity = getQuantity(food.id);
    setAddingFoodId(food.id);

    try {
      await cartService.addItemToCart({
        foodItemId: food.id,
        quantity,
      });
      setToast({
        type: "success",
        message: `Added ${quantity} × ${food.name} to your cart!`,
      });
      setQuantities((prev) => ({ ...prev, [food.id]: 1 }));
    } catch (err) {
      const parsed = parseApiError(err);
      setToast({
        type: "error",
        message: parsed.message,
      });
    } finally {
      setAddingFoodId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-bounce">
          <div
            className={`rounded-2xl shadow-lg border px-4 py-3 flex items-center gap-3 text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-red-600 border-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <svg
                className="w-5 h-5 shrink-0"
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
            ) : (
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/80 hover:text-white cursor-pointer"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner & Keyword Search */}
      <section className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white mb-4">
              Fresh &bull; Fast &bull; Delicious
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Order Your Favorite Food Online
            </h1>
            <p className="mt-3 text-orange-50 text-base sm:text-lg">
              Explore our curated menu by category or search for dishes you
              crave right now.
            </p>

            {/* Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-7 flex items-center bg-white rounded-2xl p-1.5 shadow-lg max-w-xl"
            >
              <div className="pl-3.5 pr-2 text-slate-400">
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search food items by name (e.g. Pizza, Burger)..."
                aria-label="Search food items"
                className="w-full py-2.5 px-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setActiveKeyword("");
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition shrink-0 cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Category Filter Section */}
        <section aria-label="Food Categories" className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              Browse by Category
            </h2>
            {selectedCategoryId !== null && (
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                Show All Categories
              </button>
            )}
          </div>

          {isLoadingCategories ? (
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-10 w-28 rounded-xl bg-slate-200 animate-pulse shrink-0"
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
                  selectedCategoryId === null
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                All Items
              </button>

              {categories.map((category) => {
                const isActive = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategoryId(isActive ? null : category.id)
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-orange-600 text-white shadow-sm"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-orange-300 hover:text-orange-600"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}

          {selectedCategory && selectedCategory.description && (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {selectedCategory.name}:
              </span>{" "}
              {selectedCategory.description}
            </p>
          )}
        </section>

        {/* Toolbar: Active Filter Summary, Available Toggle & Sort */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {isLoadingFoods
                ? "Loading menu..."
                : `${displayedFoods.length} ${
                    displayedFoods.length === 1 ? "dish" : "dishes"
                  } found`}
            </span>

            {activeKeyword && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                Keyword: &ldquo;{activeKeyword}&rdquo;
                <button
                  onClick={() => {
                    setSearchInput("");
                    setActiveKeyword("");
                  }}
                  className="hover:text-orange-900 cursor-pointer"
                  aria-label="Remove keyword filter"
                >
                  ✕
                </button>
              </span>
            )}

            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                Category: {selectedCategory.name}
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className="hover:text-slate-900 cursor-pointer"
                  aria-label="Remove category filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
              />
              <span>Available only</span>
            </label>

            <div className="flex items-center gap-2">
              <label
                htmlFor="sort-select"
                className="text-xs font-medium text-slate-500"
              >
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-orange-500"
              >
                <option value="default">Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center my-8">
            <p className="text-sm font-semibold text-red-800">{error}</p>
            <button
              onClick={() => {
                void loadCategories();
                void loadFoods();
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Loading Skeleton Grid */}
        {isLoadingFoods && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse"
              >
                <div className="h-36 rounded-xl bg-slate-200" />
                <div className="h-5 w-2/3 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-10 w-full bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingFoods && !error && displayedFoods.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 mb-4">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              No food items found
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              We couldn&apos;t find any dishes matching your current search or
              category filters.
            </p>
            {(selectedCategoryId !== null ||
              activeKeyword !== "" ||
              onlyAvailable) && (
              <button
                onClick={handleResetFilters}
                className="mt-5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}

        {/* Food Items Grid */}
        {!isLoadingFoods && !error && displayedFoods.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedFoods.map((food) => {
              const isAvailable = food.status === "AVAILABLE";
              const qty = getQuantity(food.id);
              const isAdding = addingFoodId === food.id;
              const showImage =
                Boolean(food.imageUrl) && !brokenImages[food.id];

              return (
                <article
                  key={food.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col overflow-hidden"
                >
                  {/* Visual Card Banner / Food Image */}
                  <div className="relative h-44 bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 flex items-center justify-center overflow-hidden">
                    {showImage ? (
                      <img
                        src={food.imageUrl!}
                        alt={food.name}
                        onError={() =>
                          setBrokenImages((prev) => ({
                            ...prev,
                            [food.id]: true,
                          }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center text-orange-500">
                        <svg
                          className="w-9 h-9"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.75}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Category Badge */}
                    <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs">
                      {food.categoryName}
                    </span>

                    {/* Availability Status Badge */}
                    <span
                      className={`absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs ${
                        isAvailable
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isAvailable ? "Available" : "Out of Stock"}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {food.name}
                        </h3>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                        {food.description ||
                          "Freshly prepared with quality ingredients."}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400 font-medium">
                          Price
                        </span>
                        <span className="text-lg font-extrabold text-slate-900">
                          Rs.{" "}
                          {food.price.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {/* Quantity Stepper & Add to Cart Button */}
                      <div className="flex items-center gap-2.5">
                        {isAvailable && (
                          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                            <button
                              type="button"
                              onClick={() => updateQuantity(food.id, -1)}
                              disabled={qty <= 1 || isAdding}
                              className="w-8 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              &minus;
                            </button>
                            <span className="w-7 text-center text-sm font-semibold text-slate-800">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(food.id, 1)}
                              disabled={isAdding}
                              className="w-8 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={!isAvailable || isAdding}
                          onClick={() => void handleAddToCart(food)}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                            isAvailable
                              ? "bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {isAdding ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Adding...
                            </>
                          ) : isAvailable ? (
                            <>
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
                                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              Add to Cart
                            </>
                          ) : (
                            "Unavailable"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
