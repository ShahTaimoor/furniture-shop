import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Suspense, lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/reactQueryConfig';
import { store } from './redux/store';
import { Toaster } from './components/ui/sonner';
import TokenExpirationHandler from './components/custom/TokenExpirationHandler';
import ErrorBoundary from './components/custom/ErrorBoundary';
import OneLoader from './components/ui/OneLoader';
import { AuthDrawerProvider } from './contexts/AuthDrawerContext';

// Lazy-load pages
const RootLayout = lazy(() => import('./components/layouts/RootLayout'));
const ProtectedRoute = lazy(() => import('./components/custom/ProtectedRoute'));

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const Success = lazy(() => import('./pages/Success'));
const ErrorPage = lazy(() => import('./pages/Error'));
const CategoryBrowse = lazy(() => import('./pages/CategoryBrowse'));
const Profile = lazy(() => import('./pages/Profile'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));

const ProductsPage = lazy(() => import('./pages/Products'));
const CategoriesPage = lazy(() => import('./pages/Categories'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const CartPage = lazy(() => import('./pages/Cart'));
const WishlistPage = lazy(() => import('./pages/Wishlist'));
const SearchPage = lazy(() => import('./pages/Search'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const ChatPage = lazy(() => import('./pages/Chat'));
const Shipping = lazy(() => import('./pages/Shipping'));
const Returns = lazy(() => import('./pages/Returns'));
const Care = lazy(() => import('./pages/Care'));
const Warranty = lazy(() => import('./pages/Warranty'));

const App = () => {
  const router = createBrowserRouter([
    {
      path: '/',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <Home />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/category/:slug/*',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <CategoryBrowse />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/products',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <ProductsPage />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/categories',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <CategoriesPage />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/about',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <About />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/contact',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <Contact />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/cart',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <CartPage />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/wishlist',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <WishlistPage />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/shipping',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <Shipping />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/returns',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <Returns />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/care',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <Care />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/warranty',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <Warranty />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/search',
      element: (
        <RootLayout>
          <ErrorBoundary>
            <SearchPage />
          </ErrorBoundary>
        </RootLayout>
      ),
    },
    {
      path: '/login',
      element: (
        <RootLayout>
          <Login />
        </RootLayout>
      ),
    },
    {
      path: '/signup',
      element: (
        <RootLayout>
          <Signup />
        </RootLayout>
      ),
    },
    {
      path: '/checkout',
      element: (
        <ProtectedRoute>
          <RootLayout>
            <Checkout />
          </RootLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/order-confirmation',
      element: (
        <ProtectedRoute>
          <RootLayout>
            <OrderConfirmation />
          </RootLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/orders',
      element: (
        <ProtectedRoute>
          <RootLayout>
            <MyOrders />
          </RootLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/track-order/:orderId',
      element: (
        <ProtectedRoute>
          <RootLayout>
            <TrackOrder />
          </RootLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/my-orders',
      element: (
        <ProtectedRoute>
          <RootLayout>
            <MyOrders />
          </RootLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/success',
      element: (
        <RootLayout>
          <Success />
        </RootLayout>
      ),
    },
    {
      path: '/profile',
      element: (
        <ProtectedRoute>
          <RootLayout>
            <Profile />
          </RootLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/chat',
      element: (
        <ProtectedRoute>
          <RootLayout>
            <ChatPage />
          </RootLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/product/:id',
      element: (
        <RootLayout>
          <ProductDetails />
        </RootLayout>
      ),
    },
    {
      path: '*',
      element: (
        <RootLayout>
          <ErrorPage />
        </RootLayout>
      ),
    },
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthDrawerProvider>
          <Toaster />
          <TokenExpirationHandler />
          <ErrorBoundary>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><OneLoader size="large" text="Loading..." /></div>}>
              <RouterProvider router={router} />
            </Suspense>
          </ErrorBoundary>
        </AuthDrawerProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;
