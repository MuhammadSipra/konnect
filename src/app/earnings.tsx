import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentProfileId } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';

async function resolveContractorId(): Promise<number | null> {
  const cached = getCurrentProfileId();
  if (cached) return cached;

  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData?.session?.user?.id;
  if (!authUserId) return null;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('user_type', 'contractor')
    .maybeSingle();

  return profileRow?.id ?? null;
}

export default function EarningsScreen() {
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [completedThisMonth, setCompletedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const id = await resolveContractorId();
      if (!id) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', id)
        .single();
      setWalletBalance(profileData?.wallet_balance ?? 0);

      const { data: completedBids } = await supabase
        .from('bids')
        .select('completed_at')
        .eq('contractor_id', id)
        .eq('status', 'completed');

      const all = completedBids || [];
      setTotalCompleted(all.length);

      const currentMonth = new Date().toISOString().slice(0, 7);
      const thisMonth = all.filter((b) => b.completed_at?.slice(0, 7) === currentMonth);
      setCompletedThisMonth(thisMonth.length);

      setLoading(false);
    };
    load();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={styles.iconBtn} />
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletValue}>₹{walletBalance}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalCompleted}</Text>
                <Text style={styles.statLabel}>Jobs Completed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{completedThisMonth}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
            </View>

            <Pressable style={styles.historyBtn} onPress={() => router.push("/history" as never)}>
              <Ionicons name="time-outline" size={18} color="#f8fafc" />
              <Text style={styles.historyBtnText}>View Job History</Text>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </Pressable>

            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color="#64748b" />
              <Text style={styles.noteText}>
                Wallet balance reflects any penalty deductions. Payment collection and payout tracking are coming in a future update.
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30,41,59,0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  walletCard: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  walletLabel: { fontSize: 13, fontWeight: "600", color: "#86efac", textTransform: "uppercase", letterSpacing: 0.5 },
  walletValue: { fontSize: 40, fontWeight: "800", color: "#f8fafc", marginTop: 8, letterSpacing: -1 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 20,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "800", color: "#f8fafc" },
  statLabel: { marginTop: 4, fontSize: 11, fontWeight: "600", color: "#64748b", textTransform: "uppercase" },
  statDivider: { width: 1, backgroundColor: "#1e293b" },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(30,41,59,0.6)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 20,
  },
  historyBtnText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#f8fafc" },
  noteBox: { flexDirection: "row", gap: 8, paddingHorizontal: 4 },
  noteText: { flex: 1, fontSize: 12, color: "#64748b", lineHeight: 18 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});