import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Screens
import ScheduleScreen from '../screens/app/ScheduleScreen';
import GradesScreen from '../screens/app/GradesScreen';
import CommunityScreen from '../screens/app/CommunityScreen';
import MarketplaceScreen from '../screens/app/MarketplaceScreen';
import ProfileScreen from '../screens/app/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ScheduleStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ScheduleList" component={ScheduleScreen} options={{ headerTitle: 'Lịch Học' }} />
    </Stack.Navigator>
  );
}

function GradesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="GradesList" component={GradesScreen} options={{ headerTitle: 'Điểm Số' }} />
    </Stack.Navigator>
  );
}

function CommunityStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CommunityFeed" component={CommunityScreen} options={{ headerTitle: 'Cộng Đồng' }} />
    </Stack.Navigator>
  );
}

function MarketplaceStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BookListing" component={MarketplaceScreen} options={{ headerTitle: 'Chợ Sách' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProfilePage" component={ProfileScreen} options={{ headerTitle: 'Hồ Sơ' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'ScheduleStack') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'GradesStack') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'CommunityStack') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'MarketplaceStack') {
            iconName = focused ? 'bookmarks' : 'bookmarks-outline';
          } else if (route.name === 'ProfileStack') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#B91D3A',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="ScheduleStack"
        component={ScheduleStack}
        options={{ tabBarLabel: 'Lịch Học' }}
      />
      <Tab.Screen
        name="GradesStack"
        component={GradesStack}
        options={{ tabBarLabel: 'Điểm Số' }}
      />
      <Tab.Screen
        name="CommunityStack"
        component={CommunityStack}
        options={{ tabBarLabel: 'Cộng Đồng' }}
      />
      <Tab.Screen
        name="MarketplaceStack"
        component={MarketplaceStack}
        options={{ tabBarLabel: 'Chợ Sách' }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStack}
        options={{ tabBarLabel: 'Hồ Sơ' }}
      />
    </Tab.Navigator>
  );
}
