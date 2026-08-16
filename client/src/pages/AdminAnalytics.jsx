import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/redux/slices/auth/axiosInstance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, PiggyBank, Percent, Package, Coins } from 'lucide-react';
import SEO from '@/components/seo/SEO';

const numberFormatter = (value = 0, currency = 'GBP') => {
  if (!Number.isFinite(value)) return '0';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(value);
  } catch {
    return `£${value.toLocaleString()}`;
  }
};

const plainNumberFormatter = (value = 0) => {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-GB', { maximumFractionDigits: 0 });
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 2) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/pg/analytics/financial');
        if (response?.data?.success) {
          setMetrics(response.data.data);
        } else {
          setError(response?.data?.message || 'Failed to load analytics data');
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, navigate]);

  if (!user || user.role !== 2) {
    return null;
  }

  const chartSeries = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: 'Inventory Sale Value', value: metrics.totalSalesValue },
      { label: 'Inventory Cost', value: metrics.totalCost },
      { label: 'Realized Revenue', value: metrics.totalRevenue },
      { label: 'Realized Cost', value: metrics.realizedCost },
      { label: 'Realized Profit', value: metrics.realizedProfit }
    ].filter(
      (series) => Number.isFinite(series.value) && series.value !== null && series.value !== undefined
    );
  }, [metrics]);

  const chartMaxValue = useMemo(() => {
    if (!chartSeries.length) return 1;
    const max = Math.max(...chartSeries.map((series) => series.value));
    return Number.isFinite(max) && max > 0 ? max : 1;
  }, [chartSeries]);

  return (
    <>
      <SEO
        title="Admin Analytics Dashboard"
        description="Track real-time Ecommerce revenue, inventory, discounting, and profitability metrics in the secure admin console."
        keywords={['admin analytics', 'ecommerce dashboard']}
        noIndex
        openGraph={{ type: 'website' }}
      />
      <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Analytics</h1>
          <p className="text-sm text-slate-600 mt-1">
            Overview of profit, revenue, and discount performance across all products.
          </p>
        </div>
        <Badge variant="outline" className="text-sm text-slate-600 border-slate-300">
          Super Admin Access
        </Badge>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <Card className="border-2 border-rose-200 bg-rose-50">
          <CardContent className="py-6">
            <p className="text-sm text-rose-600">{error}</p>
          </CardContent>
        </Card>
      ) : (
        metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Products</CardTitle>
                <Package className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {metrics.totalProducts}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Active products contributing to metrics.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Cost</CardTitle>
                <PiggyBank className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {numberFormatter(metrics.totalCost)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Aggregate procurement cost.</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Sales Value</CardTitle>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {numberFormatter(metrics.totalSalesValue)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Projected revenue from sale prices.</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Inventory Profit</CardTitle>
                <Coins className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {numberFormatter(metrics.totalProfit)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Sale value minus cost.</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Realized Revenue</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {numberFormatter(metrics.totalRevenue)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Revenue from recorded unit sales.</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Realized Profit</CardTitle>
                <Coins className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {numberFormatter(metrics.realizedProfit)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Based on actual units sold (margin {Number(metrics.averageMargin || 0).toFixed(2)}%).
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Avg. Discount</CardTitle>
                <Percent className="h-5 w-5 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {Number(metrics.averageDiscount || 0).toFixed(2)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Average markdown applied across products.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Inventory Overview</CardTitle>
                <Package className="h-5 w-5 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {metrics.totalStock}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Total units currently in stock ({metrics.totalUnitsSold} sold).
                </p>
              </CardContent>
            </Card>
          </div>

          {chartSeries.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Financial Distribution
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Relative comparison of inventory values versus realized sales performance.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {chartSeries.map((series) => {
                  const percentage = chartMaxValue ? (series.value / chartMaxValue) * 100 : 0;
                  return (
                    <div key={series.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span className="font-medium text-slate-800">{series.label}</span>
                        <span className="font-semibold text-slate-900">
                          {numberFormatter(series.value)}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500">
                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                    Peak value {numberFormatter(chartMaxValue)}
                  </Badge>
                  <span>
                    Total records analysed: {plainNumberFormatter(metrics.totalProducts)} products
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        )
      )}
      </div>
    </>
  );
};

export default AdminAnalytics;


