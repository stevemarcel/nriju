import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import { recomputeStock } from "../services/inventoryService.js";

// @DESCRIPTION Get current user's cart
// @ROUTE       GET /api/v1/cart
// @ACCESS      Authenticated
const getCart = asyncHandler(async (req, res) => {
  // Cart is stored in Redis/session or localStorage on client.
  // For now, return the user's persisted cart from the database.
  // In a full implementation, this would merge guest cart on login.
  const user = await req.user.populate("cart.product");
  res.json({ success: true, data: user.cart || [] });
});

// @DESCRIPTION Add or update an item in the cart
// @ROUTE       POST /api/v1/cart/items
// @ACCESS      Authenticated
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Server-side stock check against real available inventory
  const available = await recomputeStock(product._id);
  if (available <= 0) {
    res.status(409);
    throw new Error("Product is out of stock");
  }

  // In a real implementation, this would update a Cart collection or
  // Redis key. For now, we return the product info and let the
  // client's localStorage handle the actual cart state.
  res.json({
    success: true,
    message: "Added to cart",
    data: {
      product: product._id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      unit: product.unit,
      quantity: Math.min(quantity, available),
      maxAvailable: available,
    },
  });
});

// @DESCRIPTION Update cart item quantity
// @ROUTE       PUT /api/v1/cart/items/:productId
// @ACCESS      Authenticated
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }

  const available = await recomputeStock(product._id);
  const qty = Math.max(1, Math.min(quantity, available));

  res.json({
    success: true,
    data: {
      product: product._id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      unit: product.unit,
      quantity: qty,
      maxAvailable: available,
    },
  });
});

// @DESCRIPTION Remove an item from the cart
// @ROUTE       DELETE /api/v1/cart/items/:productId
// @ACCESS      Authenticated
const removeCartItem = asyncHandler(async (req, res) => {
  // Client-side handles the actual removal; this endpoint exists for
  // server-side validation and future persistence layer integration.
  res.json({ success: true, message: "Item removed from cart" });
});

// @DESCRIPTION Clear the entire cart
// @ROUTE       DELETE /api/v1/cart
// @ACCESS      Authenticated
const clearCart = asyncHandler(async (req, res) => {
  res.json({ success: true, message: "Cart cleared" });
});

export { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
