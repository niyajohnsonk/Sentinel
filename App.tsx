import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initDB } from './src/lib/storage';
import { Theme } from './src/theme';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'MainTabs'>('Onboarding');

  useEffect(() => {
    async function prepare() {
      try {
        await initDB();
        const flag = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (flag === 'true') {
          setInitialRoute('MainTabs');
        }
      } catch (e) {
        console.warn('Init error:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Starting Sentinel...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator initialRouteName={initialRoute} />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.primary,
  }
});
