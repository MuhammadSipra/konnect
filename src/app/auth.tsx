import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();
import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const router = useRouter();
  const [_, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '21030901763-janfv3vbe7015ja91m2f9rkuu5gmle4n.apps.googleusercontent.com',
    webClientId: '21030901763-ohkv5l5j01p78eef3epcmvq6v72lunq6.apps.googleusercontent.com',
  });
  const [phone, setPhone] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10 || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: "+91" + phone,
      });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      router.push({ pathname: "/otp", params: { phone: "+91" + phone } });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'exp://192.168.0.112:8081',
      },
    });
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0f172a", "#020617", "#0a0f1a"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#f8fafc" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleBlock}>
              <Text style={styles.title}>
                {isSignUp ? "Create Account" : "Welcome Back"}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUp
                  ? "Sign up to get started with Konnect"
                  : "Sign in to continue"}
              </Text>
            </View>
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="9876543210"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.otpBtnWrap,
                (phone.length !== 10 || loading) && styles.otpBtnDisabled,
                pressed && phone.length === 10 && !loading && styles.pressed,
              ]}
              onPress={handleSendOtp}
              disabled={phone.length !== 10 || loading}
            >
              <LinearGradient
                colors={
                  phone.length === 10 && !loading
                    ? ["#22c55e", "#16a34a"]
                    : ["#334155", "#1e293b"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.otpBtn}
              >
                <Text style={styles.otpBtnText}>
                  {loading ? "Sending..." : "Send OTP"}
                </Text>
              </LinearGradient>
            </Pressable>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable
              style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
              onPress={handleGoogleSignIn}
            >
              <Ionicons name="logo-google" size={22} color="#ffffff" />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </Pressable>
          </ScrollView>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <Pressable onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.footerLink}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  flex: { flex: 1 },
  glowGreen: { position: "absolute", top: -80, right: -50, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(34, 197, 94, 0.1)" },
  glowBlue: { position: "absolute", bottom: 80, left: -70, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(59, 130, 246, 0.08)" },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30, 41, 59, 0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  titleBlock: { marginBottom: 36 },
  title: { fontSize: 32, fontWeight: "800", color: "#f8fafc", letterSpacing: -0.8 },
  subtitle: { marginTop: 8, fontSize: 16, color: "#94a3b8", fontWeight: "500", lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  prefixBox: { backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: 14, paddingHorizontal: 16, justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
  prefixText: { fontSize: 16, fontWeight: "700", color: "#f8fafc" },
  phoneInput: { flex: 1, backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: "#f8fafc", borderWidth: 1, borderColor: "#1e293b" },
  otpBtnWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 32, shadowColor: "#22c55e", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  otpBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  otpBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 14 },
  otpBtnText: { fontSize: 17, fontWeight: "700", color: "#ffffff" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1e293b" },
  dividerText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: "#334155" },
  googleBtnText: { fontSize: 16, fontWeight: "600", color: "#f8fafc" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 20, paddingHorizontal: 24 },
  footerText: { fontSize: 15, color: "#94a3b8" },
  footerLink: { fontSize: 15, fontWeight: "700", color: "#22c55e" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});