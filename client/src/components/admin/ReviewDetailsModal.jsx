import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, User, Package, Check, X } from "lucide-react";
import api from "../../services/api";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import { formatDate } from "../../utils/formatDate";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
  AdminModalHeader,
} from "./AdminModalPrimitives";

const STATUS_BADGE = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
};

const ReviewDetailsModal = ({ review, onClose }) => {
  usePageScrollLock(Boolean(review));
  const queryClient = useQueryClient();

  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const moderateMutation = useMutation({
    mutationFn: ({ status, moderationNote }) =>
      api.patch(`/reviews/${review._id}/moderate`, { status, moderationNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      toast.success(`Review ${status === "approved" ? "approved" : "rejected"}.`);
      onClose();
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Could not moderate review."),
  });

  const handleAccept = () => moderateMutation.mutate({ status: "approved" });

  const handleReject = () => {
    if (!rejecting) {
      setRejecting(true);
      return;
    }
    if (!rejectReason.trim()) return;
    moderateMutation.mutate({ status: "rejected", moderationNote: rejectReason.trim() });
  };

  const statusBadge = STATUS_BADGE[review.status];
  const isPending = review.status === "pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-details-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !moderateMutation.isPending) onClose();
        }}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-border/60 bg-background text-text shadow-soft"
      >
        <AdminModalHeader
          icon={Star}
          eyebrow="Review details"
          title={review.title || `${review.product?.name} review`}
          titleId="review-details-title"
          onClose={onClose}
          closeLabel="Close review details"
          closeDisabled={moderateMutation.isPending}
        />

        {/* Review content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
          {/* Reviewer card */}
          <div className="bg-background-soft/70 rounded-[20px] p-5 border border-border/60">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-text-muted" />
              <h3 className="font-heading font-semibold text-text">Reviewer</h3>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {review.user?.avatar || review.user?.profileImage ? (
                  <img
                    src={review.user.avatar || review.user.profileImage}
                    alt={review.user?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-primary">
                    {(review.user?.name || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-text">{review.user?.name || "Unknown"}</p>
                <p className="text-xs text-text-muted mt-0.5">{review.user?.email || "—"}</p>
              </div>
            </div>
          </div>

          {/* Rating + product card */}
          <div className="bg-background-soft/70 rounded-[20px] p-5 border border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-text-muted" />
                <h3 className="font-heading font-semibold text-text">Product</h3>
              </div>
              <span
                className={`rounded-chip px-2 py-0.5 text-xs font-semibold ${statusBadge?.cls || ""}`}
              >
                {statusBadge?.label || review.status}
              </span>
            </div>

            <div className="flex items-start gap-3">
              {review.product?.images?.[0] ? (
                <img
                  src={review.product.images[0]}
                  alt={review.product.name}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-border/60">
                  <Package className="w-7 h-7 text-text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text">{review.product?.name || "Unknown product"}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={`w-4 h-4 ${
                        value <= review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-text-muted"
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="ml-1 text-sm text-text-muted">{review.rating}/5</span>
                </div>
              </div>
            </div>

            {review.title ? (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">
                  Title
                </p>
                <p className="text-sm text-text">{review.title}</p>
              </div>
            ) : null}

            {review.comment ? (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">
                  Comment
                </p>
                <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                  {review.comment}
                </p>
              </div>
            ) : null}
          </div>

          {/* Meta card */}
          <div className="bg-background-soft/70 rounded-[20px] p-5 border border-border/60">
            <div className="text-xs text-text-muted space-y-1">
              <p>Submitted: {formatDate(review.createdAt)}</p>
              {review.isVerifiedPurchase ? <p>Verified purchase</p> : null}
              {review.moderationNote ? (
                <p className="text-rose-600">Moderation note: {review.moderationNote}</p>
              ) : null}
              {review.moderatedAt ? <p>Moderated: {formatDate(review.moderatedAt)}</p> : null}
            </div>
          </div>

          {/* Reject reason (shown when rejecting) */}
          {rejecting && isPending ? (
            <div>
              <label htmlFor="reject-reason" className={ADMIN_LABEL_CLASS}>
                Reason for rejection *
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="e.g. Spam, irrelevant, offensive content…"
                rows={3}
                className={`${ADMIN_FIELD_CLASS} mt-1.5 resize-none`}
              />
            </div>
          ) : null}
        </div>

        {/* Action footer */}
        <div className="border-t border-border/60 p-5 flex justify-end gap-3">
          {isPending ? (
            <>
              {rejecting ? (
                <button
                  onClick={() => {
                    setRejecting(false);
                    setRejectReason("");
                  }}
                  disabled={moderateMutation.isPending}
                  className={ADMIN_SECONDARY_BUTTON_CLASS}
                >
                  Cancel reject
                </button>
              ) : null}

              <button
                onClick={handleAccept}
                disabled={moderateMutation.isPending}
                className="inline-flex items-center gap-2 bg-emerald-600 text-on-accent font-semibold rounded-button px-6 py-3 hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {moderateMutation.isPending ? "Processing..." : "Accept"}
              </button>

              <button
                onClick={handleReject}
                disabled={moderateMutation.isPending || (!rejecting && false)}
                className={`inline-flex items-center gap-2 font-semibold rounded-button px-6 py-3 transition-opacity ${
                  rejecting
                    ? "bg-rose-600 text-on-accent hover:opacity-90 disabled:opacity-50"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                <X className="h-4 w-4" />
                {moderateMutation.isPending
                  ? "Processing..."
                  : rejecting
                    ? "Confirm reject"
                    : "Reject"}
              </button>
            </>
          ) : (
            <button onClick={onClose} className={ADMIN_SECONDARY_BUTTON_CLASS}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewDetailsModal;
