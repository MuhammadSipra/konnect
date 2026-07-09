import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TRANSACTIONS = [
  { id: "1", project: "Kitchen Renovation", client: "Priya Sharma", amount: "+₹42,500", date: "Today", status: "credited", color: "#22c55e" },
  { id: "2", project: "Bathroom Tiling", client: "Rahul Mehta", amount: "+₹16,000", date: "Yesterday", status: "credited", color: "#22c55e" },
  { id: "3", project: "Office Partition", client: "Amit Corp", amount: "+₹28,000", date: "3 days ago", status: "credited", color: "#22c55e" },
  { id: "4", project: "Platform Fee", client: "Konnect", amount: "-₹2,850", date: "3 days ago", status: "deducted", color: "#f87171" },
  { id: "5", project: "Living Room Work", client: "Neha Shah", amount: "+₹35,000", date: "1 week ago", status: "credited", color: "#22c55e" },
];

export default function EarningsScreen() {
  const router = useRouter();
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
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={["#16a34a", "#15803d"]} style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Earnings This Month</Text>
            <Text style={styles.balanceAmount}>₹1,21,500</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatVal}>84</Text>
                <Text style={styles.balanceStatLbl}>Jobs Done</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatVal}>₹8,750</Text>
                <Text style={styles.balanceStatLbl}>Pending</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatVal}>4.8★</Text>
                <Text style={styles.balanceStatLbl}>Rating</Text>
              </View>
            </View>
          </LinearGradient>

          <Pressable style={styles.withdrawBtn}>
            <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.withdrawGradient}>
              <Ionicons name="arrow-down-circle-outline" size={20} color="#fff" />
              <Text style={styles.withdrawText}>Withdraw to Bank</Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {TRANSACTIONS.map((t) => (
            <View key={t.id} style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: t.color + "20" }]}>
                <Ionicons name={t.status === "credited" ? "arrow-down" : "arrow-up"} size={18} color={t.color} />
              </View>
              <View style={styles.txBody}>
                <Text style={styles.txProject}>{t.project}</Text>
                <Text style={styles.txClient}>{t.client} · {t.date}</Text>
              </View>
              <Text style={[styles.txAmount, { color: t.color }]}>{t.amount}</Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
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
  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 16 },
  balanceLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  balanceAmount: { fontSize: 36, fontWeight: "800", color: "#fff", marginTop: 8, marginBottom: 20, letterSpacing: -1 },
  balanceRow: { flexDirection: "row", alignItems: "center" },
  balanceStat: { flex: 1, alignItems: "center" },
  balanceStatVal: { fontSize: 18, fontWeight: "700", color: "#fff" },
  balanceStatLbl: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  balanceDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },
  withdrawBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 24 },
  withdrawGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  withdrawText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#f1f5f9", marginBottom: 12 },
  txCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1e293b", gap: 12 },
  txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txBody: { flex: 1 },
  txProject: { fontSize: 15, fontWeight: "600", color: "#f8fafc" },
  txClient: { fontSize: 13, color: "#64748b", marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});