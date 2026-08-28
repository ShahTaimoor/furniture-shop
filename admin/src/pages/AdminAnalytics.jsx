import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/redux/slices/auth/axiosInstance';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, PiggyBank, Percent, Package, Coins } from 'lucide-react';
import SEO from '@/components/seo/SEO';
import OneLoader from '@/components/ui/OneLoader';
import { selectCurrency } from '@/redux/slices/settings/settingsSlice';

// Site currency setting -> ISO 4217 code Intl.NumberFormat expects.
const CURRENCY_ISO_MAP = { none: 'PKR', usd: 'USD', gbp: 'GBP', eur: 'EUR', pkr: 'PKR' };

// Validated categorical palette (see dataviz skill reference palette) — fixed
// order, never cycled. Used only as icon-badge accents, never as the sole
// carrier of meaning (every tile keeps a plain-ink label + value).
const HUES = {
  blue: '#2a78d6',
  orange: '#eb6834',
  aqua: '#1baf7a',
  yellow: '#eda100',
  magenta: '#e87ba4',
  green: '#008300',
  violet: '#4a3aa7'
};

const makeNumberFormatter = (currency) => (value = 0) => {
  if (!Number.isFinite(value)) return '0';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(value);
  } catch {
    return value.toLocaleString();
  }
};

// Stat-tile values auto-compact (e.g. Rs. 40.0M, not Rs. 40,037,134) — the
// exact figure is still available via the title tooltip.
const makeCompactCurrencyFormatter = (currency, numberFormatter) => (value = 0) => {
  if (!Number.isFinite(value)) return '0';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  } catch {
    return numberFormatter(value);
  }
};

const plainNumberFormatter = (value = 0) => {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-GB', { maximumFractionDigits: 0 });
};

const StatTile = ({ label, value, exactValue, helper, icon: Icon, hue }) => (
  <Card className="shadow-sm">
    <CardContent className="flex items-start justify-between gap-4 py-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div
          className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums truncate"
          title={exactValue}
        >
          {value}
        </div>
        <p className="text-xs text-slate-500 mt-1.5">{helper}</p>
      </div>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: hue ? `${hue}1f` : '#f1f5f9' }}
      >
        <Icon className="h-5 w-5" style={{ color: hue || '#64748b' }} />
      </span>
    </CardContent>
  </Card>
);

const BAR_GRID_STEPS = [0, 0.25, 0.5, 0.75, 1];

