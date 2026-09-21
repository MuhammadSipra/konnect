import { Ionicons } from "@expo/vector-icons";
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlert } from "../lib/AppAlert";
import { setPendingRole } from "../lib/pendingRole";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const { role } = useLocalSearchParams<{ role?: string }>();
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
      const data = { identifier: '91' + phone };
      const response = await OTPWidget.sendOTP(data);
      console.log('SEND OTP RESPONSE:', JSON.stringify(response));
  
      if (response.type === 'success') {
        router.push({
          pathname: "/otp",
          params: { phone: "+91" + phone, role: role || "client", reqId: response.message },
        });
      
      } else {
        AppAlert.show("Error", "Could not send OTP. Please try again.");
      }
    } catch (err) {
      AppAlert.show("Error", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setPendingRole(role || "client");
    const redirectUrl = makeRedirectUri();
    console.log('REDIRECT URL:', redirectUrl);
  
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
    
      },
    });
  
    if (error) {
      AppAlert.show('Error', error.message);
      return;
    }
  
    if (data?.url) {
      await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={colors.bgGradient}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {isSignUp ? "Create Account" : "Welcome Back"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {isSignUp
                  ? "Sign up to get started with Konnect"
                  : "Sign in to continue"}
              </Text>
            </View>
            <Text style={[styles.label, { color: colors.textMuted }]}>Phone number</Text>
            <View style={styles.phoneRow}>
              <View style={[styles.prefixBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.prefixText, { color: colors.textPrimary }]}>+91</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="9876543210"
                placeholderTextColor={colors.textMuted}
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
                    ? [colors.green, colors.greenDark]
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
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
            <Pressable
              style={({ pressed }) => [styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
              onPress={handleGoogleSignIn}
            >
              <Ionicons name="logo-google" size={22} color={colors.textPrimary} />
              <Text style={[styles.googleBtnText, { color: colors.textPrimary }]}>Continue with Google</Text>
            </Pressable>
          </ScrollView>
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <Pressable onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={[styles.footerLink, { color: colors.green }]}>
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
  root: { flex: 1 },
  flex: { flex: 1 },
  glowGreen: { position: "absolute", top: -80, right: -50, width: 260, height: 260, borderRadius: 130 },
  glowBlue: { position: "absolute", bottom: 80, left: -70, width: 280, height: 280, borderRadius: 140 },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  titleBlock: { marginBottom: 36 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { marginTop: 8, fontSize: 16, fontWeight: "500", lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  prefixBox: { borderRadius: 14, paddingHorizontal: 16, justifyContent: "center", borderWidth: 1 },
  prefixText: { fontSize: 16, fontWeight: "700" },
  phoneInput: { flex: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, borderWidth: 1 },
  otpBtnWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 32, shadowColor: "#22c55e", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  otpBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  otpBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 14 },
  otpBtnText: { fontSize: 17, fontWeight: "700", color: "#ffffff" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: "500" },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 14, paddingVertical: 16, borderWidth: 1 },
  googleBtnText: { fontSize: 16, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 20, paddingHorizontal: 24 },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});