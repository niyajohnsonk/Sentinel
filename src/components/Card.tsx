import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'flat' | 'outlined';
}

export const Card = ({ children, style, variant = 'default' }: CardProps) => {
  return (
    <View style={[styles.card, styles[variant], style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
  },
  default: {
    ...Theme.shadows.card,
  },
  flat: {
    elevation: 0,
    shadowOpacity: 0,
  },
  outlined: {
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
});
