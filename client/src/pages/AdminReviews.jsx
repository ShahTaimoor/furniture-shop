import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearReviews,
  fetchProductReviews,
  fetchAllReviewsAdmin,
  replyToProductReview
} from '@/redux/slices/products/productSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import OneLoader from '@/components/ui/OneLoader';
import { toast } from 'sonner';
import { Star, Loader2, MessageCircleReply, RefreshCw } from 'lucide-react';
import SEO from '@/components/seo/SEO';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest rating' },
  { value: 'lowest', label: 'Lowest rating' }
];

const AdminReviews = () => {
  const dispatch = useDispatch();
  const {
    reviews,
    reviewsStatus,
    reviewPagination,
    reviewMutationStatus,
    currentReviewIdentifier,
    reviewsContext
  } = useSelector((state) => state.products);

  const [identifierInput, setIdentifierInput] = useState('');
  const [activeIdentifier, setActiveIdentifier] = useState('__all__');
  const [sortOption, setSortOption] = useState('recent');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [loadingIdentifier, setLoadingIdentifier] = useState(false);

  useEffect(() => {
    const drafts = {};
    reviews.forEach((review) => {
      drafts[review._id] = review.adminResponse?.message || '';
    });
    setReplyDrafts((prev) => ({ ...drafts, ...prev }));
  }, [reviews]);

  const canLoadMore = useMemo(() => {
    if (!reviewPagination) return false;
    const { page = 1, pages = 1 } = reviewPagination;
    return page < pages;
  }, [reviewPagination]);

  useEffect(() => {
    dispatch(fetchAllReviewsAdmin({ page: 1, limit: 10, sort: sortOption }));
    return () => {
      dispatch(clearReviews());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeIdentifier === '__all__') {
      dispatch(fetchAllReviewsAdmin({ page: 1, limit: 10, sort: sortOption }));
    } else if (activeIdentifier) {
      dispatch(
        fetchProductReviews({
          identifier: activeIdentifier,
          page: 1,
          limit: 10,
          sort: sortOption
        })
      );
    }
  }, [dispatch, activeIdentifier, sortOption]);

  const handleFetch = useCallback(
    async (event) => {
      event?.preventDefault();
      const trimmed = identifierInput.trim();
      if (!trimmed) {
        toast.error('Enter a product ID or slug');
        return;
      }
      setLoadingIdentifier(true);
      dispatch(clearReviews());
      try {
        await dispatch(
          fetchProductReviews({
            identifier: trimmed,
            page: 1,
            limit: 10,
            sort: sortOption
          })
        ).unwrap();
        setActiveIdentifier(trimmed);
      } catch (error) {
        toast.error(typeof error === 'string' ? error : 'Failed to load reviews');
      } finally {
        setLoadingIdentifier(false);
      }
    },
    [dispatch, identifierInput, sortOption]
  );

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore || reviewsStatus === 'loadingMore') return;
    const nextPage = (reviewPagination?.page || 1) + 1;
    if (activeIdentifier === '__all__') {
      dispatch(
        fetchAllReviewsAdmin({
          page: nextPage,
          limit: reviewPagination?.limit || 10,
          sort: sortOption
        })
      );
    } else {
      dispatch(
        fetchProductReviews({
          identifier: activeIdentifier,
          page: nextPage,
          limit: reviewPagination?.limit || 10,
          sort: sortOption
        })
      );
    }
  }, [dispatch, canLoadMore, reviewsStatus, activeIdentifier, reviewPagination, sortOption]);

  const handleReplyChange = useCallback((reviewId, value) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [reviewId]: value
    }));
  }, []);

  const handleReplySubmit = useCallback(
    async (review) => {
      const draft = replyDrafts[review._id] ?? '';
      let identifierForReply = activeIdentifier;
      if (identifierForReply === '__all__') {
        identifierForReply = review.product?.slug || review.product?._id;
      }
      if (!identifierForReply) {
        toast.error('Unable to determine product identifier for this review.');
        return;
      }
      try {
        await dispatch(
          replyToProductReview({
            identifier: identifierForReply,
            reviewId: review._id,
            message: draft
          })
        ).unwrap();
        toast.success(draft.trim() ? 'Reply posted' : 'Reply cleared');
      } catch (error) {
        toast.error(typeof error === 'string' ? error : 'Unable to save reply');
      }
    },
    [dispatch, activeIdentifier, replyDrafts]
  );

  const isBusy = reviewsStatus === 'loading' || loadingIdentifier;

  return (
    <>
      <SEO
        title="Admin Review Moderation"
        description="Search, filter, and respond to HELLAS customer reviews directly from the admin console."
        keywords={['admin reviews', 'moderation', 'customer feedback']}
        noIndex
      />
      <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900">Product Reviews</h1>
        <p className="text-sm text-slate-600">
          Search for a product by slug or ID to moderate customer reviews and respond as the admin.
        </p>
      </div>

      <form
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_auto_auto]"
        onSubmit={handleFetch}
      >
        <div className="space-y-2">
          <label htmlFor="product-identifier" className="text-sm font-medium text-slate-700">
            Product slug or ID
          </label>
          <Input
            id="product-identifier"
            value={identifierInput}
            onChange={(event) => setIdentifierInput(event.target.value)}
            placeholder="e.g. modern-sofa" />
        </div>

        <div className="space-y-2">
          <label htmlFor="sort-option" className="text-sm font-medium text-slate-700">
            Sort reviews
          </label>
          <select
            id="sort-option"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" className="w-full md:w-auto" disabled={loadingIdentifier}>
            {loadingIdentifier ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Load reviews'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              setIdentifierInput('');
              setActiveIdentifier('__all__');
            }}
            disabled={loadingIdentifier || activeIdentifier === '__all__'}
          >
            <MessageCircleReply className="h-4 w-4" />
            Show all
          </Button>
          {activeIdentifier && activeIdentifier !== '__all__' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIdentifierInput(activeIdentifier);
                handleFetch();
              }}
              disabled={loadingIdentifier}
              className="hidden md:flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </form>

      {activeIdentifier !== '__all__' && currentReviewIdentifier && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline" className="bg-slate-100 text-slate-700">
            Viewing: {currentReviewIdentifier}
          </Badge>
          {reviewPagination && (
            <Badge className="bg-black text-white">
              {reviewPagination.total || reviews.length} review
              {(reviewPagination.total || reviews.length) === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isBusy ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <OneLoader size="medium" text="Fetching reviews..." />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-slate-500">
            <MessageCircleReply className="h-10 w-10 text-slate-300" />
            <p>No reviews loaded. Enter a product slug or ID to get started.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[220px]">Reviewer</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="w-[320px]">Admin reply</TableHead>
                  <TableHead className="w-[140px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review._id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">
                          {review.user?.name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-slate-500">{review.user?.email || 'No email'}</p>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={`h-4 w-4 ${index < (review.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(review.createdAt).toLocaleString()}
                        </p>
                        {review.product && reviewsContext === 'all' && (
                          <p className="text-xs text-slate-500">
                            Product:{' '}
                            <span className="font-medium text-slate-700">
                              {review.product.title || review.product.slug || review.product._id}
                            </span>
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {review.title && (
                          <p className="font-medium text-slate-800">{review.title}</p>
                        )}
                        {review.comment && (
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={replyDrafts[review._id] ?? ''}
                        onChange={(event) => handleReplyChange(review._id, event.target.value)}
                        placeholder="Write a personalised reply..."
                        rows={5}
                      />
                      {review.adminResponse?.respondedBy && (
                        <p className="mt-2 text-xs text-slate-500">
                          Last replied by{' '}
                          <span className="font-medium text-slate-700">
                            {review.adminResponse.respondedBy.name || 'Admin'}
                          </span>{' '}
                          on{' '}
                          {review.adminResponse.respondedAt
                            ? new Date(review.adminResponse.respondedAt).toLocaleString()
                            : '—'}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Button
                        size="sm"
                        onClick={() => handleReplySubmit(review)}
                        disabled={reviewMutationStatus === 'loading'}
                        className="flex items-center gap-2"
                      >
                        {reviewMutationStatus === 'loading' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircleReply className="h-4 w-4" />
                        )}
                        Save reply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {canLoadMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={reviewsStatus === 'loadingMore'}
            className="flex items-center gap-2"
          >
            {reviewsStatus === 'loadingMore' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Load more reviews
          </Button>
        </div>
      )}
      </div>
    </>
  );
};

export default AdminReviews;


