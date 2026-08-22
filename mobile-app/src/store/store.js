import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';

// Slices
import authReducer from './slices/authSlice';
import scheduleReducer from './slices/scheduleSlice';
import gradeReducer from './slices/gradeSlice';
import communityReducer from './slices/communitySlice';
import marketplaceReducer from './slices/marketplaceSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
  whitelist: ['auth', 'schedule', 'grades'], // Only persist these reducers
};

// Create persisted reducers
const persistedAuthReducer = persistReducer(persistConfig, authReducer);

const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    schedule: scheduleReducer,
    grades: gradeReducer,
    community: communityReducer,
    marketplace: marketplaceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export const persistor = persistStore(store);

export default store;
