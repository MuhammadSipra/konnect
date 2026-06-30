import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length < 10) return "+91 XXXXXXXXXX";
  const masked = last10.slice(0, 2) + "XXXXXX" + last10.slice(8);
  return `+91 ${masked}`;
}

export default function OtpScreen() {
  const router = useRouter();
  const { phone = "" } = useLocalSearchParams<{ phone?: string }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const otpValue = otp.join("");
  const isComplete = otpValue.length === OTP_LENGTH;

  useEffect(() => {
    if (canResend) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [canResend]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, "").slice(-1);

    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
    }
  };

  const handleVerify = () => {
    if (!isComplete) return;
    // Verify OTP with backend, then navigate
    // router.replace("/contractor");
  };

  const handleResend = () => {
    if (!canResend) return;

    setOtp(Array(OTP_LENGTH).fill(""));
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
    inputRefs.current[0]?.focus();

    // Call resend OTP API
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
          {/* Back button */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#f8fafc" />
            </Pressable>
          </View>

          <View style={styles.content}>
            {/* Title */}
            <Text style={styles.title}>Verify Phone</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {maskPhone(String(phone))}
            </Text>

            {/* OTP boxes */}
            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  caretHidden
                />
              ))}
            </View>

            {/* Verify button */}
            <Pressable
              style={({ pressed }) => [
                styles.verifyBtnWrap,
                !isComplete && styles.verifyBtnDisabled,
                pressed && isComplete && styles.pressed,
              ]}
              onPress={handleVerify}
              disabled={!isComplete}
            >
              <LinearGradient
                colors={
                  isComplete
                    ? ["#22c55e", "#16a34a"]
                    : ["#334155", "#1e293b"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.verifyBtn}
              >
                <Text style={styles.verifyBtnText}>Verify</Text>
              </LinearGradient>
            </Pressable>

            {/* Resend OTP */}
            <View style={styles.resendRow}>
              {canResend ? (
                <Pressable onPress={handleResend}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </Pressable>
              ) : (
                <Text style={styles.resendTimer}>
                  Resend OTP in{" "}
                  <Text style={styles.resendTimerBold}>{countdown}s</Text>
                </Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  flex: {
    flex: 1,
  },
  glowGreen: {
    position: "absolute",
    top: -80,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  glowBlue: {
    position: "absolute",
    bottom: 80,
    left: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "500",
    lineHeight: 24,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 32,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1e293b",
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
  },
  otpBoxFilled: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  verifyBtnWrap: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  verifyBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtn: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 14,
  },
  verifyBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
  resendRow: {
    marginTop: 28,
    alignItems: "center",
  },
  resendLink: {
    fontSize: 15,
    fontWeight: "700",
    color: "#22c55e",
  },
  resendTimer: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
  },
  resendTimerBold: {
    color: "#94a3b8",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});