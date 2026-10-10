import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { apiClient } from '../src/lib/api';
import { useAuthStore } from '../src/store/useAuthStore';
import * as Network from 'expo-network';

const C = {
  bg: '#000000',
  card: '#111111',
  cardBorder: '#1E1E1E',
  amber: '#D97706',
  amberLight: '#F59E0B',
  amberDim: 'rgba(217, 119, 6, 0.12)',
  green: '#059669',
  greenDim: 'rgba(5, 150, 105, 0.12)',
  blue: '#0EA5E9',
  blueDim: 'rgba(14, 165, 233, 0.12)',
  violet: '#7C3AED',
  violetDim: 'rgba(124, 58, 237, 0.12)',
  red: '#EF4444',
  redDim: 'rgba(239, 68, 68, 0.12)',
  white: '#F8FAFC',
  gray: '#9CA3AF',
  grayDark: '#6B7280',
};

interface StatsData {
  runningMonth: {
    monthName: string;
    dateRangeLabel: string;
    startDate: string;
    endDate: string;
  };
  directSales: {
    count: number;
    grossAmount: number;
    refundsAmount: number;
    refundsCount: number;
    netAmount: number;
    totalRevenue: number;
  };
  installmentSales: {
    count: number;
    downpaymentsGross: number;
    downpaymentsRefunds: number;
    downpaymentsCollected: number;
    totalContractValue: number;
  };
  collections: {
    count: number;
    collectionsGross: number;
    collectionsRefunds: number;
    totalCollected: number;
  };
  refunds: {
    totalRefundsDeducted: number;
    directRefunds: number;
    directRefundsCount: number;
    downpaymentRefunds: number;
    collectorRefunds: number;
  };
  summary: {
    totalGrossHandled: number;
    totalRefundsDeducted: number;
    totalMoneyHandled: number;
  };
}

