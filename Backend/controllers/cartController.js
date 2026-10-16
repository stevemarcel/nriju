import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import { recomputeStock } from "../services/inventoryService.js";

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    await cart.populate("items.product");
  }
  return cart;
};

// @DESCRIPTION Get current user's cart
// @ROUTE       GET /api/v1/cart
// @ACCESS      Authenticated
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  res.json({ success: true, data: cart.items });
});

// @DESCRIPTION Add or update an item in the cart
// @ROUTE       POST /api/v1/cart/items
// @ACCESS      Authenticated
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, categoryId } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }

  const available = await recomputeStock(product._id);
  if (available <= 0) {
    res.status(409);
    throw new Error("Product is out of stock");
  }

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((i) => i.product.toString() === productId);
  const qty = Math.min(quantity, available);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, available);
    existing.maxAvailable = available;
  } else {
    cart.items.push({
      product: productId,
      name: product.name,
      price: product.price,
      image: product.images[0] || "",
      unit: product.unit,
      categoryId: categoryId || product.category,
      quantity: qty,
      maxAvailable: available,
    });
  }

  await cart.save();
  await cart.populate("items.product");
  res.json({ success: true, data: cart.items });
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

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    res.status(404);
    throw new Error("Item not in cart");
  }
  item.quantity = qty;
  item.maxAvailable = available;
  await cart.save();
  await cart.populate("items.product");
  res.json({ success: true, data: cart.items });
});

// @DESCRIPTION Remove an item from the cart
// @ROUTE       DELETE /api/v1/cart/items/:productId
// @ACCESS      Authenticated
const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await getOrCreateCart(req.user._id);
  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  await cart.save();
  await cart.populate("items.product");
  res.json({ success: true, data: cart.items });
});

// @DESCRIPTION Clear the entire cart
// @ROUTE       DELETE /api/v1/cart
// @ACCESS      Authenticated
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, data: [] });
});

export { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
