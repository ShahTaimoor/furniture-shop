import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useSearchContext } from "@/contexts/SearchContext";
import { AllCategory } from "@/redux/slices/categories/categoriesSlice";
import { addToCart } from "@/redux/slices/cart/cartSlice";
import { fetchProducts } from "@/redux/slices/products/productSlice";
import ProductGrid from "@/components/custom/ProductGrid";
import Pagination from "@/components/custom/Pagination";
import { Button } from "@/components/ui/button";
import BannerCarousel from "@/components/custom/BannerCarousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import OneLoader from "@/components/ui/OneLoader";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useAuthDrawer } from "@/contexts/AuthDrawerContext";
import SEO from "@/components/seo/SEO";
import { selectCurrency } from "@/redux/slices/settings/settingsSlice";

const CURRENCY_LABELS = { none: 'PKR', usd: 'USD', gbp: 'GBP', eur: 'EUR', pkr: 'PKR' };

const sortOptions = [
  { value: "az", label: "Name A → Z" },
  { value: "za", label: "Name Z → A" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "stock-high", label: "Stock: High to Low" },
  { value: "stock-low", label: "Stock: Low to High" },
  { value: "popularity", label: "Most Popular" }
];

const Products = () => {
  const searchContext = useSearchContext();
  const search = searchContext?.search;
  const gridType = searchContext?.gridType ?? "grid2";

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currency = useSelector(selectCurrency);
  const currencyLabel = CURRENCY_LABELS[currency] || 'PKR';
  const { openAuthDrawer } = useAuthDrawer();

  const { categories = [], status: categoriesStatus } = useSelector((state) => state.categories);
  const {
    products = [],
    status: productsStatus,
    error: productsError,
    totalItems
  } = useSelector((state) => state.products);
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const isInitialDesktop = typeof window !== "undefined" ? window.innerWidth >= 768 : true;
  const [priceInputs, setPriceInputs] = useState({ min: "", max: "" });
  const [addingProductId, setAddingProductId] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [isFilterDesktop, setIsFilterDesktop] = useState(isInitialDesktop);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(isInitialDesktop);
  const [columns, setColumns] = useState(5);

  const handleSearchRef = useRef(search?.handleSearch);
  const isSearchingRef = useRef(false);
  const lastSearchParamsRef = useRef("");
  const prevPageRef = useRef(search?.page ?? 1);

  useEffect(() => {
    if (categoriesStatus === "idle") {
      dispatch(AllCategory());
    }
  }, [dispatch, categoriesStatus]);

  useEffect(() => {
    if (!search && productsStatus === "idle") {
      dispatch(fetchProducts({ page: 1, limit: 24, stockFilter: "all", sortBy: "az" }));
    }
  }, [dispatch, search, productsStatus]);

  useEffect(() => {
    if (search) {
      handleSearchRef.current = search.handleSearch;
    }
  }, [search]);

  useEffect(() => {
    if (!search) return;
    setPriceInputs({
      min: search.minPrice ?? "",
      max: search.maxPrice ?? ""
    });
  }, [search?.minPrice, search?.maxPrice]);

  useEffect(() => {
    const initialQuantities = {};
    products.forEach((product) => {
      if (product?._id) {
        initialQuantities[product._id] = product.stock > 0 ? 1 : 0;
      }
    });
    setQuantities(initialQuantities);
  }, [products]);

  useEffect(() => {
    const updateViewport = () => {
      const desktopView = window.innerWidth >= 768;
      setIsFilterDesktop(desktopView);
      setIsMobileFilterOpen(desktopView);
    };

    if (typeof window !== "undefined") {
      updateViewport();
      window.addEventListener("resize", updateViewport);
      return () => window.removeEventListener("resize", updateViewport);
    }
  }, []);

  const handleMobileFilterToggle = useCallback(() => {
    if (isFilterDesktop) return;
    setIsMobileFilterOpen((prev) => !prev);
  }, [isFilterDesktop]);

  const isFilterSectionVisible = isFilterDesktop || isMobileFilterOpen;

  const serializedTags = useMemo(
    () => JSON.stringify(search?.tags || []),
    [search?.tags]
  );
  const priceKey = useMemo(
    () => `${search?.minPrice ?? ""}-${search?.maxPrice ?? ""}`,
    [search?.minPrice, search?.maxPrice]
  );


  useEffect(() => {
    if (!search || !handleSearchRef.current) {
      return;
    }
    if (isSearchingRef.current) {
      return;
    }

    const searchKey = [
      search.debouncedSearchTerm || "",
      search.category,
      search.sortBy,
      JSON.stringify(search.enterSuggestionIds || []),
      serializedTags,
      priceKey,
      search.stockFilter
    ].join("|");

    if (lastSearchParamsRef.current !== searchKey) {
      lastSearchParamsRef.current = searchKey;
      isSearchingRef.current = true;
      const result = handleSearchRef.current(search.debouncedSearchTerm);
      Promise.resolve(result).finally(() => {
        isSearchingRef.current = false;
      });
    }
  }, [
    search?.debouncedSearchTerm,
    search?.category,
    search?.sortBy,
    search?.enterSuggestionIds,
    search?.stockFilter,
    serializedTags,
    priceKey
  ]);

  useEffect(() => {
    if (!search || !handleSearchRef.current) {
      return;
    }
    const pageChanged = prevPageRef.current !== search.page;
    prevPageRef.current = search.page;
    if (pageChanged && !isSearchingRef.current) {
      isSearchingRef.current = true;
      const result = handleSearchRef.current(search.debouncedSearchTerm);
      Promise.resolve(result).finally(() => {
        isSearchingRef.current = false;
      });
    }
  }, [search?.page, search?.debouncedSearchTerm]);

  const handleCategoryChange = useCallback(
    (nextCategory) => {
      if (!search) return;
      search.setSelectedProductId?.(null);
      search.setEnterSuggestionIds([]);
      search.setCategory(nextCategory);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [search]
  );

  const handleSortChange = useCallback(
    (value) => {
      if (!search) return;
      search.setSortBy(value);
    },
    [search]
  );

  const handleTagToggle = useCallback(
    (tagId) => {
      if (!search) return;
      const current = Array.isArray(search.tags) ? search.tags : [];
      const next = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId];
      search.setTags(next);
    },
    [search]
  );

  const applyPriceFilter = useCallback(() => {
    if (!search) return;
    const min =
      priceInputs.min !== "" && !Number.isNaN(Number(priceInputs.min))
        ? Number(priceInputs.min)
        : null;
    const max =
      priceInputs.max !== "" && !Number.isNaN(Number(priceInputs.max))
        ? Number(priceInputs.max)
        : null;

    if (min !== null && max !== null && min > max) {
      toast.error("Minimum price cannot be greater than maximum price.");
      return;
    }

    search.setPriceRange({ min, max });
  }, [priceInputs, search]);

  const clearPriceFilter = useCallback(() => {
    if (!search) return;
    search.clearPriceRange();
    setPriceInputs({ min: "", max: "" });
  }, [search]);

  const handleQuantityChange = useCallback((productId, value, stock) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (value === "") {
        next[productId] = "";
        return next;
      }
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        return prev;
      }
      const safeValue = Math.max(1, Math.min(parsed, stock || 1));
      next[productId] = safeValue;
      return next;
    });
  }, []);

  const handleAddToCart = useCallback(
    (product) => {
      if (!product?._id) return;
      if (!user) {
        toast.warning("Please sign in to add items to your cart.");
        openAuthDrawer("login", { redirectTo: `${location.pathname}${location.search}` });
        return;
      }
      const qty = Number.parseInt(quantities[product._id], 10) || 1;
      if (qty <= 0) {
        toast.error("Select at least one item.");
        return;
      }
      setAddingProductId(product._id);
      dispatch(addToCart({ productId: product._id, quantity: qty }))
        .unwrap()
        .then(() => toast.success("Added to cart"))
        .catch((err) => toast.error(err || "Unable to add to cart"))
        .finally(() => setAddingProductId(null));
    },
    [dispatch, location.pathname, location.search, openAuthDrawer, quantities, user]
  );

  const handleProductClick = useCallback(
    (product) => {
      if (!product) return;
      const identifier = product.slug || product._id;
      if (!identifier) return;
      navigate(`/product/${identifier}`);
    },
    [navigate]
  );

  const currentPage = search?.page ?? 1;
  const pageSize = search?.limit ?? 24;
  const totalPages = Math.max(1, Math.ceil((totalItems || 0) / pageSize));
  const selectedCategory = search?.category ?? "all";
  const selectedTags = Array.isArray(search?.tags) ? search.tags : [];
  const hasPriceFilter =
    (search?.minPrice ?? null) !== null || (search?.maxPrice ?? null) !== null;

  const clearAllFilters = () => {
    if (!search) return;
    search.setCategory("all");
    search.setTags([]);
    search.clearPriceRange();
    toast.success("Filters cleared");
  };

  const seoElement = (
    <SEO
      title="All Products Catalogue"
      description="Browse every Ecommerce product across furniture, lighting, and lifestyle with advanced filters for price, tags, and stock."
      keywords={["Ecommerce products", "modern furniture catalogue", "shop online"]}
      openGraph={{ type: "website" }}
    />
  );

  if (!search && (productsStatus === "idle" || productsStatus === "loading")) {
    return (
      <>
        {seoElement}
        <div className="flex min-h-[50vh] items-center justify-center">
          <OneLoader size="large" text="Loading products..." />
        </div>
      </>
    );
  }

  return (
    <>
      {seoElement}
      <div className="mx-auto max-w-[1800px] px-4 py-10">
      {(selectedCategory !== "all" || selectedTags.length > 0 || hasPriceFilter) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-primary underline-offset-4 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="lg:flex lg:items-start lg:gap-6">
        <aside className="lg:w-64 lg:flex-shrink-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center gap-2">
            {[4, 5, 6, 7].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setColumns(count)}
                className={`flex h-10 w-10 items-center justify-center rounded-md border transition-all duration-200 ease-out hover:scale-105 hover:bg-gray-100 active:scale-95 ${
                  columns === count ? "border-primary bg-primary/10 scale-105" : "border-gray-200"
                }`}
                aria-label={`${count} columns`}
                aria-pressed={columns === count}
              >
                <span
                  className="grid gap-0.5 transition-all duration-200 ease-out"
                  style={{ gridTemplateColumns: `repeat(${count > 5 ? 4 : count}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: count }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-[1px] transition-colors duration-200 ${
                        columns === count ? "bg-primary" : "bg-gray-400"
                      }`}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <SlidersHorizontal size={16} />
                Quick filters
              </div>
              <button
                type="button"
                className="md:hidden flex items-center gap-1 text-xs font-semibold text-primary"
                onClick={handleMobileFilterToggle}
                aria-expanded={isFilterSectionVisible}
              >
                {isMobileFilterOpen ? "Hide" : "Show"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isMobileFilterOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            {isFilterSectionVisible && (
              <div className="flex flex-col gap-4 w-full">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                    disabled={categoriesStatus === "loading"}
                  >
                    <SelectTrigger className="w-full justify-between">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.path || category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Min price ({currencyLabel})</p>
                  <input
                    type="number"
                    value={priceInputs.min}
                    onChange={(event) =>
                      setPriceInputs((prev) => ({ ...prev, min: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min={0}
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Max price ({currencyLabel})</p>
                  <input
                    type="number"
                    value={priceInputs.max}
                    onChange={(event) =>
                      setPriceInputs((prev) => ({ ...prev, max: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min={0}
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Sort by</p>
                  <Select value={search.sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full justify-between">
                      <SelectValue placeholder="Sort products" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={applyPriceFilter} className="flex-1">
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={clearAllFilters}
                    disabled={
                      selectedCategory === "all" &&
                      selectedTags.length === 0 &&
                      !hasPriceFilter
                    }
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </section>
        </aside>

        <div className="mt-6 flex-1 space-y-6 lg:mt-0">
          {productsError && (
            <div className="rounded-xl border border-black/20 bg-black/5 p-4 text-sm text-black">
              {productsError}
            </div>
          )}

          <section className="space-y-6">
            <ProductGrid
              products={products}
              loading={productsStatus === "loading"}
              gridType={gridType}
              columns={columns}
              quantities={quantities}
              onQuantityChange={handleQuantityChange}
              onAddToCart={handleAddToCart}
              addingProductId={addingProductId}
              cartItems={cartItems}
              onProductClick={handleProductClick}
              searchTerm={search.searchTerm}
            />

            {totalPages > 1 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    search.setPage(page);
                    if (typeof window !== "undefined") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-10 lg:hidden">
        <BannerCarousel placement="sidebar" heightClass="h-[200px]" autoPlayDelay={7000} />
      </div>
      </div>
    </>
  );
};

export default Products;

