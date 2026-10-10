// Display helpers for the API response layer.
// Money is stored as integer kobo; naira only appears at render time.
import { toNaira } from "./money.js";

export const formatPrice = (kobo) =>
  `₦${toNaira(kobo).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export const productSummary = (product) => ({
  _id: product._id,
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price,
  compareAtPrice: product.compareAtPrice,
  unit: product.unit,
  productType: product.productType,
  stock: product.stock,
  category: product.category?._id ?? product.category,
  region: product.region,
  images: product.images,
  tags: product.tags,
  isActive: product.isActive,
  isFeatured: product.isFeatured,
  averageRating: product.averageRating,
  reviewCount: product.reviewCount,
  salesCount: product.salesCount,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});
