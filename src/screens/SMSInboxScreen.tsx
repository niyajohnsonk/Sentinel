import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, AlertTriangle, ShieldCheck, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';

import { Theme } from '../theme';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { getStoredThreats } from '../lib/storage';
import { ThreatAnalysisResult } from '../types';

export const SMSInboxScreen = () => {
  const [isDetailedView, setIsDetailedView] = useState(false);
  const [selectedSms, setSelectedSms] = useState<ThreatAnalysisResult | null>(null);
  const [analyzedData, setAnalyzedData] = useState<ThreatAnalysisResult[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const loadMessages = async () => {
        try {
          const threats = await getStoredThreats();
          if (isActive) {
            const smsThreats = threats.filter(t => t.sourceType === 'SMS');
            setAnalyzedData(smsThreats);
          }
        } catch (error) {
          console.error('[SMSInboxScreen] Error loading SMS threats:', error);
        }
      };

      loadMessages();
      return () => {
        isActive = false;
      };
    }, [])
  );

  const renderSmsItem = (item: ThreatAnalysisResult) => {
    const isHighRisk = item.severity === 'high';
    const isSuspicious = item.severity === 'medium';
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={styles.smsItem}
        onPress={() => {
          if (item.severity === 'high') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Vibration.vibrate([100, 300, 100, 300]);
          } else if (item.severity === 'medium') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setSelectedSms(item);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.smsHeader}>
          <Text style={styles.sender}>{item.sourceLabel}</Text>
          <Text style={styles.time}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.contentPreview} numberOfLines={isDetailedView ? 3 : 1}>
          {item.content}
        </Text>
        
        {isDetailedView && (
          <View style={styles.detailedBadgeContainer}>
            <RiskBadge level={item.severity} size="small" />
            <Text style={styles.detailedLabel}>{item.label}</Text>
          </View>
        )}

        {/* Minimal Risk Indicator */}
        {!isDetailedView && item.severity !== 'low' && (
          <View style={[styles.minimalIndicator, { backgroundColor: isHighRisk ? Theme.colors.danger : Theme.colors.warning }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        title="SMS Shield" 
        showBack={false} 
        rightComponent={
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Detail</Text>
            <Switch 
              value={isDetailedView} 
              onValueChange={setIsDetailedView} 
              trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        }
      />
      
      <ScrollView contentContainerStyle={styles.listContainer}>
        {analyzedData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShieldCheck size={48} color={Theme.colors.safe} style={{ marginBottom: Theme.spacing.md }} />
            <Text style={styles.emptyTitle}>Inboxes Secured</Text>
            <Text style={styles.emptyText}>No suspicious or flagged SMS messages have been detected yet.</Text>
          </View>
        ) : (
          analyzedData.map(renderSmsItem)
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedSms}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSms(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Message Details</Text>
            <TouchableOpacity onPress={() => setSelectedSms(null)} style={styles.closeBtn}>
              <X size={24} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {selectedSms && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalTopSection}>
                <RiskBadge level={selectedSms.severity} size="large" />
                <View style={styles.scoreCircle}>
                  <Text style={[styles.scoreNumber, { color: selectedSms.severity === 'high' ? Theme.colors.danger : selectedSms.severity === 'medium' ? Theme.colors.warning : Theme.colors.safe }]}>
                    {selectedSms.score}
                  </Text>
                  <Text style={styles.scoreLabel}>Risk Score</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Sender</Text>
              <Text style={styles.modalText}>{selectedSms.sourceLabel}</Text>

              <Text style={styles.sectionTitle}>Full Message</Text>
              <View style={styles.messageBox}>
                <Text style={styles.messageContent}>{selectedSms.content}</Text>
              </View>

              <Text style={styles.sectionTitle}>Analysis</Text>
              <Text style={styles.modalText}>{selectedSms.label}</Text>
              <View style={styles.reasonsList}>
                {selectedSms.reasons.map((r, i) => (
                  <View key={i} style={styles.reasonRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.reasonText}>{r}</Text>
                  </View>
                ))}
              </View>

              {selectedSms.matchedSignals && selectedSms.matchedSignals.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Extracted Threats</Text>
                  {selectedSms.matchedSignals.map((signal, i) => (
                    <View key={i} style={styles.phraseBox}>
                      <Text style={styles.phraseText}>{signal}</Text>
                    </View>
                  ))}
                </>
              )}

              <Text style={[styles.sectionTitle, { color: Theme.colors.primary, marginTop: 24 }]}>
                Recommended Action
              </Text>
              <View style={styles.actionBox}>
                <Text style={styles.actionText}>{selectedSms.recommendedAction}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -10,
  },
  toggleLabel: {
    ...Theme.typography.small,
    marginRight: 4,
  },
  listContainer: {
    paddingTop: Theme.spacing.sm,
  },
  smsItem: {
    backgroundColor: Theme.colors.card,
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    position: 'relative',
  },
  smsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sender: {
    ...Theme.typography.body,
    fontWeight: '600',
  },
  time: {
    ...Theme.typography.small,
  },
  contentPreview: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  detailedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  detailedLabel: {
    ...Theme.typography.caption,
    fontWeight: '500',
  },
  minimalIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
  },
  modalTitle: {
    ...Theme.typography.h3,
  },
  closeBtn: {
    padding: Theme.spacing.xs,
  },
  modalScroll: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  modalTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  scoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Theme.colors.border,
  },
  scoreNumber: {
    ...Theme.typography.h2,
    lineHeight: 28,
  },
  scoreLabel: {
    ...Theme.typography.small,
    fontSize: 10,
  },
  sectionTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    marginTop: Theme.spacing.lg,
  },
  modalText: {
    ...Theme.typography.body,
    fontWeight: '500',
  },
  messageBox: {
    backgroundColor: Theme.colors.card,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  messageContent: {
    ...Theme.typography.body,
    lineHeight: 24,
  },
  reasonsList: {
    marginTop: Theme.spacing.xs,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: Theme.spacing.lg,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.textSecondary,
    marginTop: 8,
    marginRight: 8,
  },
  reasonText: {
    ...Theme.typography.body,
  },
  phraseBox: {
    backgroundColor: Theme.colors.dangerLight,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.sm,
  },
  phraseText: {
    ...Theme.typography.body,
    color: Theme.colors.danger,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  phraseReason: {
    ...Theme.typography.caption,
    color: Theme.colors.danger,
    fontWeight: '600',
  },
  actionBox: {
    backgroundColor: Theme.colors.primaryLight,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  actionText: {
    ...Theme.typography.body,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.xs,
  },
  emptyText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
});
