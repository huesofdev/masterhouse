import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

interface CollectionCardProps {
  customerName: string;
  productName: string;
  address: string | null;
  amountDue: number;
  dueDate: string;
  gpsLat: number | null;
  gpsLng: number | null;
  onCollect: () => void;
  isOverdue?: boolean;
  rating?: number | null;
}

export function CollectionCard({
  customerName,
  productName,
  address,
  amountDue,
  dueDate,
  gpsLat,
  gpsLng,
  onCollect,
  isOverdue = false,
  rating
}: CollectionCardProps) {

  const handleNavigate = () => {
    if (gpsLat === null || gpsLat === undefined || gpsLng === null || gpsLng === undefined) {
      alert("No GPS coordinates available for this customer.");
      return;
    }
    // Universal Google Maps navigation URL — works on Android & iOS,
    // opens turn-by-turn navigation from current location to the customer.
    const url = `https://www.google.com/maps/dir/?api=1&destination=${gpsLat},${gpsLng}&travelmode=driving`;
    Linking.openURL(url).catch(() => alert("Failed to open Google Maps."));
  };

  return (
    <View className="bg-surface rounded-xl p-4 mb-3 shadow-sm border border-slate-100 dark:bg-oled-secondary dark:border-gray-800">
      
      {/* Top Row: Name and Amount */}
      <View className="flex-row justify-between items-start mb-1">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center">
            <Text className="text-text-primary text-lg font-bold dark:text-oled-text" numberOfLines={1}>
              {customerName}
            </Text>
            {rating != null && (
              <View className="flex-row items-center ml-2 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md">
                <Text className="text-amber-500 text-xs mr-0.5">⭐</Text>
                <Text className="text-amber-700 dark:text-amber-500 text-xs font-bold">{rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text className="text-text-secondary text-sm font-medium dark:text-gray-400" numberOfLines={1}>
            {productName}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-xl font-bold ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
            Rs. {amountDue.toLocaleString()}
          </Text>
          <Text className="text-xs text-text-secondary font-medium dark:text-gray-500">
            Due: {dueDate}
          </Text>
        </View>
      </View>

      {/* Address */}
      <View className="mb-4 mt-2 flex-row items-center">
        <Text className="text-xs text-text-secondary dark:text-gray-400" numberOfLines={2}>
          📍 {address || "No address provided"}
        </Text>
      </View>

      {/* Buttons */}
      <View className="flex-row items-center pt-2 border-t border-slate-100 dark:border-gray-800 gap-2">
        <TouchableOpacity 
          className="flex-1 bg-slate-100 py-3 rounded-lg items-center flex-row justify-center active:bg-slate-200 dark:bg-gray-800"
          onPress={handleNavigate}
        >
          <Text className="text-slate-600 font-semibold dark:text-gray-300">🗺️ Navigate</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-1 bg-brand-primary py-3 rounded-lg items-center active:bg-brand-secondary"
          onPress={onCollect}
        >
          <Text className="text-white font-bold text-base">💰 Collect</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
