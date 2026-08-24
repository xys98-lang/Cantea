import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/store/theme';

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.ink,
        tabBarInactiveTintColor: t.colors.icon,
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.line,
          borderTopWidth: 1,
          height: 54 + insets.bottom,
          paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 2 : 6),
          paddingTop: 7,
        },
        /**
         * Năm mục trên màn 375pt còn 75pt mỗi mục. Nhãn 9.5px vừa đủ cho
         * "Cộng đồng" mà không bị cắt — nhưng không còn chỗ cho nhãn dài hơn.
         */
        tabBarLabelStyle: { fontFamily: t.fonts.medium, fontSize: 9.5 },
        tabBarIconStyle: { marginBottom: 0 },
        sceneStyle: { backgroundColor: t.colors.bg },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Lịch',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Cộng đồng',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="canlib"
        options={{
          title: 'Canlib',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
