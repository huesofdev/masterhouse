import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { CollectionCard } from './CollectionCard';
import { db } from '../db';
import { installmentSchedules, contracts, customers } from '../db/schema';
import { eq } from 'drizzle-orm';

type Tab = 'TODAY' | 'OVERDUE' | 'UPCOMING';

export function CollectionsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('TODAY');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [counts, setCounts] = useState({ today: 0, overdue: 0, upcoming: 0 });

  const loadSchedules = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Fetch all pending/overdue schedules with their contract and customer info
      const allSchedules = await db
        .select({
          id: installmentSchedules.id,
          dueDate: installmentSchedules.dueDate,
          amountDue: installmentSchedules.amountDue,
          amountPaid: installmentSchedules.amountPaid,
          status: installmentSchedules.status,
          contractBalance: contracts.balance,
          productName: contracts.productName,
          customerName: customers.name,
          customerAddress: customers.address,
          gpsLat: customers.gpsLat,
          gpsLng: customers.gpsLng,
          customerRating: customers.rating,
        })
        .from(installmentSchedules)
        .innerJoin(contracts, eq(installmentSchedules.contractId, contracts.id))
        .innerJoin(customers, eq(contracts.customerId, customers.id))
        .where(eq(installmentSchedules.status, 'PENDING')); // Or OVERDUE, PARTIALLY_PAID

      // Categorize
      const today = allSchedules.filter(s => s.dueDate === todayStr);
      const overdue = allSchedules.filter(s => s.dueDate < todayStr);
      const upcoming = allSchedules.filter(s => s.dueDate > todayStr);

      setCounts({
        today: today.length,
        overdue: overdue.length,
        upcoming: upcoming.length,
      });

      if (activeTab === 'TODAY') setSchedules(today);
      else if (activeTab === 'OVERDUE') setSchedules(overdue);
      else if (activeTab === 'UPCOMING') setSchedules(upcoming);
    } catch (e) {
      console.error("Failed to load schedules", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSchedules();
  }, [activeTab]);

  return (
    <View className="mb-6 flex-1">
      <Text className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
        Collections Dashboard
      </Text>
      
      {/* Tabs */}
      <View className="flex-row mb-4 bg-slate-100 rounded-lg p-1">
        <TouchableOpacity 
          className={`flex-1 py-2 items-center rounded-md ${activeTab === 'TODAY' ? 'bg-white shadow-sm' : ''}`}
          onPress={() => setActiveTab('TODAY')}
        >
          <Text className={`font-semibold ${activeTab === 'TODAY' ? 'text-amber-600' : 'text-slate-500'}`}>Today ({counts.today})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-2 items-center rounded-md ${activeTab === 'OVERDUE' ? 'bg-white shadow-sm' : ''}`}
          onPress={() => setActiveTab('OVERDUE')}
        >
          <Text className={`font-semibold ${activeTab === 'OVERDUE' ? 'text-amber-600' : 'text-slate-500'}`}>Overdue ({counts.overdue})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-2 items-center rounded-md ${activeTab === 'UPCOMING' ? 'bg-white shadow-sm' : ''}`}
          onPress={() => setActiveTab('UPCOMING')}
        >
          <Text className={`font-semibold ${activeTab === 'UPCOMING' ? 'text-amber-600' : 'text-slate-500'}`}>Upcoming ({counts.upcoming})</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={schedules}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="mb-3">
            <CollectionCard 
              customerName={item.customerName}
              productName={item.productName || "Product Name Unknown"}
              address={item.customerAddress}
              amountDue={item.amountDue - item.amountPaid}
              dueDate={item.dueDate}
              gpsLat={item.gpsLat}
              gpsLng={item.gpsLng}
              rating={item.customerRating}
              isOverdue={activeTab === 'OVERDUE'}
              onCollect={() => { /* Navigate to collect screen with schedule ID */ }} 
            />
          </View>
        )}
        ListEmptyComponent={<Text className="text-center text-slate-500 mt-4">No collections in this category.</Text>}
      />
    </View>
  );
}
