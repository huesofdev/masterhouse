import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
}

export function PrimaryButton({ label, loading, disabled, ...props }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      className={`h-14 bg-brand-primary rounded-xl flex-row items-center justify-center px-4 ${
        disabled ? 'opacity-50' : 'active:bg-brand-secondary'
      }`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-white text-lg font-bold">{label}</Text>
      )}
    </TouchableOpacity>
  );
}
