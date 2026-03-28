import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';
import { Severity } from '../types';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react-native';

interface RiskBadgeProps {
  level: Severity;
  size?: 'small' | 'medium' | 'large';
}

export const RiskBadge = ({ level, size = 'medium' }: RiskBadgeProps) => {
  const getBadgeStyle = () => {
    switch (level) {
      case 'low': return { bg: Theme.colors.safeLight, text: Theme.colors.safe, icon: ShieldCheck, label: 'SAFE' };
      case 'medium': return { bg: Theme.colors.warningLight, text: Theme.colors.warning, icon: AlertTriangle, label: 'SUSPICIOUS' };
      case 'high': return { bg: Theme.colors.dangerLight, text: Theme.colors.danger, icon: ShieldAlert, label: 'HIGH RISK' };
    }
  };

  const { bg, text, icon: Icon, label } = getBadgeStyle();
  const iconSize = size === 'small' ? 14 : size === 'medium' ? 16 : 20;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, styles[size]]}>
      <Icon size={iconSize} color={text} />
      <Text style={[styles.text, { color: text }, size === 'small' && styles.textSmall, size === 'large' && styles.textLarge]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  text: {
    ...Theme.typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  textSmall: {
    fontSize: 10,
  },
  textLarge: {
    fontSize: 14,
  },
});
