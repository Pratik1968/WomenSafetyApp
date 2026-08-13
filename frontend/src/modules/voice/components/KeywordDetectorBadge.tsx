/**
 * KeywordDetectorBadge UI Component
 * Displays detected keyword, confidence %, language locale, and match status.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../theme/tokens';
import { Badge } from '../../../components/ds/Badge';
import { KeywordDetectionResult } from '../utils/keywordMatcher';

export interface KeywordDetectorBadgeProps {
  detectionResult?: KeywordDetectionResult | null;
  activeLanguage?: string;
}

export const KeywordDetectorBadge: React.FC<KeywordDetectorBadgeProps> = ({
  detectionResult,
  activeLanguage = 'en-US',
}) => {
  const isMatched = detectionResult?.detected ?? false;
  const keyword = detectionResult?.keyword || 'None Detected';
  const confidence = detectionResult?.confidence ?? 0.0;
  const percentage = Math.round(confidence * 100);
  const lang = detectionResult?.language || activeLanguage;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.leftMeta}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Emergency Phrase Match ({lang})</Text>
        <Text style={[styles.keywordText, { color: isMatched ? colors.emergency : colors.foreground }]}>
          "{keyword}"
        </Text>
      </View>

      <View style={styles.rightMeta}>
        <Badge tone={isMatched ? 'emergency' : 'neutral'}>
          {isMatched ? `MATCH (${percentage}%)` : `SCORE: ${percentage}%`}
        </Badge>
        <Text style={[styles.thresholdText, { color: colors.mutedForeground }]}>
          Status: {isMatched ? 'PHRASE DETECTED' : 'SCANNING SPEECH'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  leftMeta: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  keywordText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rightMeta: {
    alignItems: 'flex-end',
  },
  thresholdText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