// Horizontal bar chart: magnitude comparison across metrics is a sequential
// job (one hue), not categorical — see dataviz skill choosing-a-form.md.
const FinancialBarChart = ({ series, maxValue, numberFormatter, compactCurrencyFormatter }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Financial Distribution</h2>
          <p className="text-sm text-slate-500 mt-1">
            Inventory value and realized performance, compared by size.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          {showTable ? 'View chart' : 'View table'}
        </button>
      </div>

      {showTable ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Metric</th>
                <th className="py-2 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {series.map((item) => (
                <tr key={item.label} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 text-slate-700">{item.label}</td>
                  <td className="py-2 text-right font-semibold text-slate-900 tabular-nums">
                    {numberFormatter(item.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6">
          <div className="ml-36 sm:ml-44 mb-1 flex text-[11px] text-slate-400 tabular-nums">
            {BAR_GRID_STEPS.map((step) => (
              <div key={step} className="flex-1 text-center first:text-left last:text-right">
                {compactCurrencyFormatter(maxValue * step)}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {series.map((item, index) => {
              const percentage = maxValue ? Math.min(100, Math.max(0, (item.value / maxValue) * 100)) : 0;
              const isHovered = hoveredIndex === index;
              const tooltipLeft = Math.min(96, Math.max(4, percentage));
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div
                    className="w-36 sm:w-44 shrink-0 truncate text-right text-sm text-slate-700"
                    title={item.label}
                  >
                    {item.label}
                  </div>
                  <div className="relative h-6 flex-1">
                    <div className="absolute inset-0 flex">
                      {BAR_GRID_STEPS.map((step) => (
                        <div
                          key={step}
                          className="flex-1 border-l first:border-l-0"
                          style={{ borderColor: '#e1e0d9' }}
                        />
                      ))}
                    </div>
                    <div className="absolute left-0 top-0 bottom-0 w-px" style={{ backgroundColor: '#c3c2b7' }} />
                    <button
                      type="button"
                      className="absolute left-0 top-1/2 h-[22px] -translate-y-1/2 rounded-r-[4px] outline-none transition-[filter] duration-150 focus-visible:ring-2 focus-visible:ring-offset-1"
                      style={{
                        width: `${percentage}%`,
                        minWidth: '4px',
                        backgroundColor: HUES.blue,
                        filter: isHovered ? 'brightness(0.88)' : 'none'
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(index)}
                      onBlur={() => setHoveredIndex(null)}
                      aria-label={`${item.label}: ${numberFormatter(item.value)}`}
                    />
                    {isHovered && (
                      <div
                        className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                        style={{ left: `${tooltipLeft}%`, transform: 'translateX(-50%)' }}
                      >
                        <span className="font-semibold">{numberFormatter(item.value)}</span>
                        <span className="ml-1 text-slate-300">{item.label}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-28 shrink-0 whitespace-nowrap text-right text-sm font-semibold text-slate-900 tabular-nums">
                    {numberFormatter(item.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const currency = useSelector(selectCurrency);
  const isoCurrency = CURRENCY_ISO_MAP[currency] || 'PKR';
  const numberFormatter = useMemo(() => makeNumberFormatter(isoCurrency), [isoCurrency]);
  const compactCurrencyFormatter = useMemo(
    () => makeCompactCurrencyFormatter(isoCurrency, numberFormatter),
    [isoCurrency, numberFormatter]
  );

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
          <OneLoader size="medium" showText={false} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <StatTile
              label="Total Products"
              value={plainNumberFormatter(metrics.totalProducts)}
              exactValue={plainNumberFormatter(metrics.totalProducts)}
              helper="Active products contributing to metrics."
              icon={Package}
              hue={HUES.blue}
            />
            <StatTile
              label="Total Cost"
              value={compactCurrencyFormatter(metrics.totalCost)}
              exactValue={numberFormatter(metrics.totalCost)}
              helper="Aggregate procurement cost."
              icon={PiggyBank}
              hue={HUES.orange}
            />
            <StatTile
              label="Total Sales Value"
              value={compactCurrencyFormatter(metrics.totalSalesValue)}
              exactValue={numberFormatter(metrics.totalSalesValue)}
              helper="Projected revenue from sale prices."
              icon={TrendingUp}
              hue={HUES.aqua}
            />
            <StatTile
              label="Inventory Profit"
              value={compactCurrencyFormatter(metrics.totalProfit)}
              exactValue={numberFormatter(metrics.totalProfit)}
              helper="Sale value minus cost."
              icon={Coins}
              hue={HUES.yellow}
            />
            <StatTile
              label="Realized Revenue"
              value={compactCurrencyFormatter(metrics.totalRevenue)}
              exactValue={numberFormatter(metrics.totalRevenue)}
              helper="Revenue from recorded unit sales."
              icon={TrendingUp}
              hue={HUES.magenta}
            />
            <StatTile
              label="Realized Profit"
              value={compactCurrencyFormatter(metrics.realizedProfit)}
              exactValue={numberFormatter(metrics.realizedProfit)}
              helper={`Based on actual units sold (margin ${Number(metrics.averageMargin || 0).toFixed(2)}%).`}
              icon={Coins}
              hue={HUES.green}
            />
            <StatTile
              label="Avg. Discount"
              value={`${Number(metrics.averageDiscount || 0).toFixed(2)}%`}
              exactValue={`${Number(metrics.averageDiscount || 0).toFixed(2)}%`}
              helper="Average markdown applied across products."
              icon={Percent}
              hue={HUES.violet}
            />
            <StatTile
              label="Inventory Overview"
              value={plainNumberFormatter(metrics.totalStock)}
              exactValue={plainNumberFormatter(metrics.totalStock)}
              helper={`Total units currently in stock (${plainNumberFormatter(metrics.totalUnitsSold)} sold).`}
              icon={Package}
              hue={null}
            />
          </div>

          {chartSeries.length > 0 && (
            <Card className="shadow-sm">
              <CardContent className="py-5">
                <FinancialBarChart
                  series={chartSeries}
                  maxValue={chartMaxValue}
                  numberFormatter={numberFormatter}
                  compactCurrencyFormatter={compactCurrencyFormatter}
                />
                <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
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


