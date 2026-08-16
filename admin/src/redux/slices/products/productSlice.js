import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import productService from "./productService";

export const AddProduct = createAsyncThunk(
    'products/AddProduct',
    async (inputValues, thunkAPI) => {
        try {
            const res = await productService.createProduct(inputValues);
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const fetchProducts = createAsyncThunk(
    "products/fetchAll",
    async (
        {
            category,
            searchTerm,
            page = 1,
            limit = 24,
            stockFilter,
            sortBy = 'az',
            productIds,
            tags,
            minPrice,
            maxPrice,
            status,
            featured,
            bestseller,
            onSale,
            attributes,
            variations,
            visibility,
        },
        thunkAPI
    ) => {
        try {
            const res = await productService.allProduct({
                category,
                searchTerm,
                page,
                limit,
                stockFilter,
                sortBy,
                productIds,
                tags,
                minPrice,
                maxPrice,
                status,
                featured,
                bestseller,
                onSale,
                attributes,
                variations,
                visibility,
            });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const fetchNewArrivals = createAsyncThunk(
    "products/fetchNewArrivals",
    async (limit = 12, thunkAPI) => {
        try {
            const res = await productService.getNewArrivals(limit);
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const fetchBestSellers = createAsyncThunk(
    "products/fetchBestSellers",
    async (limit = 12, thunkAPI) => {
        try {
            const res = await productService.getBestSellers(limit);
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);


export const getSingleProduct = createAsyncThunk(
    "products/getSingleProduct",
    async (id, thunkAPI) => {
        try {
            const res = await productService.getSingleProd(id);
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const updateSingleProduct = createAsyncThunk(
    "products/updateSingleProduct",
    async ({ id, inputValues }, thunkAPI) => {
        try {
            const res = await productService.updateProd({ id, inputValues });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const deleteSingleProduct = createAsyncThunk(
    'products/deleteSingleProduct',
    async (id, thunkAPI) => {
        try {
            const res = await productService.deleteProduct(id);
            return { id, ...res };
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const importProductsFromExcel = createAsyncThunk(
    'products/importProductsFromExcel',
    async (excelFile, thunkAPI) => {
        try {
            const res = await productService.importProductsFromExcel(excelFile);
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const updateProductStock = createAsyncThunk(
    'products/updateProductStock',
    async ({ id, stock }, thunkAPI) => {
        try {
            const res = await productService.updateProductStock({ id, stock });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const fetchProductReviews = createAsyncThunk(
    'products/fetchProductReviews',
    async ({ identifier, page = 1, limit = 10, sort = 'recent' }, thunkAPI) => {
        try {
            const res = await productService.getProductReviews(identifier, { page, limit, sort });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const createProductReview = createAsyncThunk(
    'products/createProductReview',
    async ({ identifier, rating, title, comment }, thunkAPI) => {
        try {
            const res = await productService.createProductReview(identifier, { rating, title, comment });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const updateProductReview = createAsyncThunk(
    'products/updateProductReview',
    async ({ identifier, reviewId, rating, title, comment }, thunkAPI) => {
        try {
            const res = await productService.updateProductReview(identifier, reviewId, { rating, title, comment });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const deleteProductReview = createAsyncThunk(
    'products/deleteProductReview',
    async ({ identifier, reviewId }, thunkAPI) => {
        try {
            await productService.deleteProductReview(identifier, reviewId);
            return { reviewId };
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const fetchAllReviewsAdmin = createAsyncThunk(
    'products/fetchAllReviewsAdmin',
    async ({ page = 1, limit = 20, sort = 'recent' } = {}, thunkAPI) => {
        try {
            const res = await productService.getAllReviewsAdmin({ page, limit, sort });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

export const replyToProductReview = createAsyncThunk(
    'products/replyToProductReview',
    async ({ identifier, reviewId, message }, thunkAPI) => {
        try {
            const res = await productService.replyToProductReview(identifier, reviewId, { message });
            return res;
        } catch (error) {
            return thunkAPI.rejectWithValue(error);
        }
    }
);

const initialState = {
    products: [],
    singleProducts: null,
    status: 'idle',
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    newArrivals: [],
    newArrivalsStatus: 'idle',
    newArrivalsError: null,
    bestSellers: [],
    bestSellersStatus: 'idle',
    bestSellersError: null,
    reviews: [],
    reviewsStatus: 'idle',
    reviewsError: null,
    reviewPagination: null,
    reviewMutationStatus: 'idle',
    reviewMutationError: null,
    currentReviewIdentifier: null,
    reviewsContext: 'all',
};

export const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        clearReviews(state) {
            state.reviews = [];
            state.reviewsStatus = 'idle';
            state.reviewsError = null;
            state.reviewPagination = null;
            state.currentReviewIdentifier = null;
            state.reviewsContext = 'all';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(AddProduct.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(AddProduct.fulfilled, (state, action) => {
                state.status = 'succeeded';
                const newProduct = action.payload.product;
                
                // Transform the product to match the expected structure
                const transformedProduct = {
                    ...newProduct,
                    image: newProduct.picture?.secure_url || null
                };
                
                state.products.push(transformedProduct);
            })
            .addCase(AddProduct.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(fetchProducts.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.status = 'succeeded';
                const { data, pagination } = action.payload || {};
                
                
                state.products = data || [];
                state.currentPage = pagination?.page || 1;
                state.totalPages = pagination?.totalPages || 1;
                state.totalItems = pagination?.total || 0;
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(fetchNewArrivals.pending, (state) => {
                state.newArrivalsStatus = 'loading';
                state.newArrivalsError = null;
            })
            .addCase(fetchNewArrivals.fulfilled, (state, action) => {
                state.newArrivalsStatus = 'succeeded';
                const { data } = action.payload || {};
                state.newArrivals = data || [];
            })
            .addCase(fetchNewArrivals.rejected, (state, action) => {
                state.newArrivalsStatus = 'failed';
                state.newArrivalsError = action.payload;
            })
            .addCase(fetchBestSellers.pending, (state) => {
                state.bestSellersStatus = 'loading';
                state.bestSellersError = null;
            })
            .addCase(fetchBestSellers.fulfilled, (state, action) => {
                state.bestSellersStatus = 'succeeded';
                const { data } = action.payload || {};
                state.bestSellers = data || [];
            })
            .addCase(fetchBestSellers.rejected, (state, action) => {
                state.bestSellersStatus = 'failed';
                state.bestSellersError = action.payload;
            })
            .addCase(updateSingleProduct.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
           .addCase(updateSingleProduct.fulfilled, (state, action) => {
  state.status = 'succeeded';
  const updatedProduct = action.payload.product;

  const transformedProduct = {
    ...updatedProduct,
    image: updatedProduct.picture?.secure_url || null
  };

  // Find and update the product in the current list
  const index = state.products.findIndex(p => p._id === updatedProduct._id);
  if (index !== -1) {
    state.products[index] = transformedProduct;
  }
})
            .addCase(updateSingleProduct.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(getSingleProduct.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(getSingleProduct.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.singleProducts = action.payload.product;
            })
            .addCase(getSingleProduct.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(deleteSingleProduct.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(deleteSingleProduct.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.products = state.products.filter(prod => prod._id !== action.payload.id);
            })
            .addCase(deleteSingleProduct.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(importProductsFromExcel.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(importProductsFromExcel.fulfilled, (state, action) => {
                state.status = 'succeeded';
                // Refresh products after successful import
                // The products will be refetched by the component
            })
            .addCase(importProductsFromExcel.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(updateProductStock.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(updateProductStock.fulfilled, (state, action) => {
                state.status = 'succeeded';
                const updatedProduct = action.payload.product;
                
                // Find and update the product in the current list
                const index = state.products.findIndex(p => p._id === updatedProduct._id);
                if (index !== -1) {
                    state.products[index] = {
                        ...state.products[index],
                        stock: updatedProduct.stock
                    };
                }
            })
            .addCase(updateProductStock.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(fetchProductReviews.pending, (state, action) => {
                const page = action.meta.arg?.page || 1;
                state.reviewsError = null;
                state.reviewsStatus = page > 1 ? 'loadingMore' : 'loading';
                if (page === 1) {
                    state.reviews = [];
                    state.reviewPagination = null;
                    state.currentReviewIdentifier = action.meta.arg?.identifier || null;
                    state.reviewsContext = 'product';
                }
            })
            .addCase(fetchProductReviews.fulfilled, (state, action) => {
                state.reviewsStatus = 'succeeded';
                const { data } = action.payload || {};
                const { reviews = [], pagination = null } = data || {};
                const page = action.meta.arg?.page || 1;

                if (page > 1) {
                    const existingIds = new Set(state.reviews.map((review) => review._id));
                    const newReviews = reviews.filter((review) => !existingIds.has(review._id));
                    state.reviews = [...state.reviews, ...newReviews];
                } else {
                    state.reviews = reviews;
                }

                state.reviewPagination = pagination;
                if ((action.meta.arg?.page || 1) === 1) {
                    state.currentReviewIdentifier = action.meta.arg?.identifier || null;
                    state.reviewsContext = 'product';
                }
            })
            .addCase(fetchProductReviews.rejected, (state, action) => {
                state.reviewsStatus = 'failed';
                state.reviewsError = action.payload;
            })
            .addCase(createProductReview.pending, (state) => {
                state.reviewMutationStatus = 'loading';
                state.reviewMutationError = null;
            })
            .addCase(createProductReview.fulfilled, (state, action) => {
                state.reviewMutationStatus = 'succeeded';
                const review = action.payload?.data;
                if (review) {
                    state.reviews = [review, ...state.reviews.filter((r) => r._id !== review._id)];

                    if (state.reviewPagination) {
                        state.reviewPagination.total = (state.reviewPagination.total || 0) + 1;
                        const limit = state.reviewPagination.limit || state.reviews.length;
                        state.reviewPagination.pages = Math.ceil(state.reviewPagination.total / limit) || 1;
                        state.reviewPagination.page = 1;
                    }

                    if (state.singleProducts) {
                        const currentCount = state.singleProducts.ratingCount || 0;
                        const totalRating = (state.singleProducts.ratingAverage || 0) * currentCount;
                        const newCount = currentCount + 1;
                        const newAverage = newCount > 0 ? Number(((totalRating + (review.rating || 0)) / newCount).toFixed(2)) : 0;
                        state.singleProducts.ratingCount = newCount;
                        state.singleProducts.ratingAverage = newAverage;
                    }
                }
            })
            .addCase(createProductReview.rejected, (state, action) => {
                state.reviewMutationStatus = 'failed';
                state.reviewMutationError = action.payload;
            })
            .addCase(updateProductReview.pending, (state) => {
                state.reviewMutationStatus = 'loading';
                state.reviewMutationError = null;
            })
            .addCase(updateProductReview.fulfilled, (state, action) => {
                state.reviewMutationStatus = 'succeeded';
                const updatedReview = action.payload?.data;
                if (updatedReview) {
                    const index = state.reviews.findIndex((review) => review._id === updatedReview._id);
                    if (index !== -1) {
                        const previousRating = state.reviews[index].rating || 0;
                        state.reviews[index] = updatedReview;

                        if (state.singleProducts && state.singleProducts.ratingCount > 0) {
                            const count = state.singleProducts.ratingCount;
                            const totalRating = (state.singleProducts.ratingAverage || 0) * count;
                            const adjustedTotal = totalRating - previousRating + (updatedReview.rating || 0);
                            const newAverage = Number((adjustedTotal / count).toFixed(2));
                            state.singleProducts.ratingAverage = newAverage;
                        }
                    }
                }
            })
            .addCase(updateProductReview.rejected, (state, action) => {
                state.reviewMutationStatus = 'failed';
                state.reviewMutationError = action.payload;
            })
            .addCase(deleteProductReview.pending, (state) => {
                state.reviewMutationStatus = 'loading';
                state.reviewMutationError = null;
            })
            .addCase(deleteProductReview.fulfilled, (state, action) => {
                state.reviewMutationStatus = 'succeeded';
                const { reviewId } = action.payload || {};
                if (reviewId) {
                    const reviewIndex = state.reviews.findIndex((review) => review._id === reviewId);
                    if (reviewIndex !== -1) {
                        const removedReview = state.reviews[reviewIndex];
                        state.reviews.splice(reviewIndex, 1);

                        if (state.reviewPagination) {
                            state.reviewPagination.total = Math.max((state.reviewPagination.total || 1) - 1, 0);
                            const limit = state.reviewPagination.limit || Math.max(state.reviews.length, 1);
                            state.reviewPagination.pages = Math.max(Math.ceil(state.reviewPagination.total / limit), 1);
                            state.reviewPagination.page = Math.min(state.reviewPagination.page || 1, state.reviewPagination.pages);
                        }

                        if (state.singleProducts) {
                            const currentCount = state.singleProducts.ratingCount || 0;
                            const newCount = Math.max(currentCount - 1, 0);
                            if (newCount === 0) {
                                state.singleProducts.ratingAverage = 0;
                                state.singleProducts.ratingCount = 0;
                            } else {
                                const totalRating = (state.singleProducts.ratingAverage || 0) * currentCount;
                                const adjustedTotal = totalRating - (removedReview.rating || 0);
                                const newAverage = Number((adjustedTotal / newCount).toFixed(2));
                                state.singleProducts.ratingAverage = newAverage;
                                state.singleProducts.ratingCount = newCount;
                            }
                        }
                    }
                }
            })
            .addCase(deleteProductReview.rejected, (state, action) => {
                state.reviewMutationStatus = 'failed';
                state.reviewMutationError = action.payload;
            })
            .addCase(fetchAllReviewsAdmin.pending, (state, action) => {
                const page = action.meta.arg?.page || 1;
                state.reviewsError = null;
                state.reviewsStatus = page > 1 ? 'loadingMore' : 'loading';
                if (page === 1) {
                    state.reviews = [];
                    state.reviewPagination = null;
                    state.reviewsContext = 'all';
                    state.currentReviewIdentifier = null;
                }
            })
            .addCase(fetchAllReviewsAdmin.fulfilled, (state, action) => {
                state.reviewsStatus = 'succeeded';
                const { data } = action.payload || {};
                const { reviews = [], pagination = null } = data || {};
                const page = action.meta.arg?.page || 1;

                if (page > 1) {
                    const existingIds = new Set(state.reviews.map((review) => review._id));
                    const newReviews = reviews.filter((review) => !existingIds.has(review._id));
                    state.reviews = [...state.reviews, ...newReviews];
                } else {
                    state.reviews = reviews;
                }

                state.reviewPagination = pagination;
                state.reviewsContext = 'all';
                state.currentReviewIdentifier = null;
            })
            .addCase(fetchAllReviewsAdmin.rejected, (state, action) => {
                state.reviewsStatus = 'failed';
                state.reviewsError = action.payload;
            })
            .addCase(replyToProductReview.pending, (state) => {
                state.reviewMutationStatus = 'loading';
                state.reviewMutationError = null;
            })
            .addCase(replyToProductReview.fulfilled, (state, action) => {
                state.reviewMutationStatus = 'succeeded';
                const updatedReview = action.payload?.data;
                if (updatedReview) {
                    const index = state.reviews.findIndex((review) => review._id === updatedReview._id);
                    if (index !== -1) {
                        state.reviews[index] = {
                            ...state.reviews[index],
                            ...updatedReview,
                        };
                    } else {
                        state.reviews = [updatedReview, ...state.reviews];
                    }
                }
            })
            .addCase(replyToProductReview.rejected, (state, action) => {
                state.reviewMutationStatus = 'failed';
                state.reviewMutationError = action.payload;
            })

    }
});

export const { clearReviews } = productsSlice.actions;

export default productsSlice.reducer;