import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  listings: [],
  myListings: [],
  favorites: [],
  loading: false,
  error: null,
  searchQuery: '',
  filterCondition: 'all',
};

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    setMarketplaceLoading: (state, action) => {
      state.loading = action.payload;
    },
    setListings: (state, action) => {
      state.listings = action.payload;
      state.loading = false;
      state.error = null;
    },
    addListing: (state, action) => {
      state.listings.unshift(action.payload);
      state.myListings.unshift(action.payload);
    },
    updateListing: (state, action) => {
      const index = state.listings.findIndex(l => l.id === action.payload.id);
      if (index !== -1) {
        state.listings[index] = { ...state.listings[index], ...action.payload };
      }
    },
    removeListing: (state, action) => {
      state.listings = state.listings.filter(l => l.id !== action.payload);
      state.myListings = state.myListings.filter(l => l.id !== action.payload);
    },
    toggleFavorite: (state, action) => {
      const index = state.favorites.indexOf(action.payload);
      if (index > -1) {
        state.favorites.splice(index, 1);
      } else {
        state.favorites.push(action.payload);
      }
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilterCondition: (state, action) => {
      state.filterCondition = action.payload;
    },
    setMarketplaceError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setMarketplaceLoading,
  setListings,
  addListing,
  updateListing,
  removeListing,
  toggleFavorite,
  setSearchQuery,
  setFilterCondition,
  setMarketplaceError,
} = marketplaceSlice.actions;

export default marketplaceSlice.reducer;
