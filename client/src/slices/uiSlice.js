import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    mobileMenuOpen: false,
    cartDrawerOpen: false,
    searchModalOpen: false,
  },
  reducers: {
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenu: (state, action) => {
      state.mobileMenuOpen = action.payload;
    },
    toggleCartDrawer: (state) => {
      state.cartDrawerOpen = !state.cartDrawerOpen;
    },
    setCartDrawer: (state, action) => {
      state.cartDrawerOpen = action.payload;
    },
    toggleSearchModal: (state) => {
      state.searchModalOpen = !state.searchModalOpen;
    },
    setSearchModal: (state, action) => {
      state.searchModalOpen = action.payload;
    },
  },
});

export const {
  toggleMobileMenu,
  setMobileMenu,
  toggleCartDrawer,
  setCartDrawer,
  toggleSearchModal,
  setSearchModal,
} = uiSlice.actions;

export default uiSlice.reducer;