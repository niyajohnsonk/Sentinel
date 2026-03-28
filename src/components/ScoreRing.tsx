import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Theme } from '../theme';

interface ScoreRingProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
}

export const ScoreRing = ({ score, size = 120, strokeWidth = 12 }: ScoreRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let start = displayScore;
    const end = score;
    const duration = 1000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.round(start + (end - start) * easeProgress);
      setDisplayScore(current);

      if (progress === 1) clearInterval(interval);
    }, 16); // roughly 60fps

    return () => clearInterval(interval);
  }, [score]);

  const getColor = (s: number) => {
    if (s < 30) return Theme.colors.safe;
    if (s < 70) return Theme.colors.warning;
    return Theme.colors.danger;
  };

  const strokeDashoffset = circumference - (circumference * displayScore) / 100;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          stroke={Theme.colors.border}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Foreground Circle - React State Animated */}
        <Circle
          stroke={getColor(displayScore)}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.scoreText, { color: getColor(displayScore) }]}>{displayScore}</Text>
        <Text style={styles.label}>Risk Score</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    ...Theme.typography.h1,
    fontSize: 36,
    lineHeight: 40,
  },
  label: {
    ...Theme.typography.small,
    marginTop: 2,
  },
});
