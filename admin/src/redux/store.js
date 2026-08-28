
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/auth/authSlice'
import categoriesReducer from './slices/categories/categoriesSlice'
import productsReducer from './slices/products/productSlice'
import ordersReducer from './slices/order/orderSlice'
import bannersReducer from './slices/banners/bannersSlice'
import chatReducer from './slices/chat/chatSlice'
import settingsReducer from './slices/settings/settingsSlice'
import { setStoreReference } from './slices/auth/axiosInstance'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        products: productsReducer,
        categories: categoriesReducer,
        orders: ordersReducer,
        banners: bannersReducer,
        chat: chatReducer,
        settings: settingsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types
                ignoredActions: [
                    'products/fetchAll/fulfilled',
                    'products/getSingleProduct/fulfilled',
                    'products/AddProduct/fulfilled',
                    'products/updateSingleProduct/fulfilled',
                    'products/importProductsFromExcel/fulfilled',
                ],
                // Ignore these field paths in all actions
                ignoredActionPaths: ['payload.timestamp', 'payload.error.stack'],
                // Ignore these paths in the state
                ignoredPaths: [
                    'products.products',
                    'products.singleProducts',
                    'auth.user',
                ],
                // Increase the warning threshold to 50ms
                warnAfter: 50,
            },
        }),
})

// Set the store reference for axiosInstance
setStoreReference(store)
