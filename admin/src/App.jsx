import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { Suspense, lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/reactQueryConfig';
import { store } from './redux/store';
import { Toaster } from './components/ui/sonner';
import TokenExpirationHandler from './components/custom/TokenExpirationHandler';
import ErrorBoundary from './components/custom/ErrorBoundary';
import OneLoader from './components/ui/OneLoader';

// Lazy-load pages
const AdminLayout = lazy(() => import('./components/layouts/AdminLayout'));
const ProtectedRoute = lazy(() => import('./components/custom/ProtectedRoute'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));

const CreateProducts = lazy(() => import('./components/custom/CreateProducts'));
const AllProducts = lazy(() => import('./components/custom/AllProducts'));
const UpdateProduct = lazy(() => import('./components/custom/UpdateProduct'));
const Orders = lazy(() => import('./components/custom/Orders'));
const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const Users = lazy(() => import('./pages/Users'));
const AdminBanners = lazy(() => import('./pages/AdminBanners'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminChat = lazy(() => import('./pages/AdminChat'));
const AdminReviews = lazy(() => import('./pages/AdminReviews'));
const DriverConsole = lazy(() => import('./pages/DriverConsole'));
const Media = lazy(() => import('./pages/Media'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));

const RootRedirect = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  if (isAuthenticated && (user?.role === 1 || user?.role === 2)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

const NotFound = () => (
  <div className="flex min-h-svh flex-col items-center justify-center gap-2 text-center">
    <h1 className="text-2xl font-bold">Page not found</h1>
    <a href="/" className="text-sm text-primary underline">Go home</a>
  </div>
);

const App = () => {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <RootRedirect />,
    },
    {
      path: '/login',
      element: <AdminLogin />,
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
      path: '/admin/dashboard/chat',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <AdminChat />
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
      path: '/admin/dashboard/driver-console',
      element: (
        <ProtectedRoute>
          <AdminLayout>
            <DriverConsole />
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
      element: <NotFound />,
    },
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Toaster />
        <TokenExpirationHandler />
        <ErrorBoundary>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><OneLoader size="large" text="Loading..." /></div>}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </Provider>
    </QueryClientProvider>
  );
};

export default App;
