import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";

export default function VerificationPendingScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const [status, setStatus] = useState<string>("pending");
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    setChecking(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const authUserId = sessionData?.session?.user?.id;

    if (!authUserId) {
      setChecking(false);
      setLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("verification_status")
      .eq("auth_user_id", authUserId)
      .single();

    console.log("VERIFICATION STATUS:", profile, "ERROR:", error);

    if (profile) {
      setStatus(profile.verification_status || "pending");
      if (profile.verification_status === "approved") {
        router.replace("/contractor");
        return;
      }
    }

    setChecking(false);
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const isRejected = status === "rejected";

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.gold + '1F', borderColor: colors.gold + '4D' }, isRejected && { backgroundColor: colors.red + '1F', borderColor: colors.red + '4D' }]}>
            <Ionicons
              name={isRejected ? "close-circle-outline" : "time-outline"}
              size={48}
              color={isRejected ? colors.red : colors.gold}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isRejected ? "Application Not Approved" : "Verification in Progress"}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isRejected
              ? "Unfortunately, your application could not be approved at this time. Please contact support for more details or to resubmit your documents."
              : "Thanks for signing up! Our team is reviewing your documents. This usually takes 24–48 hours. We'll notify you as soon as you're approved."}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.refreshBtnWrap, pressed && styles.pressed]}
            onPress={checkStatus}
            disabled={checking}
          >
            <LinearGradient colors={[colors.blue, colors.blueDark]} style={styles.refreshBtn}>
              {checking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color="#ffffff" />
                  <Text style={styles.refreshBtnText}>Check Status</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.logoutBtn}
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace("/welcome");
            }}
          >
            <Text style={[styles.logoutBtnText, { color: colors.textMuted }]}>Sign Out</Text>
          </Pressable>
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
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: -0.5, marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 23, marginBottom: 36 },
  refreshBtnWrap: { borderRadius: 14, overflow: "hidden", width: "100%", shadowColor: "#2563eb", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  refreshBtnText: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  logoutBtn: { marginTop: 20, paddingVertical: 10 },
  logoutBtnText: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});