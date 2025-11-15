import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './redux/store';
import { Toaster } from './components/ui/sonner';
import TokenExpirationHandler from './components/custom/TokenExpirationHandler';
import ErrorBoundary from './components/custom/ErrorBoundary';
import OneLoader from './components/ui/OneLoader';
import { AuthDrawerProvider } from './contexts/AuthDrawerContext';

// Lazy-load pages
const RootLayout = lazy(() => import('./components/layouts/RootLayout'));
const AdminLayout = lazy(() => import('./components/layouts/AdminLayout'));
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
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));

const CreateProducts = lazy(() => import('./components/custom/CreateProducts'));
const AllProducts = lazy(() => import('./components/custom/AllProducts'));
const UpdateProduct = lazy(() => import('./components/custom/UpdateProduct'));
const Orders = lazy(() => import('./components/custom/Orders'));
const Media = lazy(() => import('./pages/Media'));
const ProductsPage = lazy(() => import('./pages/Products'));
const CategoriesPage = lazy(() => import('./pages/Categories'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const CartPage = lazy(() => import('./pages/Cart'));
const WishlistPage = lazy(() => import('./pages/Wishlist'));
const AdminBanners = lazy(() => import('./pages/AdminBanners'));
const AdminReviews = lazy(() => import('./pages/AdminReviews'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const SearchPage = lazy(() => import('./pages/Search'));

const queryClient = new QueryClient();

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
      path: '/product/:id',
      element: (
        <RootLayout>
          <ProductDetails />
        </RootLayout>
      ),
    },
    {
      path: '/admin/dashboard',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <CreateProducts />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/category',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <AdminCategories />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/dashboard/all-products',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <AllProducts />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/dashboard/update/:id',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <UpdateProduct />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/dashboard/users',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <Users />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/dashboard/orders',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <Orders />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/dashboard/banners',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <AdminBanners />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/dashboard/analytics',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <AdminAnalytics />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/dashboard/reviews',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <AdminReviews />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/dashboard/media',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <Media />
          </AdminLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/profile',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <AdminProfile />
          </AdminLayout>
        </ProtectedRoute>
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
