/**
 * VoiceWaveformVisualizer UI Component
 * Animates waveform bars dynamically based on real-time mic volume levels (0-10).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../theme/tokens';

export interface VoiceWaveformVisualizerProps {
  isListening: boolean;
  volumeLevel?: number; // 0 to 10 scale
}

export const VoiceWaveformVisualizer: React.FC<VoiceWaveformVisualizerProps> = ({
  isListening,
  volumeLevel = 0,
}) => {
  const baseHeights = [0.2, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7, 0.3, 0.65, 0.85, 0.5, 0.2];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.statusTitle, { color: colors.foreground }]}>
          {isListening ? '🎙️ Microphone Active (Capturing Audio)' : '🎙️ Microphone Standby'}
        </Text>
        <Text style={[styles.statusSubtitle, { color: isListening ? colors.success : colors.mutedForeground }]}>
          {isListening ? `MIC VOL: ${volumeLevel}/10` : 'IDLE'}
        </Text>
      </View>

      <View style={styles.barsRow}>
        {baseHeights.map((factor, idx) => {
          const scaledHeight = isListening ? Math.max(10, factor * (volumeLevel * 5 + 12)) : 8;
          return (
            <View
              key={idx}
              style={[
                styles.bar,
                {
                  height: Math.min(58, scaledHeight),
                  backgroundColor: isListening ? colors.primary : colors.muted,
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={[styles.infoFooter, { color: colors.mutedForeground }]}>
        {isListening
          ? 'Live audio input energy streaming into Speech-to-Text engine...'
          : 'Tap Start Listening to test Speech Recognition.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  barsRow: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginVertical: 10,
  },
  bar: {
    width: 6,
    borderRadius: 4,
  },
  infoFooter: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
