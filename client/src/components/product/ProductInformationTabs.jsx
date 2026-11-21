import { useRef } from "react";
import { Check, Star } from "lucide-react";
import StarRating from "../ui/StarRating";

const TABS = [
  { id: "description", label: "Description" },
  { id: "information", label: "Additional information" },
  { id: "reviews", label: "Reviews" },
];

const formatProductValue = (value) => {
  if (!value) return "Not specified";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatReviewDate = (value) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const ProductInformationTabs = ({
  product,
  reviews = [],
  reviewsPending,
  activeTab,
  onTabChange,
}) => {
  const tabRefs = useRef([]);
  const informationRows = [
    ["Category", product.category?.name],
    ["Product type", formatProductValue(product.productType)],
    ["Unit", product.unit],
    ["Availability", product.stock > 0 ? `${product.stock} available` : "Out of stock"],
    [
      "Preparation time",
      product.prepLeadTime ? `${product.prepLeadTime} hours` : "Ready for dispatch",
    ],
    ["Tags", product.tags?.length ? product.tags.join(", ") : "Not specified"],
  ];

  const handleTabKeyDown = (event, currentIndex) => {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;
    else return;

    event.preventDefault();
    onTabChange(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section className="mt-12 sm:mt-16" aria-label="Product information">
      <div
        role="tablist"
        aria-label="Product details"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {TABS.map((tab, index) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`product-${tab.id}-tab`}
              aria-selected={selected}
              aria-controls="product-details-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 sm:px-6 ${
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text"
              }`}
            >
              {tab.label}
              {tab.id === "reviews" ? ` (${reviews.length})` : ""}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="product-details-panel"
        aria-labelledby={`product-${activeTab}-tab`}
        tabIndex={0}
        className="rounded-b-card border border-t-0 border-border bg-surface p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:p-7"
      >
        {activeTab === "description" ? (
          <div className="max-w-3xl">
            <h2 className="font-heading text-xl font-bold text-text">About this product</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-text-secondary sm:text-base">
              {product.description || "No description has been added for this product."}
            </p>
          </div>
        ) : null}

        {activeTab === "information" ? (
          <div className="overflow-hidden rounded-button border border-border">
            <dl>
              {informationRows.map(([label, value], index) => (
                <div
                  key={label}
                  className={`grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6 ${
                    index % 2 === 0 ? "bg-background-soft" : "bg-background"
                  }`}
                >
                  <dt className="text-sm font-semibold text-text">{label}</dt>
                  <dd className="text-sm text-text-secondary">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {activeTab === "reviews" ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-text">Customer reviews</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Reviews are published after purchase and moderation.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-chip bg-background px-3 py-2">
                <StarRating
                  rating={product.averageRating}
                  reviewCount={reviews.length}
                  size="md"
                  showValue
                />
              </div>
            </div>

            {reviewsPending ? (
              <div className="mt-6 space-y-3" aria-label="Loading reviews">
                {Array.from({ length: 2 }, (_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-card bg-background motion-reduce:animate-none"
                  />
                ))}
              </div>
            ) : reviews.length ? (
              <div className="mt-6 divide-y divide-border">
                {reviews.map((review) => (
                  <article key={review._id} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {review.user?.avatar ? (
                          <img
                            src={review.user.avatar}
                            alt=""
                            width="40"
                            height="40"
                            className="h-10 w-10 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-heading text-sm font-bold text-primary">
                            {(review.user?.name || "Customer").charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">
                            {review.user?.name || "Nriju customer"}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StarRating rating={review.rating} />
                            {review.isVerifiedPurchase ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                Verified purchase
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <time
                        dateTime={review.createdAt}
                        className="shrink-0 text-xs text-text-muted"
                      >
                        {formatReviewDate(review.createdAt)}
                      </time>
                    </div>
                    {review.title ? (
                      <h3 className="mt-3 text-sm font-semibold text-text">{review.title}</h3>
                    ) : null}
                    {review.comment ? (
                      <p className="mt-1 text-sm leading-6 text-text-secondary">{review.comment}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-card border border-border bg-background p-6 text-center">
                <Star className="mx-auto h-6 w-6 text-text-muted" aria-hidden="true" />
                <p className="mt-2 font-semibold text-text">No approved reviews yet</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Reviews from verified buyers will appear here.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ProductInformationTabs;
