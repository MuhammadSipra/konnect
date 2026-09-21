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
import { useTheme } from '../lib/ThemeContext';

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
  const { colors, mode } = useTheme();
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
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Earnings</Text>
          <View style={styles.iconBtn} />
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.walletCard, { backgroundColor: colors.green + '1A', borderColor: colors.green + '4D' }]}>
              <Text style={[styles.walletLabel, { color: colors.green }]}>Wallet Balance</Text>
              <Text style={[styles.walletValue, { color: colors.textPrimary }]}>₹{walletBalance}</Text>
            </View>

            <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalCompleted}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Jobs Completed</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{completedThisMonth}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>This Month</Text>
              </View>
            </View>

            <Pressable style={[styles.historyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push("/history" as never)}>
              <Ionicons name="time-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.historyBtnText, { color: colors.textPrimary }]}>View Job History</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.noteText, { color: colors.textMuted }]}>
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
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  walletCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20 },
  walletLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  walletValue: { fontSize: 40, fontWeight: "800", marginTop: 8, letterSpacing: -1 },
  statsRow: { flexDirection: "row", borderRadius: 16, paddingVertical: 20, borderWidth: 1, marginBottom: 20 },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { marginTop: 4, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  statDivider: { width: 1 },
  historyBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, marginBottom: 20 },
  historyBtnText: { flex: 1, fontSize: 15, fontWeight: "600" },
  noteBox: { flexDirection: "row", gap: 8, paddingHorizontal: 4 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});