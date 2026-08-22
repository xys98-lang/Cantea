import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  posts: [],
  myPosts: [],
  loading: false,
  error: null,
  selectedCategory: 'General',
  selectedCommunity: 'global',
};

const communitySlice = createSlice({
  name: 'community',
  initialState,
  reducers: {
    setCommunityLoading: (state, action) => {
      state.loading = action.payload;
    },
    setPosts: (state, action) => {
      state.posts = action.payload;
      state.loading = false;
      state.error = null;
    },
    addPost: (state, action) => {
      state.posts.unshift(action.payload);
      state.myPosts.unshift(action.payload);
    },
    deletePost: (state, action) => {
      state.posts = state.posts.filter(p => p.id !== action.payload);
      state.myPosts = state.myPosts.filter(p => p.id !== action.payload);
    },
    likePost: (state, action) => {
      const post = state.posts.find(p => p.id === action.payload);
      if (post) {
        post.likeCount += 1;
      }
    },
    unlikePost: (state, action) => {
      const post = state.posts.find(p => p.id === action.payload);
      if (post) {
        post.likeCount -= 1;
      }
    },
    addComment: (state, action) => {
      const post = state.posts.find(p => p.id === action.payload.postId);
      if (post) {
        post.comments.push(action.payload.comment);
        post.commentCount += 1;
      }
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setSelectedCommunity: (state, action) => {
      state.selectedCommunity = action.payload;
    },
    setCommunityError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setCommunityLoading,
  setPosts,
  addPost,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  setSelectedCategory,
  setSelectedCommunity,
  setCommunityError,
} = communitySlice.actions;

export default communitySlice.reducer;
