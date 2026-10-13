import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import authReducer from "../slices/authSlice";
import cartReducer from "../slices/cartSlice";
import wishlistReducer from "../slices/wishlistSlice";
import uiReducer from "../slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Typed hooks used across the app (Header, CartDrawer, guards, admin pages).
// NOTE: useAppDispatch must be the hook itself (not a wrapper) so it returns
// the stable dispatch reference react-redux provides. Wrapping it in an
// arrow would create a new function every render, which breaks effects that
// depend on dispatch (e.g. App's fetchMe bootstrap) and causes render loops.
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;

export default store;
