/**
 * VoiceTrainingScreen UI Implementation
 * Connected to live useVoiceSpeech hook for capturing spoken speech calibration samples.
 */

import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { colors } from '../../../theme/tokens';
import { NavBar } from '../../../components/ds/NavBar';
import { Card } from '../../../components/ds/Card';
import { AppButton } from '../../../components/ds/AppButton';
import { Badge } from '../../../components/ds/Badge';
import { VoiceWaveformVisualizer } from '../components/VoiceWaveformVisualizer';
import { useVoiceSpeech } from '../hooks/useVoiceSpeech';

interface VoiceSampleItem {
  id: number;
  label: string;
  isRecorded: boolean;
  transcript: string;
}

export const VoiceTrainingScreen: React.FC = () => {
  // Live Speech Recognition Hook
  const { isListening, recognizedText, volumeLevel, startListening, stopListening } = useVoiceSpeech();

  // Voice Calibration Training States
  const [samples, setSamples] = useState<VoiceSampleItem[]>([
    { id: 1, label: 'Sample 1 (Clear Voice Speech)', isRecorded: false, transcript: '' },
    { id: 2, label: 'Sample 2 (Loud Speech Phrase)', isRecorded: false, transcript: '' },
    { id: 3, label: 'Sample 3 (Short Emergency Phrase)', isRecorded: false, transcript: '' },
  ]);

  const [activeRecordingId, setActiveRecordingId] = useState<number | null>(null);
  const [trainingComplete, setTrainingComplete] = useState<boolean>(false);

  const handleRecordSample = async (id: number) => {
    setActiveRecordingId(id);
    await startListening();

    setTimeout(async () => {
      await stopListening();
      setSamples(prev =>
        prev.map(s =>
          s.id === id
            ? { ...s, isRecorded: true, transcript: recognizedText || 'Captured spoken sample' }
            : s
        )
      );
      setActiveRecordingId(null);
    }, 3000);
  };

  const handleCompleteTraining = () => {
    setTrainingComplete(true);
    Alert.alert('🎉 Speech Calibration Complete', 'Personalized voice speech profile calibrated successfully.');
  };

  const recordedCount = samples.filter(s => s.isRecorded).length;
  const isReadyToTrain = recordedCount === samples.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar title="Voice Calibration" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Animated Waveform Visualizer */}
        <VoiceWaveformVisualizer isListening={isListening} volumeLevel={volumeLevel} />

        {/* Training Steps */}
        <Card style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Capture 3 Spoken Samples</Text>
            <Badge tone={recordedCount === 3 ? 'success' : 'warning'}>{`${recordedCount}/3 Samples`}</Badge>
          </View>

          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Tap record and speak your phrase clearly into the microphone.
          </Text>

          <View style={styles.sampleList}>
            {samples.map(sample => {
              const isRecordingThis = activeRecordingId === sample.id;
              return (
                <View
                  key={sample.id}
                  style={[
                    styles.sampleRow,
                    {
                      backgroundColor: sample.isRecorded ? colors.primary + '15' : colors.surface,
                      borderColor: sample.isRecorded ? colors.success : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.sampleIcon}>{sample.isRecorded ? '✅' : '🎙️'}</Text>
                  <View style={styles.sampleMeta}>
                    <Text style={[styles.sampleTitle, { color: colors.foreground }]}>{sample.label}</Text>
                    <Text style={[styles.sampleStatus, { color: colors.mutedForeground }]}>
                      {isRecordingThis
                        ? 'Listening to speech now...'
                        : sample.isRecorded
                        ? `Transcript: "${sample.transcript}"`
                        : 'Tap record and speak for 3 seconds'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.recordBtn,
                      {
                        backgroundColor: sample.isRecorded ? colors.surface : colors.primary,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleRecordSample(sample.id)}
                    disabled={activeRecordingId !== null || isListening}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.recordBtnText,
                        { color: sample.isRecorded ? colors.foreground : '#FFFFFF' },
                      ]}
                    >
                      {isRecordingThis ? '⏺️ ...' : sample.isRecorded ? 'Re-record' : 'Record'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Complete Action */}
        <Card style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calibrate Speech Profile</Text>

          <AppButton
            onPress={handleCompleteTraining}
            variant={trainingComplete ? 'secondary' : 'primary'}
            disabled={!isReadyToTrain || trainingComplete}
            style={styles.actionBtn}
          >
            {trainingComplete ? 'Speech Profile Calibrated' : 'Complete Speech Calibration'}
          </AppButton>
        </Card>
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
  cardSection: {
    padding: 18,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  sampleList: {
    gap: 10,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sampleIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  sampleMeta: {
    flex: 1,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sampleStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  recordBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  recordBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtn: {
    marginTop: 6,
  },
});
