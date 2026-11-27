import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Star, X } from "lucide-react";
import { toast } from "sonner";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import { notificationKeys } from "../../hooks/useNotifications";
import api from "../../services/api";

const ProductReviewForm = ({ item, orderId }) => {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const submitReview = useMutation({
    mutationFn: () =>
      api.post(
        "/reviews",
        { productId: item.product, rating, comment: comment.trim() },
        { skipGlobalErrorToast: true },
      ),
    onSuccess: async () => {
      toast.success("Review submitted. Thank you.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["reviews", "order", orderId],
        }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
      ]);
    },
    onError: (requestError) => {
      setError(requestError?.response?.data?.message || "Your review could not be submitted.");
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    if (!rating) {
      setError("Choose a star rating before submitting.");
      return;
    }
    submitReview.mutate();
  };

  return (
    <article className="rounded-card border border-border bg-background p-4">
      <div className="flex gap-3">
        {item.image ? (
          <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-input object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-input bg-border-soft text-text-muted">
            <Star className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm font-semibold text-text">{item.name}</h3>
          <p className="mt-1 text-xs text-text-muted">{item.quantity} purchased</p>
        </div>
        {item.reviewed && (
          <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 text-[0.6875rem] font-semibold text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Reviewed
          </span>
        )}
      </div>

      {!item.reviewed && (
        <form onSubmit={handleSubmit} className="mt-4 border-t border-border-soft pt-4">
          <fieldset>
            <legend className="text-xs font-semibold text-text">Your rating</legend>
            <div
              className="mt-2 flex gap-1"
              role="radiogroup"
              aria-label={`Rating for ${item.name}`}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => {
                    setRating(value);
                    setError("");
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-button text-secondary outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Star
                    className={`h-6 w-6 ${value <= rating ? "fill-secondary" : "fill-transparent"}`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <label
            className="mt-3 block text-xs font-semibold text-text"
            htmlFor={`review-${item.product}`}
          >
            Comment <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={`review-${item.product}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What did you like? What could be better?"
            className="mt-2 w-full resize-y rounded-input border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-1 flex justify-between gap-3 text-[0.6875rem]">
            <p className="text-error" role="alert">
              {error}
            </p>
            <span className="ml-auto text-text-muted">{comment.length}/1000</span>
          </div>
          <button
            type="submit"
            disabled={submitReview.isPending}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-on-accent outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitReview.isPending && (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Submit review
          </button>
        </form>
      )}
    </article>
  );
};

const AccountOrderReviewModal = ({ orderId, onClose }) => {
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  usePageScrollLock(Boolean(orderId));

  const reviewQuery = useQuery({
    queryKey: ["reviews", "order", orderId],
    queryFn: async () => (await api.get(`/reviews/order/${orderId}/eligible`)).data.data,
    enabled: Boolean(orderId),
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!orderId) return undefined;
    previousFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const dialog = closeButtonRef.current?.closest("[role='dialog']");
      const focusable = dialog?.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [onClose, orderId]);

  if (!orderId) return null;
  const details = reviewQuery.data;
  const remaining = details?.items?.filter((item) => !item.reviewed).length || 0;

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-text/50"
        onClick={onClose}
        aria-label="Close review dialog"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-review-title"
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-card border border-border bg-surface shadow-soft sm:rounded-card"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border-soft px-4 py-4 sm:px-6">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary">
              Verified purchase
            </p>
            <h2 id="order-review-title" className="mt-1 font-heading text-xl font-bold text-text">
              Review your products
            </h2>
            {details?.order && (
              <p className="mt-1 text-xs text-text-muted">
                {details.order.orderNumber} · {remaining} left to review
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-secondary outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close review dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 overscroll-contain sm:px-6 sm:py-5">
          {reviewQuery.isPending ? (
            <div className="space-y-3" aria-label="Loading reviewable products">
              {[0, 1].map((item) => (
                <div key={item} className="h-36 animate-pulse rounded-card bg-background" />
              ))}
            </div>
          ) : reviewQuery.isError ? (
            <div className="py-12 text-center">
              <p className="font-heading font-semibold text-text">
                Review options could not be loaded.
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {reviewQuery.error?.response?.data?.message || "Please try again."}
              </p>
              <button
                type="button"
                onClick={() => reviewQuery.refetch()}
                className="mt-4 min-h-10 rounded-button px-4 text-sm font-semibold text-primary hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-primary"
              >
                Try again
              </button>
            </div>
          ) : remaining === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
                <Check className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-heading text-lg font-semibold text-text">
                All products reviewed
              </h3>
              <p className="mt-1 text-sm text-text-muted">Thank you for sharing your experience.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="mb-4 text-sm leading-6 text-text-secondary">
                Rate each product separately. A written comment is optional.
              </p>
              {details.items.map((item) => (
                <ProductReviewForm key={item._id} item={item} orderId={orderId} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AccountOrderReviewModal;
