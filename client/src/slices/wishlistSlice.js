import { createSlice } from "@reduxjs/toolkit";

// A bare ObjectId string in `category` is a legacy artifact from an older
// API that collapsed the populated category to its _id. The storefront
// renders category.name, so drop the raw ID rather than displaying it.
const normalizeCategory = (item) => {
  if (item && typeof item.category === "string") {
    const { category, ...rest } = item;
    return rest;
  }
  return item;
};

const loadWishlist = () => {
  try {
    return (JSON.parse(localStorage.getItem("nriju_wishlist") || "[]") || []).map(
      normalizeCategory,
    );
  } catch {
    return [];
  }
};

const saveWishlist = (items) => {
  localStorage.setItem("nriju_wishlist", JSON.stringify(items));
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: {
    items: loadWishlist(), // array of product objects or IDs
  },
  reducers: {
    toggleWishlist: (state, action) => {
      const product = action.payload;
      const id = typeof product === "string" ? product : product._id;
      const exists = state.items.some((i) => (typeof i === "string" ? i === id : i._id === id));

      if (exists) {
        state.items = state.items.filter((i) => (typeof i === "string" ? i !== id : i._id !== id));
      } else {
        state.items.push(product);
      }
      saveWishlist(state.items);
    },
    clearWishlist: (state) => {
      state.items = [];
      saveWishlist(state.items);
    },
  },
});

export const { toggleWishlist, clearWishlist } = wishlistSlice.actions;

export const selectInWishlist = (id) => (state) =>
  state.wishlist.items.some((i) => (typeof i === "string" ? i === id : i._id === id));

export default wishlistSlice.reducer;
