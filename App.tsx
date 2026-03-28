import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initDB } from './src/lib/storage';
import { Theme } from './src/theme';

import { handleIngestionUrl } from './src/lib/ingestion';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'MainTabs'>('Onboarding');

  const url = Linking.useURL();
  const processedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('[App] App component mounted');
  }, []);

  useEffect(() => {
    const processUrl = async (currentUrl: string | null) => {
      console.log('[App] processUrl triggered with:', currentUrl);
      if (!currentUrl) return;

      if (processedUrlRef.current === currentUrl) {
        console.log('[App] URL already processed in this session, skipping to prevent duplicate alerts.');
        return;
      }
      processedUrlRef.current = currentUrl;

      const result = await handleIngestionUrl(currentUrl);
      console.log('[App] handleIngestionUrl returned:', result?.isFlagged);
      if (result) {
        if (result.isFlagged) {
          Alert.alert(
            "Sentinel Alert",
            `Suspicious ${result.sourceType} detected and saved to Vault.\nReason: ${result.reasons[0] || 'Unknown'}`,
            [{ text: "OK", style: "default" }]
          );
        } else {
          Alert.alert(
            "Sentinel Scan Complete",
            `A safe ${result.sourceType} was scanned successfully.`,
            [{ text: "OK", style: "default" }]
          );
        }
      } else {
        console.log('[App] No valid result returned from handleIngestionUrl.');
      }
    };

    if (isReady && url) {
      console.log('[App] isReady && useURL hook resolved:', url);
      processUrl(url);
    }
  }, [url, isReady]);

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
