import React, { useEffect } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';

// Store & Persistence
import store, { persistor } from './src/store/store';

// Navigation
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';

// Actions
import { setLoading, setUser, setError } from './src/store/slices/authSlice';

const RootNavigator = () => {
  const dispatch = useDispatch();
  const { isLoggedIn, isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Check if user is already logged in on app startup
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          // You can add token validation here
          // For now, just check if token exists
          dispatch(setLoading(false));
        } else {
          dispatch(setLoading(false));
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        dispatch(setLoading(false));
      }
    };

    checkAuth();
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B91D3A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      {isLoggedIn ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<ActivityIndicator />} persistor={persistor}>
        <RootNavigator />
      </PersistGate>
    </Provider>
  );
}
