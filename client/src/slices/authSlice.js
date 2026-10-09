import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

// Rehydrate user from localStorage on app load
const storedUser = (() => {
  try {
    const raw = localStorage.getItem("nriju_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

export const fetchMe = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  const res = await api.get("/auth/me");
  return res.data.data;
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: storedUser,
    token: null,
    loading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem("nriju_user", JSON.stringify(action.payload));
      } else {
        localStorage.removeItem("nriju_user");
      }
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("nriju_user");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        localStorage.setItem("nriju_user", JSON.stringify(action.payload));
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
      });
  },
});

export const { setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;