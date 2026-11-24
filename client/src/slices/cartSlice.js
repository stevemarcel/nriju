import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";
import { clearAuth } from "./authSlice";
import { toast } from "sonner";

// Rehydrate cart from localStorage (guest cart)
const loadCart = () => {
  try {
    return normalizeItems(JSON.parse(localStorage.getItem("nriju_cart") || "[]"));
  } catch {
    return [];
  }
};

const saveCart = (items) => {
  localStorage.setItem("nriju_cart", JSON.stringify(items));
};

const idOf = (value) => (value && typeof value === "object" ? value._id : value);

export const getCartItemProductId = (item) => item?.productId || idOf(item?.product);

// Keep the populated product document in every cart item. Server cart responses
// already provide it, and guest additions provide it from the product card. The
// duplicated display fields keep existing consumers simple and preserve support
// for carts saved by older versions of the app.
const normalizeItem = (item = {}) => {
  const sourceProduct = item.product && typeof item.product === "object" ? item.product : null;
  const productId = item.productId || idOf(item.product);
  const product =
    sourceProduct ||
    (productId
      ? {
          _id: productId,
          name: item.name,
          price: item.price,
          images: item.image ? [item.image] : [],
          unit: item.unit,
          category: item.categoryId,
        }
      : null);

  return {
    ...item,
    product,
    productId,
    name: product?.name ?? item.name ?? "",
    price: product?.price ?? item.price ?? 0,
    image: product?.images?.[0] ?? item.image ?? "",
    unit: product?.unit ?? item.unit ?? "",
    categoryId: idOf(product?.category) ?? item.categoryId ?? null,
  };
};

const normalizeItems = (items = []) => items.map(normalizeItem);

export const fetchCart = createAsyncThunk("cart/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/cart");
    return res.data.data || [];
  } catch (err) {
    // If 401, the user isn't logged in — keep guest cart
    if (err?.response?.status === 401) return null;
    throw err;
  }
});

