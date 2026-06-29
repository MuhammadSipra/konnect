import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Background glow */}
      <LinearGradient
        colors={["#0f172a", "#020617", "#0a0f1a"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brandBlock}>
            <Text style={styles.title}>Konnect</Text>
            <Text style={styles.byline}>by Sipra</Text>
            <Text style={styles.tagline}>India's #1 Contractor Marketplace</Text>
          </View>

          {/* Buttons */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.buttonWrap,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/contractor")}
            >
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>I'm a Contractor</Text>
                <Text style={styles.buttonSubtext}>Find jobs & grow your business</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.buttonWrap,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/customer")}
            >
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>I Need Work Done</Text>
                <Text style={styles.buttonSubtext}>Hire trusted contractors near you</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.footer}>Trusted by contractors across India</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  glowGreen: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  glowBlue: {
    position: "absolute",
    bottom: 40,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  brandBlock: {
    marginTop: 24,
  },
  title: {
    fontSize: 56,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -1.5,
  },
  byline: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
    letterSpacing: 0.3,
  },
  tagline: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600",
    color: "#94a3b8",
    lineHeight: 26,
  },
  actions: {
    gap: 16,
  },
  buttonWrap: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  button: {
    paddingVertical: 22,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  buttonSubtext: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
});