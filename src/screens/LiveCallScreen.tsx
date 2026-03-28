import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, AlertOctagon, ShieldX } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Theme } from '../theme';
import { Header } from '../components/Header';
import { ScoreRing } from '../components/ScoreRing';
import { NORMAL_CALL_TRANSCRIPT, SCAM_CALL_TRANSCRIPT } from '../data/mockData';
import { ActiveCallTranscriptChunk } from '../types';
import { analyzeThreat } from '../lib/rulesEngine';
import { saveThreat } from '../lib/storage';

export const LiveCallScreen = () => {
  const [isScamScenario, setIsScamScenario] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState(0);
  const [score, setScore] = useState(0);
  
  const transcript = isScamScenario ? SCAM_CALL_TRANSCRIPT : NORMAL_CALL_TRANSCRIPT;
  const scrollViewRef = useRef<ScrollView>(null);
  
  const visibleChunks = transcript.filter(chunk => chunk.timestamp <= simulatedTime);

  // Simulation timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setSimulatedTime(prev => prev + 1000);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Handle new chunks appearing (calculate score and haptics)
  useEffect(() => {
    if (!isActive) return;

    const aggregatedText = visibleChunks.map(c => c.text).join(' ');
    let finalScore = 0;
    
    if (aggregatedText.trim()) {
      const analysis = analyzeThreat(aggregatedText, 'CALL', 'Unknown Caller');
      finalScore = analysis.score;
    }

    setScore(finalScore);

    if (finalScore > 70 && isScamScenario) {
      // High risk reached
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (visibleChunks.length > 0 && visibleChunks[visibleChunks.length - 1].timestamp === simulatedTime) {
      // Just a normal message popped up
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Auto scroll
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

  }, [simulatedTime, isActive]);

  const toggleScenario = () => {
    setIsScamScenario(!isScamScenario);
    resetSimulation();
  };

  const toggleSimulation = () => {
    if (!isActive && simulatedTime === 0) {
      // Starting fresh
      setIsActive(true);
    } else if (isActive) {
      // Pausing / Stopping
      setIsActive(false);
      // Save result if flagged
      const aggregatedText = visibleChunks.map(c => c.text).join(' ');
      if (aggregatedText.trim()) {
        const analysis = analyzeThreat(aggregatedText, 'CALL', 'Unknown Caller');
        if (analysis.isFlagged) {
          saveThreat(analysis);
        }
      }
    } else {
      // Resuming
      setIsActive(true);
    }
  };

  const resetSimulation = () => {
    setIsActive(false);
    setSimulatedTime(0);
    setScore(0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Live Call Monitor" showBack={false} />
      
      <View style={styles.controls}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Scenario: {isScamScenario ? 'Scam Call' : 'Normal Call'}</Text>
          <Switch 
            value={isScamScenario} 
            onValueChange={toggleScenario}
            trackColor={{ false: Theme.colors.safe, true: Theme.colors.danger }} 
            disabled={isActive}
          />
        </View>
        <RNAnimated.View style={styles.scoreContainer}>
          <ScoreRing score={score} size={140} />
          <View style={styles.callControls}>
            <Text style={styles.statusText}>
              {isActive ? 'Call in Progress...' : 'Call Ended / Paused'}
            </Text>
            <Text style={styles.timeText}>
              00:{Math.floor(simulatedTime / 1000).toString().padStart(2, '0')}
            </Text>
          </View>
        </RNAnimated.View>
        
        <View style={styles.actionButtons}>
          <Text 
            style={[styles.simButton, isActive ? styles.stopBtn : styles.startBtn]} 
            onPress={toggleSimulation}
          >
            {isActive ? 'Pause' : simulatedTime > 0 ? 'Resume' : 'Start Call'}
          </Text>
          <Text style={[styles.simButton, styles.resetBtn]} onPress={resetSimulation}>Reset</Text>
        </View>
      </View>

      {score >= 80 && (
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <ShieldX color="#fff" size={24} />
            <Text style={styles.alertTitle}>HIGH RISK CRITICAL</Text>
          </View>
          <Text style={styles.alertText}>
            Do NOT send money or provide information. This is a known extortion pattern. Hang up immediately.
          </Text>
        </View>
      )}

      <ScrollView 
        style={styles.transcript} 
        contentContainerStyle={styles.transcriptContent}
        ref={scrollViewRef}
      >
        <Text style={styles.transcriptHeader}>Live Transcript</Text>
        {visibleChunks.map((chunk) => (
          <View key={chunk.id} style={styles.chunkWrapper}>
            <View style={[styles.bubble, chunk.isCaller ? styles.callerBubble : styles.userBubble]}>
              <Text style={[styles.bubbleText, chunk.isCaller ? styles.callerText : styles.userText]}>
                {chunk.text}
              </Text>
            </View>
            {chunk.signalTriggered && (
              <View style={styles.signalBadge}>
                <AlertOctagon size={12} color={Theme.colors.danger} />
                <Text style={styles.signalText}>{chunk.signalTriggered}</Text>
              </View>
            )}
          </View>
        ))}
        {isActive && visibleChunks.length < transcript.length && (
          <Text style={styles.typingIndicator}>Listening...</Text>
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
  controls: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  toggleLabel: {
    ...Theme.typography.body,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  callControls: {
    alignItems: 'center',
  },
  statusText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeText: {
    ...Theme.typography.h2,
    fontVariant: ['tabular-nums'],
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
  },
  simButton: {
    ...Theme.typography.body,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: Theme.colors.primary,
    color: '#fff',
  },
  stopBtn: {
    backgroundColor: Theme.colors.warning,
    color: '#fff',
  },
  resetBtn: {
    backgroundColor: Theme.colors.border,
    color: Theme.colors.textPrimary,
  },
  alertCard: {
    backgroundColor: Theme.colors.danger,
    margin: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    ...Theme.shadows.card,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    ...Theme.typography.h3,
    color: '#fff',
    letterSpacing: 1,
  },
  alertText: {
    ...Theme.typography.body,
    color: '#fff',
    fontWeight: '500',
  },
  transcript: {
    flex: 1,
  },
  transcriptContent: {
    padding: Theme.spacing.lg,
    paddingBottom: 40,
  },
  transcriptHeader: {
    ...Theme.typography.caption,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  chunkWrapper: {
    marginBottom: Theme.spacing.md,
  },
  bubble: {
    maxWidth: '85%',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  callerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    ...Theme.typography.body,
  },
  callerText: {
    color: Theme.colors.textPrimary,
  },
  userText: {
    color: '#fff',
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    marginTop: 4,
    gap: 4,
  },
  signalText: {
    ...Theme.typography.small,
    color: Theme.colors.danger,
    fontWeight: '600',
  },
  typingIndicator: {
    ...Theme.typography.caption,
    fontStyle: 'italic',
    marginTop: Theme.spacing.sm,
  },
});
