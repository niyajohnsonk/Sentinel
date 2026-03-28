import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Phone, MessageSquare, Link as LinkIcon, AlertTriangle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Theme } from '../theme';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { getStoredThreats } from '../lib/storage';
import { SourceType, ThreatAnalysisResult } from '../types';

export const ThreatVaultScreen = () => {
  const [activeFilter, setActiveFilter] = useState<SourceType | 'ALL'>('ALL');
  const [storedData, setStoredData] = useState<ThreatAnalysisResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const data = await getStoredThreats();
        setStoredData(data);
      };
      load();
    }, [])
  );

  const filteredData = storedData.filter(
    item => activeFilter === 'ALL' || item.sourceType === activeFilter
  );

  const FilterChip = ({ label, value }: { label: string, value: SourceType | 'ALL' }) => {
    const isActive = activeFilter === value;
    return (
      <TouchableOpacity 
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => setActiveFilter(value)}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'CALL': return <Phone size={16} color={Theme.colors.textSecondary} />;
      case 'SMS': return <MessageSquare size={16} color={Theme.colors.textSecondary} />;
      case 'URL': return <LinkIcon size={16} color={Theme.colors.textSecondary} />;
      default: return <AlertTriangle size={16} color={Theme.colors.textSecondary} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Threat Vault" showBack={false} />
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <FilterChip label="All Threats" value="ALL" />
          <FilterChip label="Calls" value="CALL" />
          <FilterChip label="SMS" value="SMS" />
          <FilterChip label="URLs" value="URL" />
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={48} color={Theme.colors.border} />
            <Text style={styles.emptyTitle}>No threats found</Text>
            <Text style={styles.emptyDesc}>Your device is secure.</Text>
          </View>
        ) : (
          filteredData.map(item => (
            <View key={item.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <View style={styles.sourceTag}>
                  {getSourceIcon(item.sourceType)}
                  <Text style={styles.sourceText}>{item.sourceType}</Text>
                </View>
                <Text style={styles.timeText}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.logBody}>
                <Text style={styles.logTitle}>{item.label}</Text>
                <RiskBadge level={item.severity} size="small" />
              </View>
              
              <Text style={styles.logReason} numberOfLines={2}>
                {item.reasons[0] || item.content}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  filterContainer: {
    backgroundColor: Theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingVertical: Theme.spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    ...Theme.typography.body,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Theme.spacing.xxl * 2,
  },
  emptyTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  emptyDesc: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
  },
  logItem: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadows.card,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    ...Theme.typography.caption,
    fontWeight: '600',
  },
  timeText: {
    ...Theme.typography.small,
  },
  logBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  logTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  logReason: {
    ...Theme.typography.small,
    lineHeight: 18,
  },
});
