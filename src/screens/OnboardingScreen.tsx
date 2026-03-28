import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Theme } from '../theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  
  const [toggles, setToggles] = useState({
    call: true,
    sms: true,
    url: true,
    haptics: true,
  });

  const handleToggle = (key: keyof typeof toggles) => {
    if (toggles.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleActivate = () => {
    if (toggles.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    navigation.replace('MainTabs');
  };

  const ToggleRow = ({ title, description, value, onToggle }: any) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Shield size={48} color={Theme.colors.primary} />
          </View>
          <Text style={styles.title}>Sentinel</Text>
          <Text style={styles.tagline}>Contextual AI Defense</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Quick Shield Setup</Text>
          <Text style={styles.sectionDesc}>Select the modules you want active for your protection.</Text>
          
          <View style={styles.divider} />
          
          <ToggleRow 
            title="Call Protection" 
            description="Real-time analysis of voice calls" 
            value={toggles.call} 
            onToggle={() => handleToggle('call')} 
          />
          <ToggleRow 
            title="SMS Shield" 
            description="Filters phishing and scam texts" 
            value={toggles.sms} 
            onToggle={() => handleToggle('sms')} 
          />
          <ToggleRow 
            title="Link Scanner" 
            description="Analyze URLs before opening" 
            value={toggles.url} 
            onToggle={() => handleToggle('url')} 
          />
          <ToggleRow 
            title="Vibration Alerts" 
            description="Haptic feedback on high risk" 
            value={toggles.haptics} 
            onToggle={() => handleToggle('haptics')} 
          />
        </Card>
      </ScrollView>
      
      <View style={styles.footer}>
        <Button 
          title="Activate Protection" 
          onPress={handleActivate}
          icon={<Shield size={20} color="#fff" />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    padding: Theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginVertical: Theme.spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: {
    ...Theme.typography.h1,
    marginBottom: Theme.spacing.xs,
  },
  tagline: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  card: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.xs,
  },
  sectionDesc: {
    ...Theme.typography.caption,
    marginBottom: Theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: Theme.spacing.md,
  },
  toggleTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleDesc: {
    ...Theme.typography.small,
  },
  footer: {
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
});
