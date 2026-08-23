import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/store/auth';
import { useTheme, useThemedStyles } from '../src/store/theme';

export default function Index() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const { booting, isSignedIn } = useAuth();

  if (booting) {
    return (
      <View style={s.wrap}>
        <Text style={s.wordmark}>cantea</Text>
        <ActivityIndicator color={t.colors.accent} style={{ marginTop: t.spacing.lg }} />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? '/home' : '/login'} />;
}

const styles = (t) =>
  StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bg,
  },
  wordmark: {
    ...t.type.wordmark,
    color: t.colors.accentPressed,
  },
});
