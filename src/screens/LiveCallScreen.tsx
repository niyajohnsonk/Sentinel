import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated as RNAnimated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, AlertOctagon, ShieldX } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

import { Theme } from '../theme';
import { Header } from '../components/Header';
import { ScoreRing } from '../components/ScoreRing';
import { ActiveCallTranscriptChunk } from '../types';
import { saveThreat } from '../lib/storage';
import { generateId, analyzeThreat } from '../lib/rulesEngine';
import { analyzeAudioChunk, CallAnalysisResult } from '../lib/callAnalysis';

export const LiveCallScreen = () => {
  const [hasSessionStarted, setHasSessionStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcriptChunks, setTranscriptChunks] = useState<ActiveCallTranscriptChunk[]>([]);
  const [analysisResult, setAnalysisResult] = useState<CallAnalysisResult | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAiPaused, setIsAiPaused] = useState(false);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const transcriptTextRef = useRef('');
  const analysisResultRef = useRef<CallAnalysisResult | null>(null);
  const hasTriggeredHapticsRef = useRef(false);
  const cooldownUntilRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const monitoringTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);
  
  const currentTotalScoreRef = useRef(0);
  const currentReasonsRef = useRef<string[]>([]);
  const currentSignalsRef = useRef<string[]>([]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Timer for duration starts when session starts
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (hasSessionStarted) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [hasSessionStarted]);

  // Auto-scroll on new chunks
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [transcriptChunks, isTranscribing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
       if (monitoringTimerRef.current) clearTimeout(monitoringTimerRef.current);
       if (recordingRef.current) {
          recordingRef.current.stopAndUnloadAsync().catch(() => {});
       }
    };
  }, []);

  const accumulateAndUpdateLocalScore = (delta: number, absoluteScore: number | null, reasons: string[], signals: string[]) => {
      // Monotonic local escalation: if delta > 0, we add it. If absolute > current, we jump.
      let newScore = currentTotalScoreRef.current;
      if (absoluteScore !== null) {
          newScore = Math.max(newScore, absoluteScore);
      } else {
          newScore = Math.min(100, Math.max(newScore, newScore + delta));
      }
      
      currentTotalScoreRef.current = newScore;
      
      // Merge unique reasons up to 5
      const mergedReasons = Array.from(new Set([...currentReasonsRef.current, ...reasons])).slice(-5);
      currentReasonsRef.current = mergedReasons;

      const mergedSignals = Array.from(new Set([...currentSignalsRef.current, ...signals]));
      currentSignalsRef.current = mergedSignals;

      let label: "Safe" | "Suspicious" | "High Risk Scam" = "Safe";
      if (newScore >= 70) label = "High Risk Scam";
      else if (newScore >= 40) label = "Suspicious";

      updateScreenWithResult({
          score: newScore,
          label,
          reasons: mergedReasons,
          matchedSignals: mergedSignals
      });
  };

  const processAudioChunk = async (uri: string) => {
    console.log(`[LiveCall] processAudioChunk: starting processing for URI: ${uri}`);
    if (Date.now() < cooldownUntilRef.current) {
       console.log(`[LiveCall] processAudioChunk: In cooldown. Skipping transcription.`);
       if (!isAiPaused) setIsAiPaused(true);
       handleNewTranscriptText("[System: Transcription paused due to Quota API limit]");
       
       const localResult = analyzeThreat(transcriptTextRef.current, 'CALL', 'Live Audio Analysis');
       accumulateAndUpdateLocalScore(0, localResult.score, localResult.reasons, localResult.matchedSignals);
       return;
    }

    console.log(`[LiveCall] chunk request start for URI: ${uri}`);
    setIsTranscribing(true);
    const response = await analyzeAudioChunk(uri);
    setIsTranscribing(false);

    if (response.error) {
       console.log(`[LiveCall] chunk failure for URI: ${uri} - Error: ${response.error}`);
       if (response.error === 'QUOTA_EXCEEDED') {
          console.log(`[LiveCall] processAudioChunk: QUOTA_EXCEEDED, setting cooldown.`);
          cooldownUntilRef.current = Date.now() + 60000;
          setIsAiPaused(true);
       }
       handleNewTranscriptText(`[System: Transcription failed - ${response.error}]`);
       
       const localResult = analyzeThreat(transcriptTextRef.current, 'CALL', 'Live Audio Analysis');
       accumulateAndUpdateLocalScore(0, localResult.score, localResult.reasons, localResult.matchedSignals);
       return; 
    }

    console.log(`[LiveCall] chunk success for URI: ${uri}. Text length: ${response.transcript.length}`);
    if (response.transcript && response.transcript.trim().length > 0) {
       handleNewTranscriptText(response.transcript.trim());
    } else {
       console.log(`[LiveCall] processAudioChunk: transcription returned empty text, appending silence indicator.`);
       handleNewTranscriptText("[Silence detected]");
    }

    if (isAiPaused) setIsAiPaused(false);
    accumulateAndUpdateLocalScore(response.chunkRiskScore, null, response.reasons, response.matchedSignals);
  };

  const startNextRecordingChunk = async () => {
     console.log(`[LiveCall] startNextRecordingChunk initiated. isStoppingRef: ${isStoppingRef.current}`);
     if (isStoppingRef.current) {
         console.log(`[LiveCall] loop stopped because isStoppingRef is true.`);
         return;
     }
     
     // Stop existing if any
     let previousUri = null;
     if (recordingRef.current) {
        console.log(`[LiveCall] chunk recording stop requested.`);
        try {
           await recordingRef.current.stopAndUnloadAsync();
           previousUri = recordingRef.current.getURI();
           console.log(`[LiveCall] chunk URI created: ${previousUri}`);
        } catch (e) {
           console.error("[LiveCall] Error stopping recording chunk", e);
        }
        recordingRef.current = null;
     }

     // Process previous chunk asynchronously
     if (previousUri) {
         processAudioChunk(previousUri).catch(e => console.error("[LiveCall] processAudioChunk threw an exception", e));
     }

     if (isStoppingRef.current) {
        console.log(`[LiveCall] loop stopped after processing previous chunk because isStoppingRef is true.`);
        return;
     }

     // Start new recording
     try {
       console.log(`[LiveCall] chunk recording start initiated...`);
       const { recording } = await Audio.Recording.createAsync(
         Audio.RecordingOptionsPresets.HIGH_QUALITY
       );
       recordingRef.current = recording;
       setIsRecording(true);
       console.log(`[LiveCall] chunk recording start SUCCESS.`);
       
       // Schedule next rotation after 15s
       // FIX: Use an arrow function so it always captures the freshest startNextRecordingChunk if needed (though it's still constant scope)
       console.log(`[LiveCall] scheduling next chunk recording in 15 seconds.`);
       monitoringTimerRef.current = setTimeout(() => {
           console.log(`[LiveCall] monitoring timer fired, executing startNextRecordingChunk`);
           startNextRecordingChunk();
       }, 15000);
     } catch (e) {
       console.error("[LiveCall] Failed to start chunk. Loop stopped.", e);
       setIsRecording(false);
       setHasSessionStarted(false);
     }
  };

  const startMonitoring = async () => {
    try {
      if (!hasSessionStarted) setHasSessionStarted(true);
      isStoppingRef.current = false;
      
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      await startNextRecordingChunk();
    } catch (err) {
      console.error('Failed to start monitoring', err);
    }
  };

  const stopMonitoring = async () => {
     isStoppingRef.current = true;
     if (monitoringTimerRef.current) clearTimeout(monitoringTimerRef.current);
     
     let finalUri = null;
     if (recordingRef.current) {
         try {
           await recordingRef.current.stopAndUnloadAsync();
           finalUri = recordingRef.current.getURI();
         } catch (e) {}
         recordingRef.current = null;
     }
     setIsRecording(false);
     
     if (finalUri) {
        await processAudioChunk(finalUri);
     }
     await stopSession();
  };

  const handleNewTranscriptText = (text: string) => {
    if (!text.startsWith('[System:') && !text.startsWith('[Silence')) {
      transcriptTextRef.current += (transcriptTextRef.current.length > 0 ? '\n' : '') + text;
    }

    const newChunk: ActiveCallTranscriptChunk = {
      id: Math.random().toString(),
      text: text,
      timestamp: Date.now(),
      isCaller: false
    };

    setTranscriptChunks(prevChunks => {
       const nextArr = [...prevChunks, newChunk];
       console.log(`[LiveCall] transcript array length after append: ${nextArr.length}`);
       return nextArr;
    });
  };

  const updateScreenWithResult = (result: CallAnalysisResult) => {
      setAnalysisResult(result);
      analysisResultRef.current = result;
      
      // Assign matched signals to latest chunk for UI display
      if (result.matchedSignals.length > 0) {
        setTranscriptChunks(prev => {
          const newArr = [...prev];
          const lastIdx = newArr.length - 1;
          if (lastIdx >= 0 && !newArr[lastIdx].signalTriggered) {
             newArr[lastIdx] = {
               ...newArr[lastIdx],
               signalTriggered: result.matchedSignals[result.matchedSignals.length - 1]
             };
          }
          return newArr;
        });
      }

      if (result.score >= 70 && !hasTriggeredHapticsRef.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        hasTriggeredHapticsRef.current = true;
      } else if (result.score < 70) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
  };



  const stopSession = async () => {
    isStoppingRef.current = true;
    if (monitoringTimerRef.current) clearTimeout(monitoringTimerRef.current);
    
    if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
    }
    
    setIsRecording(false);
    setHasSessionStarted(false);

    if (analysisResultRef.current && analysisResultRef.current.score >= 70) {
      await saveThreat({
        id: generateId(),
        sourceType: 'CALL',
        sourceLabel: 'Live Audio Analysis',
        content: transcriptTextRef.current,
        score: analysisResultRef.current.score,
        label: analysisResultRef.current.label,
        severity: 'high',
        reasons: analysisResultRef.current.reasons,
        matchedSignals: analysisResultRef.current.matchedSignals,
        timestamp: new Date().toISOString(),
        isFlagged: true
      });
    }
  };

  const resetSession = async () => {
     isStoppingRef.current = true;
     if (recordingRef.current) {
       try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
       recordingRef.current = null;
     }
     if (monitoringTimerRef.current) clearTimeout(monitoringTimerRef.current);
     
     setIsRecording(false);
     setHasSessionStarted(false);
     setCallDuration(0);
     setTranscriptChunks([]);
     setAnalysisResult(null);
     hasTriggeredHapticsRef.current = false;
     transcriptTextRef.current = '';
     analysisResultRef.current = null;
     cooldownUntilRef.current = 0;
     currentTotalScoreRef.current = 0;
     currentReasonsRef.current = [];
     currentSignalsRef.current = [];
     setIsAiPaused(false);
  };

  const score = analysisResult?.score || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Live Call Monitor" showBack={false} />
      
      <View style={styles.controls}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Live Audio Analysis</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            {hasSessionStarted && <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: isAiPaused ? Theme.colors.warning : Theme.colors.danger}} />}
            <Text style={{...Theme.typography.caption, color: hasSessionStarted ? (isAiPaused ? Theme.colors.warning : Theme.colors.danger) : Theme.colors.textSecondary, fontWeight: '600'}}>
               {!hasSessionStarted ? 'Standby' : (isAiPaused ? 'Using local detection mode' : 'Active')}
            </Text>
          </View>
        </View>
        
        <RNAnimated.View style={styles.scoreContainer}>
          <ScoreRing score={score} size={140} />
          <View style={styles.callControls}>
            <Text style={styles.statusText}>
              {hasSessionStarted ? 'Monitoring Audio' : 'Session Ended'}
            </Text>
            <Text style={styles.timeText}>
              00:{callDuration.toString().padStart(2, '0')}
            </Text>
          </View>
        </RNAnimated.View>
        
        <View style={styles.actionButtons}>
          {hasSessionStarted && isRecording ? (
            <Text style={[styles.simButton, styles.activeCallerBtn]} onPress={stopMonitoring}>
              Stop Call Monitoring
            </Text>
          ) : (
             <Text style={[styles.simButton, styles.activeUserBtn]} onPress={startMonitoring}>
              Start Call Monitoring
            </Text>
          )}
        </View>
        
        <View style={styles.sessionButtons}>
            <Text 
              style={[styles.sessionButton, styles.resetBtn, !hasSessionStarted && {opacity: 0.5}]} 
              onPress={hasSessionStarted ? stopSession : undefined}
            >
              Force Save & Stop
            </Text>
            <Text style={[styles.sessionButton, styles.resetBtn]} onPress={resetSession}>
              Reset Session
            </Text>
        </View>
      </View>

      {score >= 70 && (
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <ShieldX color="#fff" size={24} />
            <Text style={styles.alertTitle}>HIGH RISK CRITICAL</Text>
          </View>
          <Text style={styles.alertText}>
            {analysisResult?.label || 'High Risk Scam'} detected. Hang up immediately.
          </Text>
        </View>
      )}

      <ScrollView 
        style={styles.transcript} 
        contentContainerStyle={styles.transcriptContent}
        ref={scrollViewRef}
      >
        <Text style={styles.transcriptHeader}>Continuous Transcript</Text>
        {transcriptChunks.length === 0 && !hasSessionStarted && (
          <Text style={{...Theme.typography.body, textAlign: 'center', opacity: 0.5, marginTop: 20}}>
            Tap "Start Call Monitoring" to automatically record and analyze the conversation.
          </Text>
        )}
        
        {transcriptChunks.slice(-3).map((chunk) => (
          <View key={chunk.id} style={styles.chunkWrapper}>
            <View style={[styles.bubble, styles.neutralBubble]}>
              <Text style={styles.bubbleText}>
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
        {isTranscribing && !isAiPaused && (
          <Text style={styles.typingIndicator}>Analyzing previous audio block...</Text>
        )}
        {isRecording && !isTranscribing && (
          <Text style={styles.typingIndicator}>Listening to background audio...</Text>
        )}
        
        {analysisResult && analysisResult.reasons.length > 0 && transcriptChunks.length > 0 && (
           <View style={{marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderColor: Theme.colors.border}}>
             <Text style={{...Theme.typography.caption, marginBottom: 8}}>
               {isAiPaused ? 'Current Analysis Details (Local Fallback):' : 'Current Analysis Details:'}
             </Text>
             {analysisResult.reasons.map((r, i) => (
                <Text key={i} style={{...Theme.typography.small, color: Theme.colors.danger, marginBottom: 4}}>- {r}</Text>
             ))}
           </View>
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
  sessionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  simButton: {
    ...Theme.typography.body,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
    textAlign: 'center',
    flex: 1,
    borderWidth: 1,
  },
  sessionButton: {
    ...Theme.typography.body,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    textAlign: 'center',
    flex: 1,
    backgroundColor: Theme.colors.warning,
    color: '#fff',
  },
  activeUserBtn: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
    color: '#fff',
  },
  idleUserBtn: {
    backgroundColor: Theme.colors.card,
    borderColor: Theme.colors.primary,
    color: Theme.colors.primary,
  },
  activeCallerBtn: {
    backgroundColor: Theme.colors.danger,
    borderColor: Theme.colors.danger,
    color: '#fff',
  },
  idleCallerBtn: {
    backgroundColor: Theme.colors.card,
    borderColor: Theme.colors.danger,
    color: Theme.colors.danger,
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
    maxWidth: '95%',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  neutralBubble: {
    alignSelf: 'stretch',
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  bubbleText: {
    ...Theme.typography.body,
    lineHeight: 22,
    color: Theme.colors.textPrimary,
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
