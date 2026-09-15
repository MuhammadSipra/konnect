import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SplashScreen() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#0f172a", "#020617", "#0a0f1a"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>K</Text>
          </View>

          <Text style={styles.title}>Konnect</Text>
          <Text style={styles.byline}>by Sipra</Text>
          <Text style={styles.tagline}>India's #1 Contractor Marketplace</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  glowGreen: {
    position: "absolute", top: -80, left: -60, width: 280, height: 280,
    borderRadius: 140, backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  glowBlue: {
    position: "absolute", bottom: 40, right: -80, width: 320, height: 320,
    borderRadius: 160, backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 24, backgroundColor: "#22c55e",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
    shadowColor: "#22c55e", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  logoLetter: { fontSize: 44, fontWeight: "800", color: "#ffffff" },
  title: { fontSize: 40, fontWeight: "800", color: "#f8fafc", letterSpacing: -1 },
  byline: { marginTop: 4, fontSize: 14, fontWeight: "500", color: "#64748b", letterSpacing: 0.3 },
  tagline: { marginTop: 16, fontSize: 15, fontWeight: "600", color: "#94a3b8", textAlign: "center" },
});