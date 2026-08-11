/**
 * VoiceTriggerConfigScreen UI Implementation
 * Connected to live speech recognition & keyword detection (standalone config tool).
 * Uses keywordDetectionService directly — no EmergencyContext dependency.
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../theme/tokens';
import { NavBar } from '../../../components/ds/NavBar';
import { Card } from '../../../components/ds/Card';
import { AppButton } from '../../../components/ds/AppButton';
import { Badge } from '../../../components/ds/Badge';
import { VoiceWaveformVisualizer } from '../components/VoiceWaveformVisualizer';
import { KeywordDetectorBadge } from '../components/KeywordDetectorBadge';
import { useVoiceState } from '../../../context/VoiceContext';
import { keywordDetectionService } from '../../emergency/services/keywordDetectionService';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../types/voiceRecognition.types';

export const VoiceTriggerConfigScreen: React.FC = () => {
  const [showHistoryScreen, setShowHistoryScreen] = useState(false);

  // Voice Context for Speech-to-Text Stream
  const {
    recognitionState,
    isListening,
    recognizedText,
    partialText,
    currentLanguage,
    volumeLevel,
    speechError,
    startListening,
    stopListening,
    cancelListening,
    changeLanguage,
  } = useVoiceState();

  // Local keyword detection: evaluate current transcript directly (this is a standalone config screen)
  const [sensitivityThreshold, setSensitivityThreshold] = useState<number>(0.6);

  const activeText = (recognizedText || partialText || '').trim();
  const detectionResult = useMemo(() => {
    if (!activeText) return null;
    return keywordDetectionService.detectKeywords(activeText, currentLanguage, sensitivityThreshold);
  }, [activeText, currentLanguage, sensitivityThreshold]);

  const handleToggleListening = async () => {
    if (isListening) {
      await stopListening();
    } else {
      console.log("Voice button pressed");
      await startListening();
    }
  };

  const confidencePct = Math.round((detectionResult?.confidence ?? 0.0) * 100);
  const thresholdPct = Math.round(sensitivityThreshold * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar title="Emergency Keyword AI" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View>
          {/* Active Emergency Keyword Match Badge */}
          <KeywordDetectorBadge
            detectionResult={detectionResult}
            activeLanguage={currentLanguage}
          />

          {/* Animated Waveform Visualizer */}
          <VoiceWaveformVisualizer isListening={isListening} volumeLevel={volumeLevel} />

          {/* Speech Control Button */}
          <View style={styles.btnRow}>
            <AppButton
              onPress={handleToggleListening}
              variant={isListening ? 'destructive' : 'primary'}
              style={styles.flexBtn}
            >
              {isListening ? 'Stop Mic Monitoring' : 'Start Speech Detection'}
            </AppButton>
            {isListening && (
              <AppButton
                onPress={cancelListening}
                variant="ghost"
                style={styles.cancelBtn}
              >
                Cancel
              </AppButton>
            )}
          </View>

          {/* Live Transcript & Detection Result Card */}
          <Card style={styles.cardSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Live Speech & Keyword Detection</Text>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Evaluates spoken text against English, Telugu, and Hindi distress dictionaries. Automatically dispatches to EmergencyService on match.
            </Text>

            <View style={[styles.transcriptBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {partialText ? (
                <Text style={[styles.partialText, { color: colors.primary }]}>
                  Streaming: "{partialText}..."
                </Text>
              ) : null}

              {recognizedText ? (
                <Text style={[styles.finalText, { color: colors.foreground }]}>
                  "{recognizedText}"
                </Text>
              ) : null}

              {!partialText && !recognizedText && (
                <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>
                  {isListening ? 'Listening for emergency phrases... Speak now.' : 'Mic Standby. Tap Start to test phrase detection.'}
                </Text>
              )}
            </View>

            {/* Confidence Score Meter Bar */}
            <View style={styles.meterContainer}>
              <View style={styles.meterHeader}>
                <Text style={[styles.meterLabel, { color: colors.mutedForeground }]}>Match Confidence Score</Text>
                <Text style={[styles.meterValue, { color: detectionResult?.detected ? colors.emergency : colors.primary }]}>
                  {confidencePct}% (Cutoff: {thresholdPct}%)
                </Text>
              </View>

              <View style={[styles.meterTrack, { backgroundColor: colors.secondary }]}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${confidencePct}%`,
                      backgroundColor: detectionResult?.detected ? colors.emergency : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </Card>

          {/* Language Selector */}
          <Card style={styles.cardSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Language Dictionaries</Text>

            <View style={styles.langGrid}>
              {SUPPORTED_LANGUAGES.map(lang => {
                const isSelected = currentLanguage === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langCard,
                      {
                        backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => changeLanguage(lang.code as SupportedLanguage)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.flagIcon}>{lang.flagIcon}</Text>
                    <View style={styles.langMeta}>
                      <Text style={[styles.langLabel, { color: colors.foreground }]}>{lang.label}</Text>
                      <Text style={[styles.nativeLabel, { color: colors.mutedForeground }]}>{lang.nativeName}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  historyNavBtn: {
    height: 34,
    paddingHorizontal: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  flexBtn: {
    flex: 1,
  },
  cancelBtn: {
    width: 100,
  },
  cardSection: {
    padding: 18,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  transcriptBox: {
    minHeight: 80,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 14,
  },
  partialText: {
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  finalText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
  },
  meterContainer: {
    marginTop: 6,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  meterValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  meterTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 5,
  },
  langGrid: {
    gap: 10,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  flagIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  langMeta: {
    flex: 1,
  },
  langLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  nativeLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
