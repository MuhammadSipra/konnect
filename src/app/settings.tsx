import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileCard}>
            <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.avatar}>
              <Text style={styles.avatarText}>RK</Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Rajesh Kumar</Text>
              <Text style={styles.profileRole}>Civil Contractor</Text>
            </View>
            <Pressable style={styles.editBtn}>
              <Ionicons name="create-outline" size={20} color="#22c55e" />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.section}>
            <SettingRow icon="person-outline" label="Edit Profile" onPress={() => {}} />
            <SettingRow icon="call-outline" label="Phone Number" value="+91 88989 28483" onPress={() => {}} />
            <SettingRow icon="location-outline" label="Service Area" value="Mumbai" onPress={() => {}} />
            <SettingRow icon="briefcase-outline" label="Skills & Services" onPress={() => {}} last />
          </View>

          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.section}>
            <ToggleRow icon="notifications-outline" label="Push Notifications" value={notifications} onChange={setNotifications} />
            <ToggleRow icon="moon-outline" label="Dark Mode" value={darkMode} onChange={setDarkMode} />
            <ToggleRow icon="navigate-outline" label="Location Access" value={locationAccess} onChange={setLocationAccess} last />
          </View>

          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.section}>
            <SettingRow icon="help-circle-outline" label="Help & FAQ" onPress={() => {}} />
            <SettingRow icon="chatbubble-outline" label="Contact Support" onPress={() => {}} />
            <SettingRow icon="star-outline" label="Rate the App" onPress={() => {}} last />
          </View>

          <Text style={styles.sectionLabel}>Legal</Text>
          <View style={styles.section}>
            <SettingRow icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
            <SettingRow icon="shield-outline" label="Privacy Policy" onPress={() => {}} last />
          </View>

          <Pressable style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#f87171" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
          <Text style={styles.version}>Konnect by Sipra v1.0.0</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SettingRow({ icon, label, value, onPress, last }: { icon: any; label: string; value?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color="#64748b" />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color="#475569" />
      </View>
    </Pressable>
  );
}

function ToggleRow({ icon, label, value, onChange, last }: { icon: any; label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color="#64748b" />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#334155", true: "#22c55e" }} thumbColor="#fff" />
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
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1e293b", marginBottom: 24, gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "700", color: "#f8fafc" },
  profileRole: { fontSize: 14, color: "#94a3b8", marginTop: 2 },
  editBtn: { padding: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  section: { backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, borderWidth: 1, borderColor: "#1e293b", marginBottom: 20, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, color: "#e2e8f0", fontWeight: "500" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14, color: "#64748b" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(248,113,113,0.1)", borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: "rgba(248,113,113,0.25)", marginBottom: 16 },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#f87171" },
  version: { textAlign: "center", fontSize: 13, color: "#475569", marginBottom: 8 },
  pressed: { opacity: 0.85 },
});