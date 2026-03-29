import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Keyboard, AppState, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link2, ShieldAlert, CheckCircle2 } from 'lucide-react-native';
import * as ExpoClipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';

import { Theme } from '../theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { RiskBadge } from '../components/RiskBadge';
import { analyzeThreat } from '../lib/rulesEngine';
import { saveThreat } from '../lib/storage';
import { ThreatAnalysisResult } from '../types';

export const URLScannerScreen = () => {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [result, setResult] = useState<ThreatAnalysisResult | null>(null);

  const [clipboardUrl, setClipboardUrl] = useState('');
  const [clipboardResult, setClipboardResult] = useState<ThreatAnalysisResult | null>(null);
  const [isClipboardScanning, setIsClipboardScanning] = useState(false);
  const lastClipboardString = useRef('');

  const handleScan = () => {
    Keyboard.dismiss();
    if (!url.trim()) return;
    setIsScanning(true);
    setHasScanned(false);
    
    // Simulate network scan delay
    setTimeout(() => {
      const analysis = analyzeThreat(url, 'URL');
      setResult(analysis);
      if (analysis.isFlagged) {
        saveThreat(analysis);
      }
      if (analysis.severity === 'high') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Vibration.vibrate([200, 400, 200, 400]);
      } else if (analysis.severity === 'medium') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      setIsScanning(false);
      setHasScanned(true);
    }, 1500);
  };

  const getHostname = (link: string) => {
    try {
      if (!link.startsWith('http')) {
        return new URL('https://' + link).hostname;
      }
      return new URL(link).hostname;
    } catch {
      return link;
    }
  };

  const checkClipboard = async (manual = false) => {
    if (manual) setIsClipboardScanning(true);
    try {
      const hasString = await ExpoClipboard.hasStringAsync();
      if (!hasString) {
        if (manual) {
          setClipboardUrl('');
          setClipboardResult(null);
        }
        return;
      }

      const content = await ExpoClipboard.getStringAsync();
      
      // Deduplicate
      if (!manual && content === lastClipboardString.current) return;
      lastClipboardString.current = content;

      // Extract URL
      const urlRegex = /https?:\/\/[^\s]+/i;
      const match = content.match(urlRegex);
      
      if (match) {
        const foundUrl = match[0];
        setClipboardUrl(foundUrl);
        const analysis = analyzeThreat(foundUrl, 'URL');
        setClipboardResult(analysis);
        if (analysis.isFlagged) {
          saveThreat(analysis);
        }
        if (analysis.severity === 'high') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Vibration.vibrate([200, 400, 200, 400]);
        } else if (analysis.severity === 'medium') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } else if (manual) {
        setClipboardUrl('');
        setClipboardResult(null);
      }
    } catch (e) {
      console.warn("Failed to check clipboard", e);
    } finally {
      if (manual) setIsClipboardScanning(false);
    }
  };

  useEffect(() => {
    checkClipboard();

    const sub = ExpoClipboard.addClipboardListener(() => {
      checkClipboard();
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkClipboard();
      }
    });

    return () => {
      if (sub && sub.remove) sub.remove();
      if (appStateSub && appStateSub.remove) appStateSub.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="URL Scanner" showBack={false} />
      
      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.inputCard}>
            <Text style={styles.label}>Paste a suspicious link to verify</Text>
            <View style={styles.inputWrapper}>
              <Link2 size={20} color={Theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. https://secure-login-paypol.com"
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  setHasScanned(false);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <Button 
              title="Scan URL" 
              onPress={handleScan} 
              loading={isScanning}
              disabled={!url.trim()}
              style={styles.scanBtn}
            />
          </Card>

          {clipboardResult && clipboardUrl ? (
            <Card style={styles.clipboardCard}>
              <View style={styles.clipboardHeaderRow}>
                <View style={styles.clipboardStatus}>
                  <Link2 size={16} color={Theme.colors.textSecondary} />
                  <Text style={styles.clipboardStatusText}>Clipboard Monitored</Text>
                </View>
                <CheckCircle2 size={16} color={Theme.colors.safe} />
              </View>

              <View style={styles.resultHeader}>
                <RiskBadge level={clipboardResult.severity} size="medium" />
                <View style={[styles.scoreBox, clipboardResult.severity !== 'high' ? { backgroundColor: Theme.colors.safe + '20' } : null] as any}>
                  <Text style={[styles.scoreText, clipboardResult.severity !== 'high' ? { color: Theme.colors.safe } : null] as any}>{clipboardResult.score}/100</Text>
                </View>
              </View>

              <Text style={styles.resultUrl} numberOfLines={2}>
                {getHostname(clipboardUrl)}
              </Text>
              
              <Text style={styles.resultLabel}>{clipboardResult.label}</Text>

              {clipboardResult.reasons.length > 0 && (
                <View style={styles.clipboardReasons}>
                  <Text style={styles.reasonsTitle}>Detection Signals:</Text>
                  {clipboardResult.reasons.map((reason, i) => (
                    <View key={i} style={styles.reasonRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.reasonText}>{reason}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              <Button 
                title="Scan Clipboard Again" 
                onPress={() => checkClipboard(true)} 
                variant="secondary"
                loading={isClipboardScanning}
                style={styles.clipboardBtn}
              />
            </Card>
          ) : (
            <Card style={styles.clipboardEmpty}>
              <View style={styles.clipboardStatus}>
                <Link2 size={16} color={Theme.colors.textSecondary} />
                <Text style={styles.clipboardStatusText}>Clipboard Monitored</Text>
              </View>
              <Text style={styles.clipboardEmptyDesc}>We automatically scan copied URLs for threats.</Text>
              <Button 
                title="Scan Clipboard" 
                onPress={() => checkClipboard(true)} 
                variant="secondary"
                loading={isClipboardScanning}
                style={styles.clipboardBtn}
              />
            </Card>
          )}


        {hasScanned && result && (
          <Card style={[styles.resultCard, result.severity !== 'high' ? { borderColor: Theme.colors.border, borderWidth: 1 } : null] as any}>
            <View style={styles.resultHeader}>
              <RiskBadge level={result.severity} size="large" />
              <View style={[styles.scoreBox, result.severity !== 'high' ? { backgroundColor: Theme.colors.safe + '20' } : null] as any}>
                <Text style={[styles.scoreText, result.severity !== 'high' ? { color: Theme.colors.safe } : null] as any}>{result.score}/100</Text>
              </View>
            </View>

            <Text style={styles.resultUrl} numberOfLines={2}>
              {getHostname(url)}
            </Text>
            
            <Text style={styles.resultLabel}>{result.label}</Text>
            
            <View style={[styles.alertBox, result.severity !== 'high' ? { backgroundColor: Theme.colors.safe + '20' } : null] as any}>
              <ShieldAlert size={20} color={result.severity === 'high' ? Theme.colors.danger : Theme.colors.safe} />
              <Text style={[styles.alertText, result.severity !== 'high' ? { color: Theme.colors.safe } : null] as any}>{result.recommendedAction}</Text>
            </View>

            {result.reasons.length > 0 && (
              <>
                <Text style={styles.reasonsTitle}>Detection Signals:</Text>
                {result.reasons.map((reason, i) => (
                  <View key={i} style={styles.reasonRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </>
            )}
          </Card>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  inputCard: {
    marginBottom: Theme.spacing.xl,
  },
  label: {
    ...Theme.typography.body,
    fontWeight: '600',
    marginBottom: Theme.spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  inputIcon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    ...Theme.typography.body,
    color: Theme.colors.textPrimary,
  },
  scanBtn: {
    width: '100%',
  },
  resultCard: {
    borderColor: Theme.colors.danger,
    borderWidth: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  scoreBox: {
    backgroundColor: Theme.colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
  },
  scoreText: {
    ...Theme.typography.body,
    color: Theme.colors.danger,
    fontWeight: '700',
  },
  resultUrl: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.xs,
  },
  resultLabel: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.dangerLight,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    gap: 12,
    marginBottom: Theme.spacing.lg,
  },
  alertText: {
    ...Theme.typography.body,
    color: Theme.colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  reasonsTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.danger,
    marginRight: 8,
  },
  reasonText: {
    ...Theme.typography.caption,
    color: Theme.colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xxl,
  },
  clipboardCard: {
    marginBottom: Theme.spacing.xl,
    backgroundColor: Theme.colors.card,
  },
  clipboardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  clipboardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  clipboardStatusText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  clipboardBtn: {
    marginTop: Theme.spacing.md,
    width: '100%',
  },
  clipboardEmpty: {
    marginBottom: Theme.spacing.xl,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    borderColor: Theme.colors.border,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  clipboardEmptyDesc: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  clipboardReasons: {
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
});
