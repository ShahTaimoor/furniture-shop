# Quick Start: Frontend Redis Integration

## 🚀 Quick Integration Examples

### 1. Product List (5 minutes)

```jsx
import { useProducts } from '@/hooks/use-products';

function MyProducts() {
  const { data, loading, error, refetch } = useProducts({
    filters: { category: 'all', page: 1, limit: 24 }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data.map(p => <div key={p._id}>{p.title}</div>)}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### 2. Single Product (3 minutes)

```jsx
import { useProduct } from '@/hooks/use-product';

function ProductPage({ productId }) {
  const { data, loading, error } = useProduct(productId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{data?.title} - PKR {data?.salePrice}</div>;
}
```

### 3. Categories (3 minutes)

```jsx
import { useCategories } from '@/hooks/use-categories';

function Categories() {
  const { tree, flat, loading } = useCategories();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Tree Structure</h2>
      {tree.map(cat => <div key={cat._id}>{cat.name}</div>)}
      
      <h2>All Categories ({flat.length})</h2>
      {flat.map(cat => <div key={cat._id}>{cat.name}</div>)}
    </div>
  );
}
```

### 4. Pending Orders Badge (2 minutes)

```jsx
import PendingOrdersBadge from '@/components/custom/PendingOrdersBadge';

function AdminMenu() {
  return (
    <div>
      Orders <PendingOrdersBadge />
    </div>
  );
}
```

### 5. Admin Analytics (5 minutes)

```jsx
import { useAnalytics } from '@/hooks/use-analytics';

function Dashboard() {
  const { data, loading } = useAnalytics({
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Total Sales: {data?.data?.totalSales?.count}</h2>
      <h2>Users: {data?.data?.users?.count}</h2>
    </div>
  );
}
```

## 📋 Available Hooks

| Hook | Purpose | Polling Support |
|------|---------|----------------|
| `useProducts` | Product list | ✅ Yes |
| `useProduct` | Single product | ❌ No |
| `useCategories` | Category list | ❌ No |
| `usePendingOrdersCount` | Pending orders | ✅ Yes (5s) |
| `useAnalytics` | Admin metrics | ❌ No |
| `useFinancialAnalytics` | Financial stats | ❌ No |

## 🔧 Common Patterns

### Enable Polling

```jsx
// Poll every 5 seconds
const { count } = usePendingOrdersCount({
  refreshInterval: 5000
});

// Poll every 1 minute
const { data } = useProducts({
  pollInterval: 60000
});
```

### Error Handling

```jsx
const { data, error, refetch } = useProducts();

if (error) {
  return (
    <div>
      <p>Error: {error}</p>
      <button onClick={refetch}>Retry</button>
    </div>
  );
}
```

### Conditional Fetching

```jsx
const { data } = useProduct(productId, {
  enabled: !!productId // Only fetch if productId exists
});
```

## 📁 File Locations

- **Hooks:** `src/hooks/`
- **API Services:** `src/api/`
- **Components:** `src/components/custom/`
- **Examples:** `src/examples/`

## ✅ Security Checklist

- ✅ No Redis credentials in frontend
- ✅ All Redis operations server-side
- ✅ Frontend only calls REST APIs
- ✅ Authentication via httpOnly cookies

## 🎯 Next Steps

1. Import the hook you need
2. Use it in your component
3. Handle loading/error states
4. Add polling if needed for real-time updates

That's it! Your frontend now safely accesses Redis-powered data through backend APIs.

