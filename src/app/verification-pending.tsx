import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function VerificationPendingScreen() {
  const router = useRouter();
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
      <View style={styles.root}>
        <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, isRejected && styles.iconCircleRejected]}>
            <Ionicons
              name={isRejected ? "close-circle-outline" : "time-outline"}
              size={48}
              color={isRejected ? "#ef4444" : "#fbbf24"}
            />
          </View>

          <Text style={styles.title}>
            {isRejected ? "Application Not Approved" : "Verification in Progress"}
          </Text>

          <Text style={styles.subtitle}>
            {isRejected
              ? "Unfortunately, your application could not be approved at this time. Please contact support for more details or to resubmit your documents."
              : "Thanks for signing up! Our team is reviewing your documents. This usually takes 24–48 hours. We'll notify you as soon as you're approved."}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.refreshBtnWrap, pressed && styles.pressed]}
            onPress={checkStatus}
            disabled={checking}
          >
            <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.refreshBtn}>
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
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  glowGreen: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
  },
  glowBlue: {
    position: "absolute",
    bottom: 40,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  safe: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  iconCircleRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f8fafc",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 36,
  },
  refreshBtnWrap: {
    borderRadius: 14,
    overflow: "hidden",
    width: "100%",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  refreshBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  logoutBtn: {
    marginTop: 20,
    paddingVertical: 10,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
