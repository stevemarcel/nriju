const ProductGridSkeleton = () => (
  <div
    className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4"
    aria-label="Loading products"
  >
    {Array.from({ length: 8 }, (_, index) => (
      <div
        key={index}
        className="animate-pulse rounded-card border border-border bg-surface p-3 motion-reduce:animate-none"
      >
        <div className="aspect-square rounded-xl bg-background-soft" />
        <div className="mt-3 h-4 w-3/4 rounded bg-background-soft" />
        <div className="mt-3 h-8 rounded-button bg-background-soft" />
      </div>
    ))}
  </div>
);

export default ProductGridSkeleton;
