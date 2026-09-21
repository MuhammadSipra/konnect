import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/ThemeContext";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />

      {/* Background glow */}
      <LinearGradient
        colors={colors.bgGradient}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brandBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Konnect</Text>
            <Text style={[styles.byline, { color: colors.textMuted }]}>by Sipra</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>India's #1 Contractor Marketplace</Text>
          </View>

          {/* Buttons */}
          <View style={styles.actions}>
          <Pressable
  style={({ pressed }) => [
    styles.buttonWrap,
    pressed && styles.buttonPressed,
  ]}
  onPress={() => router.push({ pathname: "/auth", params: { role: "contractor" } })}
>
              <LinearGradient
                colors={[colors.green, colors.greenDark]}
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
  onPress={() => router.push({ pathname: "/auth", params: { role: "client" } })}
>
              <LinearGradient
                colors={[colors.blue, colors.blueDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>I Need Work Done</Text>
                <Text style={styles.buttonSubtext}>Hire trusted contractors near you</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={[styles.footer, { color: colors.textMuted }]}>Trusted by contractors across India</Text>
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
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32, justifyContent: "space-between" },
  brandBlock: { marginTop: 24 },
  title: { fontSize: 56, fontWeight: "800", letterSpacing: -1.5 },
  byline: { marginTop: 6, fontSize: 16, fontWeight: "500", letterSpacing: 0.3 },
  tagline: { marginTop: 20, fontSize: 18, fontWeight: "600", lineHeight: 26 },
  actions: { gap: 16 },
  buttonWrap: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  button: { paddingVertical: 22, paddingHorizontal: 24, borderRadius: 16 },
  buttonText: { fontSize: 20, fontWeight: "700", color: "#ffffff", letterSpacing: -0.3 },
  buttonSubtext: { marginTop: 4, fontSize: 13, fontWeight: "500", color: "rgba(255, 255, 255, 0.85)" },
  footer: { textAlign: "center", fontSize: 13, fontWeight: "500" },
});