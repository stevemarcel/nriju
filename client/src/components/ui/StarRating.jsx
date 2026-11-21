import { Star } from "lucide-react";

const MAX_RATING = 5;

const StarRating = ({ rating = 0, reviewCount, size = "sm", showValue = false }) => {
  const normalizedRating = Math.min(Math.max(Number(rating) || 0, 0), MAX_RATING);
  const filledStars = Math.round(normalizedRating);
  const starClass = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const reviewLabel = reviewCount === 1 ? "review" : "reviews";

  return (
    <span
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={`${normalizedRating.toFixed(1)} out of ${MAX_RATING} stars${
        reviewCount === undefined ? "" : ` from ${reviewCount} ${reviewLabel}`
      }`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: MAX_RATING }, (_, index) => (
          <Star
            key={index}
            className={`${starClass} ${
              index < filledStars ? "fill-secondary text-secondary" : "text-border"
            }`}
          />
        ))}
      </span>
      {showValue ? (
        <span className="text-xs font-semibold text-text-secondary" aria-hidden="true">
          {normalizedRating > 0 ? normalizedRating.toFixed(1) : "New"}
        </span>
      ) : null}
    </span>
  );
};

export default StarRating;
