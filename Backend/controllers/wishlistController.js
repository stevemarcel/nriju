import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Wishlist from "../models/Wishlist.js";

// @DESCRIPTION Get current user's wishlist
// @ROUTE       GET /api/v1/wishlist
// @ACCESS      Authenticated
const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate("products");
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }
  res.json({ success: true, data: wishlist.products });
});

// @DESCRIPTION Add a product to the wishlist
// @ROUTE       POST /api/v1/wishlist/items
// @ACCESS      Authenticated
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }

  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  const exists = wishlist.products.some((p) => p.equals(productId));
  if (!exists) {
    wishlist.products.push(productId);
    await wishlist.save();
  }

  res.json({ success: true, message: "Added to wishlist" });
});

// @DESCRIPTION Remove a product from the wishlist
// @ROUTE       DELETE /api/v1/wishlist/items/:productId
// @ACCESS      Authenticated
const removeWishlistItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    res.status(404);
    throw new Error("Wishlist not found");
  }

  wishlist.products = wishlist.products.filter((p) => !p.equals(productId));
  await wishlist.save();

  res.json({ success: true, message: "Removed from wishlist" });
});

// @DESCRIPTION Clear the entire wishlist
// @ROUTE       DELETE /api/v1/wishlist
// @ACCESS      Authenticated
const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (wishlist) {
    wishlist.products = [];
    await wishlist.save();
  }
  res.json({ success: true, message: "Wishlist cleared" });
});

export { getWishlist, addToWishlist, removeWishlistItem, clearWishlist };
