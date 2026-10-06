import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { BackHandler, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlert } from "../lib/AppAlert";
import { ThemePreference, useTheme } from "../lib/ThemeContext";

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, colors, preference, setPreference } = useTheme();
  const isDark = mode === 'dark';

  useEffect(() => {
    const onBackPress = () => {
      router.back();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Appearance</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border, padding: 14 }]}>
            <View style={styles.segmentRow}>
              {THEME_OPTIONS.map((opt) => {
                const selected = preference === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.segment,
                      { backgroundColor: colors.bg, borderColor: colors.border },
                      selected && { backgroundColor: colors.green + '26', borderColor: colors.green },
                    ]}
                    onPress={() => setPreference(opt.key)}
                  >
                    <Ionicons name={opt.icon} size={20} color={selected ? colors.green : colors.textMuted} />
                    <Text style={[styles.segmentLabel, { color: selected ? colors.green : colors.textSecondary }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              System follows your phone's light/dark setting.
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Support</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow icon="help-circle-outline" label="Help & FAQ" colors={colors} onPress={() => router.push("/help-support" as never)} last />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Legal</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow icon="document-text-outline" label="Terms of Service" colors={colors} onPress={() => AppAlert.show("Coming Soon", "Terms of Service will be available soon.")} />
            <SettingRow icon="shield-outline" label="Privacy Policy" colors={colors} onPress={() => AppAlert.show("Coming Soon", "Privacy Policy will be available soon.")} last />
          </View>

          <Text style={[styles.version, { color: colors.textMuted }]}>Domexa by Sipra v1.0.0</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SettingRow({ icon, label, value, onPress, last, colors }: { icon: any; label: string; value?: string; onPress: () => void; last?: boolean; colors: any }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
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
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  section: { borderRadius: 16, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  segmentRow: { flexDirection: "row", gap: 10 },
  segment: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  segmentLabel: { fontSize: 13, fontWeight: "600" },
  helperText: { fontSize: 12, marginTop: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14 },
  version: { textAlign: "center", fontSize: 13, marginBottom: 8 },
  pressed: { opacity: 0.85 },
});