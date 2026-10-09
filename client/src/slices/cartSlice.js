import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

// Rehydrate cart from localStorage
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
  const res = await api.get("/cart");
  return res.data.data || [];
});

export const addToCart = createAsyncThunk(
  "cart/add",
  async ({ productId, quantity = 1 }, { rejectWithValue }) => {
    const res = await api.post("/cart/items", { productId, quantity });
    return res.data.data;
  },
);

export const updateCartItem = createAsyncThunk(
  "cart/update",
  async ({ productId, quantity }, { rejectWithValue }) => {
    const res = await api.post("/cart/items", { productId, quantity });
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

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: loadCart(),
    loading: false,
    error: null,
  },
  reducers: {
    // Optimistic local update (used when API fails or for guest flow)
    addLocal: (state, action) => {
      const { productId, name, price, image, unit, quantity = 1 } = action.payload;
      const existing = state.items.find((i) => i.product === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ product: productId, name, price, image, unit, quantity });
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
        state.items = action.payload;
        saveCart(state.items);
        state.loading = false;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload;
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
      });
  },
});

export const { addLocal, updateLocal, removeLocal, clearLocal } = cartSlice.actions;

// Selector: cart totals
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);

export default cartSlice.reducer;