import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { adminColors } from '@/constants/admin';

export default function AdminIndexScreen() {
  const { isReady, isAuthenticated } = useAdminAuth();

  if (!isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={adminColors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/admin/(tabs)" />;
  }

  return <Redirect href="/" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminColors.background,
  },
});
