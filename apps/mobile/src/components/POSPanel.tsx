import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { ActionCard } from './ActionCard';

export function POSPanel() {
  return (
    <View className="mb-6">
      <Text className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
        Point of Sale (Loaded Stock)
      </Text>
      <ActionCard 
        title="Create New Sale" 
        subtitle="Tap to select customer and products" 
        rightLabel="POS"
        onPress={() => router.push('/(pos)')} 
      />
      <ActionCard 
        title="View Loaded Stock" 
        subtitle="24 Items remaining" 
        onPress={() => {}} 
      />
    </View>
  );
}
