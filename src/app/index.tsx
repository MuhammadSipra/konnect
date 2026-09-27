import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/ThemeContext";

export default function SplashScreen() {
  const { colors, mode } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />

      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={[styles.logoCircle, { backgroundColor: colors.green, shadowColor: colors.green }]}>
            <Text style={styles.logoLetter}>K</Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Konnect</Text>
          <Text style={[styles.byline, { color: colors.textMuted }]}>by Sipra</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>India's #1 Contractor Marketplace</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glowGreen: { position: "absolute", top: -80, left: -60, width: 280, height: 280, borderRadius: 140 },
  glowBlue: { position: "absolute", bottom: 40, right: -80, width: 320, height: 320, borderRadius: 160 },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 24,
    alignItems: "center", justifyContent: "center", marginBottom: 24,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  logoLetter: { fontSize: 44, fontWeight: "800", color: "#ffffff" },
  title: { fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  byline: { marginTop: 4, fontSize: 14, fontWeight: "500", letterSpacing: 0.3 },
  tagline: { marginTop: 16, fontSize: 15, fontWeight: "600", textAlign: "center" },
});