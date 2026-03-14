import React from 'react';
import { usePendingOrdersCount } from '@/hooks/use-pending-orders-count';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';

/**
 * Pending Orders Badge Component
 * 
 * Displays real-time pending orders count using Redis-backed endpoint
 * Auto-refreshes every 5 seconds
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.enabled - Enable/disable polling
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler
 */
const PendingOrdersBadge = ({ 
  enabled = true, 
  className = '',
  onClick,
}) => {
  const { count, loading, error } = usePendingOrdersCount({
    enabled,
    refreshInterval: 5000, // 5 seconds to match Redis TTL
    fallbackCount: 0,
  });

  if (error && !loading) {
    // Silent fail - don't show error, just show 0 or hide badge
    return null;
  }

  return (
    <Badge
      variant={count > 0 ? 'destructive' : 'secondary'}
      className={`flex items-center gap-1.5 ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {loading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>...</span>
        </>
      ) : (
        <>
          <Package className="h-3 w-3" />
          <span>{count}</span>
        </>
      )}
    </Badge>
  );
};

export default PendingOrdersBadge;

