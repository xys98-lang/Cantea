import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/store/auth';
import { colors, spacing, type } from '../src/theme';

export default function Index() {
  const { booting, isSignedIn } = useAuth();

  if (booting) {
    return (
      <View style={s.wrap}>
        <Text style={s.wordmark}>cantea</Text>
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? '/home' : '/login'} />;
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  wordmark: {
    ...type.wordmark,
    color: colors.brandDeep,
  },
});
