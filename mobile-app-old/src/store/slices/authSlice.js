import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
  token: null,
  userProfile: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    // Login success
    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoading = false;
      state.error = null;
    },

    // Login failure
    loginFailure: (state, action) => {
      state.isLoggedIn = false;
      state.error = action.payload;
      state.isLoading = false;
    },

    // Set user
    setUser: (state, action) => {
      state.user = action.payload;
      state.userProfile = action.payload;
    },

    // Set error
    setError: (state, action) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Update user profile
    updateProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      state.userProfile = state.user;
    },

    // Logout
    logout: (state) => {
      state.isLoggedIn = false;
      state.user = null;
      state.token = null;
      state.userProfile = null;
      state.error = null;
    },

    // Set token
    setToken: (state, action) => {
      state.token = action.payload;
    },
  },
});

export const {
  setLoading,
  loginSuccess,
  loginFailure,
  setUser,
  setError,
  clearError,
  updateProfile,
  logout,
  setToken,
} = authSlice.actions;

export default authSlice.reducer;
