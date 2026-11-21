import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

const SWIPE_THRESHOLD = 36;

const ProductGallery = ({ product }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartX = useRef(null);
  const images = product.images || [];
  const imageCount = images.length;
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const showImage = (index) => {
    if (imageCount < 2) return;
    setActiveImageIndex((index + imageCount) % imageCount);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null || imageCount < 2) return;
    const distance = touchStartX.current - event.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(distance) < SWIPE_THRESHOLD) return;
    showImage(activeImageIndex + (distance > 0 ? 1 : -1));
  };

  return (
    <section aria-label={`${product.name} images`} className="min-w-0">
      <div
        className="relative aspect-square touch-pan-y overflow-hidden rounded-card border border-border bg-surface"
        role="group"
        aria-roledescription="carousel"
        aria-label={`${product.name} product gallery`}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={handleTouchEnd}
      >
        {imageCount ? (
          <img
            key={`${product._id}-${activeImageIndex}`}
            src={images[activeImageIndex]}
            alt={`${product.name}, image ${activeImageIndex + 1} of ${imageCount}`}
            width="1200"
            height="1200"
            className="animate-product-image-enter h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-text-muted">
            <ImageIcon className="h-10 w-10" aria-hidden="true" />
            <span className="text-sm">No product image available</span>
          </div>
        )}

        {discount ? (
          <span className="absolute left-4 top-4 rounded-chip bg-secondary px-3 py-1.5 text-xs font-bold text-text">
            {discount}% off
          </span>
        ) : null}

        {product.productType === "cooked" ? (
          <span className="absolute right-4 top-4 rounded-chip bg-primary px-3 py-1.5 text-xs font-semibold text-on-accent">
            Freshly cooked
          </span>
        ) : null}

        {imageCount > 1 ? (
          <>
            <button
              type="button"
              onClick={() => showImage(activeImageIndex - 1)}
              aria-label={`Show previous image of ${product.name}`}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 text-primary shadow-soft transition-colors hover:bg-background-soft active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => showImage(activeImageIndex + 1)}
              aria-label={`Show next image of ${product.name}`}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 text-primary shadow-soft transition-colors hover:bg-background-soft active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {imageCount > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Product thumbnails">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImageIndex(index)}
              aria-label={`Show image ${index + 1} of ${product.name}`}
              aria-pressed={activeImageIndex === index}
              className={`aspect-square overflow-hidden rounded-button border bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                activeImageIndex === index
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <img
                src={image}
                alt=""
                width="240"
                height="240"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ProductGallery;
