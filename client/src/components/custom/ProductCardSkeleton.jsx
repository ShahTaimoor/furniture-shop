import React from 'react';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

const ProductCardSkeleton = ({ gridType = 'grid2', showCartControls = true }) => {
  const cardClass = cn(
    'relative flex h-full bg-white rounded-lg overflow-hidden',
    gridType === 'grid3' ? 'flex-row items-stretch' : 'flex-col w-full'
  );

  const mediaWrapperClass = cn(
    'relative overflow-hidden bg-gray-50 shrink-0',
    gridType === 'grid3'
      ? 'w-36 sm:w-56 md:w-64 aspect-square sm:aspect-auto'
      : 'w-full aspect-square'
  );

  const bodyClass = cn(
    'flex flex-1 flex-col gap-2 p-3',
    gridType === 'grid3' && 'sm:p-4'
  );

  return (
    <div className={cardClass}>
      <div className={mediaWrapperClass}>
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className={bodyClass}>
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-4 w-1/2" />
        {showCartControls && (
          <div className="mt-auto pt-2 flex items-center gap-2 border-t border-gray-200">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
