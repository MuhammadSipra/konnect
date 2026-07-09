import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const SLIDES = [
  { id: 1, icon: "hammer", iconColor: "#22c55e", title: "Find Work Easily", subtitle: "Get matched with projects near you. No middlemen, no hassle.", bg: "rgba(34,197,94,0.1)" },
  { id: 2, icon: "people", iconColor: "#3b82f6", title: "Connect Directly", subtitle: "Chat with clients directly. Build trust and grow your reputation.", bg: "rgba(59,130,246,0.1)" },
  { id: 3, icon: "cash", iconColor: "#fbbf24", title: "Get Paid Faster", subtitle: "Secure payments, on time, every time. Your earnings are protected.", bg: "rgba(251,191,36,0.1)" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.skipRow}>
          <Pressable onPress={() => router.replace("/auth")}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: slide.bg }]}>
            <Ionicons name={slide.icon as any} size={64} color={slide.iconColor} />
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
            ))}
          </View>
        </View>
        <View style={styles.bottom}>
          <Pressable
            style={styles.nextWrap}
            onPress={() => {
              if (isLast) router.replace("/auth");
              else setCurrent(current + 1);
            }}
          >
            <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.nextBtn}>
              <Text style={styles.nextText}>{isLast ? "Get Started" : "Next"}</Text>
              <Ionicons name={isLast ? "checkmark" : "arrow-forward"} size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  safe: { flex: 1 },
  skipRow: { paddingHorizontal: 20, paddingTop: 12, alignItems: "flex-end" },
  skipText: { fontSize: 15, color: "#64748b", fontWeight: "600" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconCircle: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center", marginBottom: 40 },
  title: { fontSize: 30, fontWeight: "800", color: "#f8fafc", textAlign: "center", letterSpacing: -0.8, marginBottom: 16 },
  subtitle: { fontSize: 17, color: "#94a3b8", textAlign: "center", lineHeight: 26, fontWeight: "500" },
  dots: { flexDirection: "row", gap: 8, marginTop: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#334155" },
  dotActive: { width: 24, backgroundColor: "#22c55e" },
  bottom: { paddingHorizontal: 20, paddingBottom: 32 },
  nextWrap: { borderRadius: 16, overflow: "hidden" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16 },
  nextText: { fontSize: 18, fontWeight: "700", color: "#fff" },
});