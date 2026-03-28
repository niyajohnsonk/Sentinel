import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, PhoneCall, MessageSquare, AlertTriangle, Shield, Link as LinkIcon } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Theme } from '../theme';
import { Card } from '../components/Card';
import { MainTabParamList } from '../navigation/AppNavigator';
import { getStoredThreats } from '../lib/storage';
import { ThreatAnalysisResult, SourceType } from '../types';
import { RiskBadge } from '../components/RiskBadge';

type NavigationProp = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [storedData, setStoredData] = useState<ThreatAnalysisResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const data = await getStoredThreats();
        setStoredData(data);
      };
      loadData();
    }, [])
  );

  const todayStr = new Date().toDateString();
  const threatsToday = storedData.filter(d => new Date(d.timestamp).toDateString() === todayStr).length;
  const callsFlagged = storedData.filter(d => d.sourceType === 'CALL').length;
  const smsFlagged = storedData.filter(d => d.sourceType === 'SMS').length;
  const urlsFlagged = storedData.filter(d => d.sourceType === 'URL').length;

  const recentActivity = storedData.slice(0, 3);

  const StatBox = ({ title, count, icon: Icon, color }: any) => (
    <View style={styles.statBox}>
      <Icon size={24} color={color} style={styles.statIcon} />
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const getSourceIcon = (type: SourceType, props: any) => {
    switch (type) {
      case 'CALL': return <PhoneCall {...props} />;
      case 'SMS': return <MessageSquare {...props} />;
      case 'URL': return <LinkIcon {...props} />;
      default: return <AlertTriangle {...props} />;
    }
  };

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'high': return { bg: Theme.colors.dangerLight, fg: Theme.colors.danger };
      case 'medium': return { bg: Theme.colors.warning + '20', fg: Theme.colors.warning };
      default: return { bg: Theme.colors.safeLight, fg: Theme.colors.safe };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Protected & Secure</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.statusBadge}>
            <ShieldCheck size={20} color={Theme.colors.safe} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Threat Summary</Text>
          <View style={styles.statsGrid}>
            <StatBox title="Today" count={threatsToday} icon={AlertTriangle} color={Theme.colors.warning} />
            <StatBox title="Calls Flagged" count={callsFlagged} icon={PhoneCall} color={Theme.colors.primary} />
            <StatBox title="SMS Flagged" count={smsFlagged} icon={MessageSquare} color={Theme.colors.accent} />
            <StatBox title="URLs Flagged" count={urlsFlagged} icon={LinkIcon} color={Theme.colors.danger} />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { marginHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.xl }]}>
          Quick Access
        </Text>
        
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('Call')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, { backgroundColor: Theme.colors.primaryLight }]}>
              <PhoneCall size={24} color={Theme.colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Live Call</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('SMS')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, { backgroundColor: Theme.colors.safeLight }]}>
              <MessageSquare size={24} color={Theme.colors.safe} />
            </View>
            <Text style={styles.actionTitle}>SMS Inbox</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Vault')}>
              <Text style={styles.linkText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentActivity.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Shield size={32} color={Theme.colors.border} />
              <Text style={styles.emptyTitle}>No recent threats</Text>
              <Text style={styles.emptyDesc}>Your device is currently secure.</Text>
            </View>
          ) : (
            recentActivity.map(item => {
              const colors = getActivityColor(item.severity);
              return (
                <View key={item.id} style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: colors.bg }]}>
                    {getSourceIcon(item.sourceType, { size: 16, color: colors.fg })}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle} numberOfLines={1}>{item.label}</Text>
                    <Text style={styles.activityTime}>{new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <RiskBadge level={item.severity} size="small" />
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    paddingBottom: Theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
  },
  greeting: {
    ...Theme.typography.caption,
    color: Theme.colors.safe,
    fontWeight: '600',
    marginBottom: 4,
  },
  title: {
    ...Theme.typography.h1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.safeLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
  },
  statusText: {
    ...Theme.typography.caption,
    color: Theme.colors.safe,
    fontWeight: '700',
  },
  statsCard: {
    marginHorizontal: Theme.spacing.lg,
  },
  sectionTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: Theme.spacing.md,
  },
  statBox: {
    alignItems: 'center',
    flexBasis: '48%',
  },
  statIcon: {
    marginBottom: Theme.spacing.xs,
  },
  statCount: {
    ...Theme.typography.h2,
    marginBottom: 2,
  },
  statTitle: {
    ...Theme.typography.small,
    textAlign: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    ...Theme.shadows.card,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  actionTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
  },
  recentCard: {
    marginHorizontal: Theme.spacing.lg,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  linkText: {
    ...Theme.typography.body,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  activityContent: {
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  activityTitle: {
    ...Theme.typography.body,
    fontWeight: '500',
  },
  activityTime: {
    ...Theme.typography.small,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  emptyTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.sm,
  },
  emptyDesc: {
    ...Theme.typography.small,
    color: Theme.colors.textSecondary,
  },
});
