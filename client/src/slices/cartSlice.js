import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

// Rehydrate cart from localStorage (guest cart)
const loadCart = () => {
  try {
    return JSON.parse(localStorage.getItem("nriju_cart") || "[]");
  } catch {
    return [];
  }
};

const saveCart = (items) => {
  localStorage.setItem("nriju_cart", JSON.stringify(items));
};

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
    const res = await api.post("/cart/items", { productId, quantity, categoryId });
    return res.data.data;
  },
);

export const updateCartItem = createAsyncThunk(
  "cart/update",
  async ({ productId, quantity }, { rejectWithValue }) => {
    const res = await api.put(`/cart/items/${productId}`, { quantity });
    return res.data.data;
  },
);

export const removeCartItem = createAsyncThunk(
  "cart/remove",
  async (productId, { rejectWithValue }) => {
    await api.delete(`/cart/items/${productId}`);
    return productId;
  },
);

export const clearCart = createAsyncThunk("cart/clear", async (_, { rejectWithValue }) => {
  await api.delete("/cart");
  return [];
});

// Merge guest cart into server cart on login
export const mergeGuestCart = createAsyncThunk(
  "cart/mergeGuest",
  async (_, { rejectWithValue, getState }) => {
    const { items } = getState().cart;
    if (!items.length) return [];
    // Send all guest items to server
    for (const item of items) {
      try {
        await api.post("/cart/items", {
          productId: item.product,
          quantity: item.quantity,
          categoryId: item.categoryId,
        });
      } catch (err) {
        console.warn("Failed to merge item", item.product, err?.response?.data?.message);
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
    loading: false,
    error: null,
    source: "local", // "local" or "server"
  },
  reducers: {
    // Optimistic local update (guest flow or fallback)
    addLocal: (state, action) => {
      const { productId, name, price, image, unit, categoryId, quantity = 1 } = action.payload;
      const existing = state.items.find((i) => i.product === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ product: productId, name, price, image, unit, categoryId, quantity });
      }
      saveCart(state.items);
    },
    updateLocal: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find((i) => i.product === productId);
      if (item) {
        item.quantity = Math.max(1, quantity);
        saveCart(state.items);
      }
    },
    removeLocal: (state, action) => {
      state.items = state.items.filter((i) => i.product !== action.payload);
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
          state.items = action.payload;
          state.source = "server";
        }
        state.loading = false;
      })
      .addCase(fetchCart.rejected, (state) => {
        state.loading = false;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload;
        state.source = "server";
        saveCart(state.items);
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.items = action.payload;
        saveCart(state.items);
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.product !== action.payload);
        saveCart(state.items);
      })
      .addCase(clearCart.fulfilled, (state, action) => {
        state.items = action.payload;
        saveCart(state.items);
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        state.items = action.payload;
        state.source = "server";
        saveCart(state.items);
      });
  },
});

export const { addLocal, updateLocal, removeLocal, clearLocal } = cartSlice.actions;

// Selector: cart totals
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const selectCartCount = (state) => state.cart.items.reduce((sum, i) => sum + i.quantity, 0);

export default cartSlice.reducer;
