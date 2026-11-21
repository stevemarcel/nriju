const ProductDetailSkeleton = () => (
  <div className="mx-auto w-full max-w-screen-2xl px-3 py-8 sm:px-4 sm:py-10">
    <div className="h-5 w-32 animate-pulse rounded bg-surface motion-reduce:animate-none" />
    <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="aspect-square animate-pulse rounded-card bg-surface motion-reduce:animate-none" />
      <div className="space-y-5 py-2">
        <div className="h-5 w-28 animate-pulse rounded bg-surface motion-reduce:animate-none" />
        <div className="h-12 w-4/5 animate-pulse rounded bg-surface motion-reduce:animate-none" />
        <div className="h-8 w-40 animate-pulse rounded bg-surface motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded bg-surface motion-reduce:animate-none" />
      </div>
    </div>
  </div>
);

export default ProductDetailSkeleton;
