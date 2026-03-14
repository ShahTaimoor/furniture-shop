import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { fetchProducts } from '@/redux/slices/products/productSlice';
import { addToCart } from '@/redux/slices/cart/cartSlice';
import SEO from '@/components/seo/SEO';
import ProductCard from '@/components/custom/ProductCard';
import { toast } from 'sonner';

const SearchPage = () => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const query = (searchParams.get('query') || '').trim();
	const [page, setPage] = useState(1);
	const limit = 24;

	const { products, status, error, totalItems, totalPages } = useSelector((s) => s.products);
	const { user } = useSelector((s) => s.auth);
	const { items: cartItems = [] } = useSelector((s) => s.cart);

	// Quantities and adding state
	const [quantities, setQuantities] = useState({});
	const [addingProductId, setAddingProductId] = useState(null);

	// Initialize quantities when products change
	useEffect(() => {
		if (Array.isArray(products) && products.length > 0) {
			const initial = {};
			products.filter((p) => p && p._id).forEach((p) => {
				initial[p._id] = p.stock > 0 ? 1 : 0;
			});
			setQuantities(initial);
		}
	}, [products]);

	// Helpers
	const isInCartMap = useMemo(() => {
		const map = new Map();
		cartItems.forEach((item) => {
			const productId = item.product?._id || item.product;
			if (productId) map.set(productId, true);
		});
		return map;
	}, [cartItems]);

	const handleQuantityChange = useCallback((productId, value, stock) => {
		if (value === '') {
			setQuantities((prev) => ({ ...prev, [productId]: '' }));
			return;
		}
		const newValue = Math.max(Math.min(parseInt(value, 10), stock || 999), 1);
		setQuantities((prev) => ({ ...prev, [productId]: newValue }));
	}, []);

	const handleAddToCart = useCallback((product) => {
		const qty = parseInt(quantities[product._id], 10);
		if (!qty || qty <= 0) {
			toast.warning('Please select at least 1 item');
			return;
		}
		setAddingProductId(product._id);
		dispatch(addToCart({ productId: product._id, quantity: qty }))
			.then(() => {
				toast.success('Product added to cart', { duration: 3000 });
			})
			.finally(() => setAddingProductId(null));
	}, [dispatch, quantities]);

	useEffect(() => {
		// reset page when query changes
		setPage(1);
	}, [query]);

	useEffect(() => {
		if (query) {
			dispatch(fetchProducts({ searchTerm: query, page, limit }));
		} else {
			// If empty query, fetch nothing here
		}
	}, [dispatch, query, page]);

	const seoDescription = query
		? `Search results for "${query}" across our catalogue.`
		: 'Search the entire catalogue for products.';

	const onSubmitNewQuery = (e) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const term = String(formData.get('q') || '').trim();
		setSearchParams(term ? { query: term } : {});
		setPage(1);
	};

	const showLoading = status === 'loading' && (products?.length === 0 || page === 1);
	const hasError = status === 'failed' && error;
	const isEmpty = status === 'succeeded' && Array.isArray(products) && products.length === 0;

	return (
		<>
			<SEO
				title={query ? `Search: ${query}` : 'Search Products'}
				description={seoDescription}
				keywords={query ? ['search', query] : ['search']}
				openGraph={{ type: 'website' }}
			/>
			<div className="bg-gray-50 py-10">
				<div className="mx-auto flex max-w-7xl flex-col gap-6 px-4">
					<header className="flex flex-col gap-3">
						<h1 className="text-2xl font-bold text-gray-900">Search</h1>
						<form onSubmit={onSubmitNewQuery} className="flex gap-2">
							<input
								name="q"
								type="text"
								defaultValue={query}
								placeholder="What are you looking for?"
								className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							/>
							<button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90">Search</button>
						</form>
						{query && (
							<p className="text-sm text-gray-600">Showing results for: <span className="font-semibold">{query}</span> ({totalItems || 0})</p>
						)}
					</header>

					{showLoading && (
						<div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">Loading results…</div>
					)}

					{hasError && (
						<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(error)}</div>
					)}

					{isEmpty && (
						<div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
							<p className="text-lg text-gray-700 mb-2">No products found</p>
							<p className="text-sm text-gray-500">Try a different keyword or <Link to="/products" className="text-primary underline">browse all products</Link>.</p>
						</div>
					)}

					{status === 'succeeded' && products && products.length > 0 && (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{products.filter((p) => p && p._id).map((p) => (
									<ProductCard
										key={p._id}
										product={p}
										quantity={quantities[p._id] || 1}
										onQuantityChange={handleQuantityChange}
										onAddToCart={handleAddToCart}
										isAddingToCart={addingProductId === p._id}
										isInCart={isInCartMap.get(p._id) || false}
										gridType={'grid2'}
										onProductClick={(product) => navigate(`/product/${product.slug || product._id}`)}
										searchTerm={query}
									/>
								))}
							</div>

							{totalPages > 1 && (
								<div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
									<p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
									<div className="flex items-center gap-2">
										<button
											type="button"
											disabled={page <= 1}
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 transition hover:border-primary hover:text-primary disabled:opacity-50"
										>
											Previous
										</button>
										<button
											type="button"
											disabled={page >= totalPages}
											onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
											className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 transition hover:border-primary hover:text-primary disabled:opacity-50"
										>
											Next
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</>
	);
};

export default SearchPage;

