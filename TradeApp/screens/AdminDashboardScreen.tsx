import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const API_BASE_URL = 'http://192.168.30.8:5000';

type Props = NativeStackScreenProps<any, 'AdminDashboard'>;
type Tab = 'Overview' | 'Users' | 'Subscriptions' | 'Payments';

type Stats = {
  totalUsers: number;
  totalSubscriptions: number;
  totalPayments: number;
};

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
};

type Subscription = {
  id: number;
  userId: number;
  plan: string;
  status: string;
  expiresAt?: string | null;
};

type Payment = {
  id: number;
  userId: number;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
};

type StatCardProps = {
  label: string;
  value: number;
  icon: string;
};

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function AdminDashboardScreen({ route, navigation }: Props) {
  const token = route.params?.token as string | undefined;
  const admin = route.params?.user;

  const [tab, setTab] = useState<Tab>('Overview');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSubscriptions: 0,
    totalPayments: 0,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const request = useCallback(
    async (endpoint: string) => {
      if (!token) {
        throw new Error('Admin token missing. Please log in again.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/admin/${endpoint}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`);
      }

      return data;
    },
    [token],
  );

  const loadDashboard = useCallback(async () => {
    try {
      const [statsData, usersData, subscriptionsData, paymentsData] =
        await Promise.all([
          request('stats'),
          request('users'),
          request('subscriptions'),
          request('payments'),
        ]);

      setStats(statsData.stats);
      setUsers(usersData.users || []);
      setSubscriptions(subscriptionsData.subscriptions || []);
      setPayments(paymentsData.payments || []);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to load dashboard.';
      Alert.alert('Dashboard Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const money = (amount: number, currency = 'PKR') =>
    `${currency} ${Number(amount || 0).toLocaleString()}`;

  const renderOverview = () => (
    <>
      <SectionTitle title="Platform Overview" />
      <View style={styles.statsGrid}>
        <StatCard label="Total Users" value={stats.totalUsers} icon="👥" />
        <StatCard
          label="Subscriptions"
          value={stats.totalSubscriptions}
          icon="💎"
        />
        <StatCard label="Payments" value={stats.totalPayments} icon="💳" />
      </View>

      <SectionTitle title="Quick Management" />
      {(['Users', 'Subscriptions', 'Payments'] as Tab[]).map(item => (
        <TouchableOpacity
          key={item}
          style={styles.quickButton}
          onPress={() => setTab(item)}
        >
          <Text style={styles.quickButtonText}>Manage {item}</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Administrator Account</Text>
        <Text style={styles.noticeText}>
          {admin?.email || 'Admin'} · {admin?.role || 'ADMIN'}
        </Text>
      </View>
    </>
  );

  const renderUsers = () => (
    <>
      <SectionTitle title={`Registered Users (${users.length})`} />
      {users.map(user => (
        <View key={user.id} style={styles.listCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.listContent}>
            <Text style={styles.itemTitle}>{user.name}</Text>
            <Text style={styles.itemSubtitle}>{user.email}</Text>
            <Text style={styles.smallText}>ID: {user.id}</Text>
          </View>
          <Text style={user.role === 'ADMIN' ? styles.adminBadge : styles.badge}>
            {user.role}
          </Text>
        </View>
      ))}
      {users.length === 0 && <Text style={styles.empty}>No users found.</Text>}
    </>
  );

  const renderSubscriptions = () => (
    <>
      <SectionTitle title={`Subscriptions (${subscriptions.length})`} />
      {subscriptions.map(item => (
        <View key={item.id} style={styles.listCard}>
          <View style={styles.listContent}>
            <Text style={styles.itemTitle}>{item.plan}</Text>
            <Text style={styles.itemSubtitle}>User ID: {item.userId}</Text>
            <Text style={styles.smallText}>
              Expires:{' '}
              {item.expiresAt
                ? new Date(item.expiresAt).toLocaleDateString()
                : 'Not specified'}
            </Text>
          </View>
          <Text
            style={
              item.status?.toUpperCase() === 'ACTIVE'
                ? styles.successBadge
                : styles.badge
            }
          >
            {item.status}
          </Text>
        </View>
      ))}
      {subscriptions.length === 0 && (
        <Text style={styles.empty}>No subscriptions found.</Text>
      )}
    </>
  );

  const renderPayments = () => (
    <>
      <SectionTitle title={`Payments (${payments.length})`} />
      {payments.map(payment => (
        <View key={payment.id} style={styles.listCard}>
          <View style={styles.listContent}>
            <Text style={styles.itemTitle}>
              {money(payment.amount, payment.currency)}
            </Text>
            <Text style={styles.itemSubtitle}>User ID: {payment.userId}</Text>
            <Text style={styles.smallText}>
              {payment.gateway} · Payment #{payment.id}
            </Text>
          </View>
          <Text
            style={
              payment.status?.toUpperCase() === 'SUCCESS'
                ? styles.successBadge
                : styles.badge
            }
          >
            {payment.status}
          </Text>
        </View>
      ))}
      {payments.length === 0 && (
        <Text style={styles.empty}>No payments found.</Text>
      )}
    </>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F5C518" />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>TRADEAPP</Text>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage your platform</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#F5C518"
          />
        }
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            Welcome, {admin?.name || 'Admin'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Your platform at a glance.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {(['Overview', 'Users', 'Subscriptions', 'Payments'] as Tab[]).map(
            item => (
              <TouchableOpacity
                key={item}
                onPress={() => setTab(item)}
                style={[styles.tab, tab === item && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === item && styles.activeTabText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        {tab === 'Overview' && renderOverview()}
        {tab === 'Users' && renderUsers()}
        {tab === 'Subscriptions' && renderSubscriptions()}
        {tab === 'Payments' && renderPayments()}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          }
        >
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0B' },
  center: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#FFFFFF', marginTop: 14 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    backgroundColor: '#151515',
    borderBottomWidth: 1,
    borderBottomColor: '#292929',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#F5C518',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 5,
  },
  headerSubtitle: { color: '#999999', fontSize: 12, marginTop: 4 },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: { color: '#F5C518', fontSize: 28 },
  scrollContent: { padding: 18, paddingBottom: 35 },
  welcomeCard: {
    backgroundColor: '#F5C518',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  welcomeTitle: { color: '#0B0B0B', fontSize: 20, fontWeight: '900' },
  welcomeSubtitle: { color: '#343018', fontSize: 13, marginTop: 6 },
  tabs: { gap: 8, paddingBottom: 20 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#303030',
  },
  activeTab: { backgroundColor: '#F5C518', borderColor: '#F5C518' },
  tabText: { color: '#BBBBBB', fontWeight: '700', fontSize: 12 },
  activeTabText: { color: '#0B0B0B' },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
    marginTop: 5,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  statCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 95,
    backgroundColor: '#171717',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    padding: 14,
  },
  statIcon: { fontSize: 22 },
  statValue: {
    color: '#F5C518',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 12,
  },
  statLabel: { color: '#AAAAAA', fontSize: 11, marginTop: 5 },
  quickButton: {
    backgroundColor: '#171717',
    borderColor: '#303030',
    borderWidth: 1,
    borderRadius: 12,
    padding: 17,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  arrow: { color: '#F5C518', fontSize: 26 },
  notice: {
    backgroundColor: '#171717',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F5C518',
  },
  noticeTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  noticeText: { color: '#999999', marginTop: 7, fontSize: 12 },
  listCard: {
    backgroundColor: '#171717',
    borderRadius: 13,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#0B0B0B', fontSize: 18, fontWeight: '900' },
  listContent: { flex: 1 },
  itemTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  itemSubtitle: { color: '#AAAAAA', fontSize: 12, marginTop: 5 },
  smallText: { color: '#777777', fontSize: 10, marginTop: 5 },
  badge: {
    color: '#F5C518',
    backgroundColor: '#332C0C',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    fontSize: 9,
    fontWeight: '900',
    overflow: 'hidden',
  },
  adminBadge: {
    color: '#FFFFFF',
    backgroundColor: '#245A41',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    fontSize: 9,
    fontWeight: '900',
    overflow: 'hidden',
  },
  successBadge: {
    color: '#70E0A0',
    backgroundColor: '#123322',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    fontSize: 9,
    fontWeight: '900',
    overflow: 'hidden',
  },
  empty: { color: '#888888', textAlign: 'center', padding: 25 },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#7F3030',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 25,
  },
  logoutText: {
    color: '#FF7777',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});