export default function MyStatsScreen() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const fetchStats = async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const net = await Network.getNetworkStateAsync();
      const online = net.isConnected === true;
      setIsOnline(online);

      if (!online) {
        setErrorMsg('You are currently offline. Please connect to the internet to view your live performance stats.');
        return;
      }

      const res = await apiClient.get('/reports/my-stats');
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
      } else {
        setErrorMsg('Failed to load performance stats.');
      }
    } catch (e: any) {
      console.error('Failed to fetch my stats:', e);
      setErrorMsg(e.response?.data?.message || e.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={s.headerTitle}>My Performance</Text>
          <Text style={s.headerSub}>{stats?.runningMonth?.monthName || 'Running Month Stats'}</Text>
        </View>
        <View style={[s.networkBadge, { backgroundColor: isOnline ? C.greenDim : C.redDim }]}>
          <View style={[s.statusDot, { backgroundColor: isOnline ? C.green : C.red }]} />
          <Text style={[s.networkText, { color: isOnline ? C.green : C.red }]}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStats(true)}
            tintColor={C.amber}
            colors={[C.amber]}
          />
        }
      >
        {/* User Info & Month Banner */}
        <View style={s.bannerCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={s.repName}>{user?.name || 'Representative'}</Text>
              <Text style={s.repEmail}>{user?.email}</Text>
            </View>
            <View style={s.monthBadge}>
              <Text style={s.monthBadgeText}>📅 {stats?.runningMonth?.monthName || 'Current Month'}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <Text style={s.dateRangeText}>
            Period: <Text style={{ color: C.white, fontWeight: '700' }}>{stats?.runningMonth?.dateRangeLabel || '1st to Last Day of Month'}</Text>
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.amber} />
            <Text style={{ color: C.gray, marginTop: 12, fontSize: 14 }}>Calculating your running month stats...</Text>
          </View>
        ) : errorMsg ? (
          <View style={s.errorBox}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>⚠️</Text>
            <Text style={s.errorTitle}>Unable to Fetch Stats</Text>
            <Text style={s.errorSub}>{errorMsg}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => fetchStats()}>
              <Text style={s.retryBtnText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        ) : stats ? (
          <>
            {/* Total Net Performance Overview Card */}
            <View style={[s.card, s.summaryCard]}>
              <View style={s.cardHeaderRow}>
                <View style={[s.iconBox, { backgroundColor: 'rgba(217, 119, 6, 0.2)' }]}>
                  <Text style={{ fontSize: 24 }}>🏆</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.summaryLabel}>Total Net Money Handled</Text>
                  <Text style={s.summaryValue}>
                    Rs. {(stats.summary.totalMoneyHandled || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              {/* Gross vs Refunds Sub-Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 }}>
                <View>
                  <Text style={{ color: C.gray, fontSize: 11 }}>Gross Handled</Text>
                  <Text style={{ color: C.white, fontSize: 13, fontWeight: '700', marginTop: 1 }}>
                    Rs. {(stats.summary.totalGrossHandled || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#F87171', fontSize: 11 }}>Refunds Deducted</Text>
                  <Text style={{ color: '#F87171', fontSize: 13, fontWeight: '700', marginTop: 1 }}>
                    - Rs. {(stats.summary.totalRefundsDeducted || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <Text style={s.summaryNote}>
                Net sum matching your official staff payroll report (Net Direct Sales + Net Downpayments + Net Collections).
              </Text>
            </View>

            {/* Direct Sales Card */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={[s.iconBox, { backgroundColor: C.amberDim }]}>
                  <Text style={{ fontSize: 22 }}>🛒</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.cardTitle}>Direct Sales</Text>
                  <Text style={s.cardSub}>Direct cash/retail transactions</Text>
                </View>
                <View style={[s.badge, { backgroundColor: C.amberDim }]}>
                  <Text style={[s.badgeText, { color: C.amber }]}>{stats.directSales.count} Sales</Text>
                </View>
              </View>

              <View style={s.metricGrid}>
                <View style={s.metricItem}>
                  <Text style={s.metricLabel}>Gross Direct Sales</Text>
                  <Text style={s.metricValue}>
                    Rs. {(stats.directSales.grossAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: (stats.directSales.refundsAmount || 0) > 0 ? '#F87171' : C.gray }]}>Refunds Deducted</Text>
                  <Text style={[s.metricValue, { color: (stats.directSales.refundsAmount || 0) > 0 ? '#F87171' : C.gray }]}>
                    - Rs. {(stats.directSales.refundsAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: C.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: C.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Net Direct Sales</Text>
                <Text style={{ color: C.amberLight, fontSize: 16, fontWeight: '800' }}>
                  Rs. {(stats.directSales.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Installment Sales Card */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={[s.iconBox, { backgroundColor: C.blueDim }]}>
                  <Text style={{ fontSize: 22 }}>📝</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.cardTitle}>Installment Contracts</Text>
                  <Text style={s.cardSub}>Termly payment agreements</Text>
                </View>
                <View style={[s.badge, { backgroundColor: C.blueDim }]}>
                  <Text style={[s.badgeText, { color: C.blue }]}>{stats.installmentSales.count} Contracts</Text>
                </View>
              </View>

              <View style={s.metricGrid}>
                <View style={s.metricItem}>
                  <Text style={s.metricLabel}>Gross Downpayments</Text>
                  <Text style={s.metricValue}>
                    Rs. {(stats.installmentSales.downpaymentsGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: (stats.installmentSales.downpaymentsRefunds || 0) > 0 ? '#F87171' : C.gray }]}>Downpayment Refunds</Text>
                  <Text style={[s.metricValue, { color: (stats.installmentSales.downpaymentsRefunds || 0) > 0 ? '#F87171' : C.gray }]}>
                    - Rs. {(stats.installmentSales.downpaymentsRefunds || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: C.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: C.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Net Downpayments</Text>
                  <Text style={{ color: C.gray, fontSize: 11, marginTop: 2 }}>
                    Contract Value: Rs. {(stats.installmentSales.totalContractValue || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={{ color: '#38BDF8', fontSize: 16, fontWeight: '800' }}>
                  Rs. {(stats.installmentSales.downpaymentsCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Collections & Recoveries Card */}
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={[s.iconBox, { backgroundColor: C.greenDim }]}>
                  <Text style={{ fontSize: 22 }}>💰</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.cardTitle}>Collections & Recoveries</Text>
                  <Text style={s.cardSub}>Receipts & downpayment recovery</Text>
                </View>
                <View style={[s.badge, { backgroundColor: C.greenDim }]}>
                  <Text style={[s.badgeText, { color: C.green }]}>{stats.collections.count} Receipts</Text>
                </View>
              </View>

              <View style={s.metricGrid}>
                <View style={s.metricItem}>
                  <Text style={s.metricLabel}>Gross Collections</Text>
                  <Text style={s.metricValue}>
                    Rs. {(stats.collections.collectionsGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={s.metricItem}>
                  <Text style={[s.metricLabel, { color: (stats.collections.collectionsRefunds || 0) > 0 ? '#F87171' : C.gray }]}>Refund Adjustments</Text>
                  <Text style={[s.metricValue, { color: (stats.collections.collectionsRefunds || 0) > 0 ? '#F87171' : C.gray }]}>
                    - Rs. {(stats.collections.collectionsRefunds || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: C.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: C.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Net Collections</Text>
                <Text style={{ color: '#34D399', fontSize: 16, fontWeight: '800' }}>
                  Rs. {(stats.collections.totalCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Refunds Deductions Summary Card (Highlighted if refunds exist) */}
            {(stats.refunds?.totalRefundsDeducted || 0) > 0 && (
              <View style={[s.card, { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                <View style={s.cardHeaderRow}>
                  <View style={[s.iconBox, { backgroundColor: C.redDim }]}>
                    <Text style={{ fontSize: 22 }}>🔄</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.cardTitle, { color: '#F87171' }]}>Refund Deductions Breakdown</Text>
                    <Text style={s.cardSub}>Deductions applied to running month</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: C.redDim }]}>
                    <Text style={[s.badgeText, { color: C.red }]}>- Rs. {stats.refunds.totalRefundsDeducted.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(239, 68, 68, 0.15)' }}>
                  {stats.refunds.directRefunds > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: C.gray, fontSize: 12 }}>• Direct Sale Returns ({stats.refunds.directRefundsCount || 0})</Text>
                      <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '700' }}>- Rs. {stats.refunds.directRefunds.toLocaleString()}</Text>
                    </View>
                  )}
                  {stats.refunds.downpaymentRefunds > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: C.gray, fontSize: 12 }}>• Cancelled Contract Downpayments</Text>
                      <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '700' }}>- Rs. {stats.refunds.downpaymentRefunds.toLocaleString()}</Text>
                    </View>
                  )}
                  {stats.refunds.collectorRefunds > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: C.gray, fontSize: 12 }}>• Collection Reversals / Adjustments</Text>
                      <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '700' }}>- Rs. {stats.refunds.collectorRefunds.toLocaleString()}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },
  headerSub: { color: C.gray, fontSize: 13, marginTop: 2 },

  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  networkText: { fontSize: 11, fontWeight: '700' },

  bannerCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  repName: { color: C.white, fontSize: 17, fontWeight: '700' },
  repEmail: { color: C.gray, fontSize: 13, marginTop: 2 },
  monthBadge: {
    backgroundColor: C.amberDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.amber,
  },
  monthBadgeText: { color: C.amber, fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
  dateRangeText: { color: C.gray, fontSize: 13 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  summaryCard: {
    backgroundColor: '#161208',
    borderColor: C.amber,
  },
  summaryLabel: { color: C.amber, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: C.white, fontSize: 24, fontWeight: '800', marginTop: 4 },
  summaryNote: { color: C.gray, fontSize: 12, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: '#2A2010' },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: C.white, fontSize: 16, fontWeight: '700' },
  cardSub: { color: C.gray, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: C.cardBorder,
    gap: 12,
  },
  metricItem: { flex: 1 },
  metricLabel: { color: C.gray, fontSize: 12, marginBottom: 4 },
  metricValue: { color: C.white, fontSize: 16, fontWeight: '700' },

  errorBox: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: C.redDim,
  },
  errorTitle: { color: C.white, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  errorSub: { color: C.gray, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: C.amber, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
