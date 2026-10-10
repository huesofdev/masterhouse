import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

interface ActionCardProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightLabel?: string;
}

export function ActionCard({ title, subtitle, onPress, rightLabel }: ActionCardProps) {
  return (
    <TouchableOpacity
      className="bg-surface rounded-xl p-4 mb-3 flex-row items-center justify-between shadow-sm active:bg-surface-highlight dark:bg-oled-secondary"
      onPress={onPress}
    >
      <View>
        <Text className="text-text-primary text-lg font-semibold dark:text-oled-text">{title}</Text>
        {subtitle && (
          <Text className="text-text-secondary text-sm font-medium mt-1 dark:text-gray-400">{subtitle}</Text>
        )}
      </View>
      <View className="flex-row items-center">
        {rightLabel && (
          <Text className="text-brand-primary font-bold mr-2">{rightLabel}</Text>
        )}
        <Text className="text-text-disabled text-xl dark:text-gray-500">{'>'}</Text>
      </View>
    </TouchableOpacity>
  );
}