export const addToCart = createAsyncThunk(
  "cart/add",
  async ({ productId, quantity = 1, categoryId }, { rejectWithValue }) => {
    try {
      const res = await api.post("/cart/items", {
        productId,
        quantity,
        categoryId,
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add to cart.");
    }
  },
);

export const updateCartItem = createAsyncThunk(
  "cart/update",
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/cart/items/${productId}`, { quantity });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update quantity.");
    }
  },
);

export const removeCartItem = createAsyncThunk(
  "cart/remove",
  async (productId, { rejectWithValue }) => {
    try {
      await api.delete(`/cart/items/${productId}`);
      return productId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to remove item.");
    }
  },
);

export const clearCart = createAsyncThunk("cart/clear", async (_, { rejectWithValue }) => {
  try {
    await api.delete("/cart");
    return [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to clear cart.");
  }
});

// Merge guest cart into server cart on login
export const mergeGuestCart = createAsyncThunk(
  "cart/mergeGuest",
  async (_, { rejectWithValue, getState }) => {
    const { items } = getState().cart;
    if (!items.length) return [];
    // Send all guest items to server
    for (const item of items) {
      const productId = getCartItemProductId(item);
      try {
        await api.post("/cart/items", {
          productId,
          quantity: item.quantity,
          categoryId: item.categoryId,
        });
      } catch (err) {
        console.warn("Failed to merge item", productId, err?.response?.data?.message);
      }
    }
    // After merge, fetch the authoritative server cart
    const res = await api.get("/cart");
    return res.data.data || [];
  },
);

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: loadCart(),
    confirmedItems: [], // Snapshot of the last known-good server/cart state for rollback
    loading: false,
    error: null,
    source: "local", // "local" or "server"
  },
  reducers: {
    // Optimistic local update (guest flow or fallback)
    addLocal: (state, action) => {
      const normalized = normalizeItem(action.payload);
      const { productId, quantity = 1 } = normalized;
      const existing = state.items.find((item) => getCartItemProductId(item) === productId);
      if (existing) {
        existing.quantity += quantity;
        existing.product = normalized.product;
        existing.productId = normalized.productId;
        existing.name = normalized.name;
        existing.price = normalized.price;
        existing.image = normalized.image;
        existing.unit = normalized.unit;
        existing.categoryId = normalized.categoryId;
      } else {
        state.items.push({ ...normalized, quantity });
      }
      saveCart(state.items);
    },
    updateLocal: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find((cartItem) => getCartItemProductId(cartItem) === productId);
      if (item) {
        item.quantity = Math.max(1, quantity);
        saveCart(state.items);
      }
    },
    removeLocal: (state, action) => {
      state.items = state.items.filter((item) => getCartItemProductId(item) !== action.payload);
      saveCart(state.items);
    },
    clearLocal: (state) => {
      state.items = [];
      saveCart(state.items);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        // If null (401), keep guest cart; otherwise use server cart
        if (action.payload !== null) {
          state.items = normalizeItems(action.payload);
          state.confirmedItems = state.items; // Sync backup
          state.source = "server";
        }
        state.loading = false;
      })
      .addCase(fetchCart.rejected, (state) => {
        state.loading = false;
      })
      // ── Optimistic Add ──────────────────────────────────────────
      .addCase(addToCart.pending, (state, action) => {
        state.confirmedItems = [...state.items]; // Snapshot for rollback
        // Synchronously apply same logic as addLocal
        const normalized = normalizeItem(action.meta.arg);
        const { productId, quantity = 1 } = normalized;
        const existing = state.items.find((item) => getCartItemProductId(item) === productId);
        if (existing) {
          existing.quantity += quantity;
        } else {
          state.items.push({ ...normalized, quantity });
        }
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = normalizeItems(action.payload);
        state.confirmedItems = state.items; // Update backup to new server state
        state.source = "server";
        saveCart(state.items);
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.items = state.confirmedItems; // Rollback
        toast.error(action.payload || "Could not add item to cart.");
      })
      // ── Optimistic Update ───────────────────────────────────────
      .addCase(updateCartItem.pending, (state, action) => {
        state.confirmedItems = [...state.items];
        const { productId, quantity } = action.meta.arg;
        const item = state.items.find((cartItem) => getCartItemProductId(cartItem) === productId);
        if (item) {
          item.quantity = Math.max(1, quantity);
        }
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.items = normalizeItems(action.payload);
        state.confirmedItems = state.items;
        saveCart(state.items);
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.items = state.confirmedItems;
        toast.error(action.payload || "Could not update quantity.");
      })
      // ── Optimistic Remove ───────────────────────────────────────
      .addCase(removeCartItem.pending, (state, action) => {
        state.confirmedItems = [...state.items];
        state.items = state.items.filter((item) => getCartItemProductId(item) !== action.meta.arg);
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        // action.payload is the productId in this case
        state.items = state.items.filter((item) => getCartItemProductId(item) !== action.payload);
        state.confirmedItems = state.items;
        saveCart(state.items);
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.items = state.confirmedItems;
        toast.error(action.payload || "Could not remove item.");
      })
      // ── Optimistic Clear ────────────────────────────────────────
      .addCase(clearCart.pending, (state) => {
        state.confirmedItems = [...state.items];
        state.items = [];
      })
      .addCase(clearCart.fulfilled, (state, action) => {
        state.items = normalizeItems(action.payload);
        state.confirmedItems = state.items;
        saveCart(state.items);
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.items = state.confirmedItems;
        toast.error(action.payload || "Could not clear cart.");
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        state.items = normalizeItems(action.payload);
        state.confirmedItems = state.items;
        state.source = "server";
        saveCart(state.items);
      })
      // After logout the server cart is gone; keep showing the items but send
      // further mutations to localStorage, or they'd 401 and bounce to login.
      .addCase(clearAuth, (state) => {
        state.source = "local";
        saveCart(state.items);
      });
  },
});

export const { addLocal, updateLocal, removeLocal, clearLocal } = cartSlice.actions;

// Source-aware actions: route to the server when the cart is backed by it,
// otherwise mutate localStorage. The UI (CartDrawer, CartPage) dispatches
// these so quantity/remove work for both guests and signed-in users.
export const addItem = (item) => (dispatch, getState) => {
  const { source } = getState().cart;
  if (source === "server") {
    return dispatch(
      addToCart({
        productId: getCartItemProductId(item),
        quantity: item.quantity,
        categoryId: item.categoryId || idOf(item.product?.category),
      }),
    );
  }

  return dispatch(addLocal(item));
};

export const changeQuantity = (productId, quantity) => (dispatch, getState) => {
  const { source } = getState().cart;
  if (source === "server") {
    dispatch(updateCartItem({ productId, quantity }));
  } else {
    dispatch(updateLocal({ productId, quantity }));
  }
};

export const deleteItem = (productId) => (dispatch, getState) => {
  const { source } = getState().cart;
  if (source === "server") {
    dispatch(removeCartItem(productId));
  } else {
    dispatch(removeLocal(productId));
  }
};

export const clearAll = () => (dispatch, getState) => {
  if (getState().cart.source === "server") {
    dispatch(clearCart());
  } else {
    dispatch(clearLocal());
  }
};

// Selector: cart totals
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const selectCartCount = (state) => state.cart.items.reduce((sum, i) => sum + i.quantity, 0);

export default cartSlice.reducer;
