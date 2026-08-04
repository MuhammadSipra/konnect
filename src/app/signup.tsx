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
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { OTPWidget } from "@msg91comm/sendotp-react-native";
import { supabase } from "../lib/supabase";

const SKILLS = ["Interior", "Civil", "Electrical", "Plumbing", "Carpentry", "Modular Furniture"] as const;
const BUSINESS_TYPES = ["Individual", "Partnership", "Pvt Ltd", "Proprietorship"] as const;

async function uploadImage(uri: string, folder: string): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const fileExt = uri.split(".").pop() || "jpg";
    const fileName = `${folder}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("documents")
      .upload(fileName, arrayBuffer, { contentType: blob.type || "image/jpeg" });

    if (error) {
      console.log("UPLOAD ERROR:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.log("UPLOAD EXCEPTION:", err);
    return null;
  }
}

function PhotoPicker({
  label,
  uri,
  onPicked,
}: {
  label: string;
  uri: string | null;
  onPicked: (localUri: string) => void;
}) {
  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo access to upload this document.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onPicked(result.assets[0].uri);
    }
  };

  return (
    <Pressable style={styles.photoPicker} onPress={handlePick}>
      {uri ? (
        <Image source={{ uri }} style={styles.photoPreview} />
      ) : (
        <>
          <Ionicons name="camera-outline" size={28} color="#64748b" />
          <Text style={styles.photoPickerText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => onToggle(option)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const {
    role = "client",
    phone: phoneParam = "",
    email: emailParam = "",
  } = useLocalSearchParams<{ role?: string; phone?: string; email?: string }>();
  const isContractor = role === "contractor";

  // Whichever channel brought the user here is already verified.
  const primaryChannel: "phone" | "email" = phoneParam ? "phone" : "email";

  const [step, setStep] = useState(1);
  const totalSteps = isContractor ? 4 : 1;
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Personal
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState(String(emailParam || ""));
  const [phoneValue, setPhoneValue] = useState(
    String(phoneParam || "").replace("+91", "").replace(/\D/g, "").slice(-10)
  );
  const [whatsapp, setWhatsapp] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [profilePhotoLocal, setProfilePhotoLocal] = useState<string | null>(null);

  // Dual verification state
  const [phoneVerified, setPhoneVerified] = useState(primaryChannel === "phone");
  const [emailVerified, setEmailVerified] = useState(primaryChannel === "email");
  const [otpModalFor, setOtpModalFor] = useState<"phone" | "email" | null>(null);
  const [verifyReqId, setVerifyReqId] = useState<string | null>(null);
  const [secondaryOtp, setSecondaryOtp] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);

  // Step 2 — Identity KYC
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarPhotoLocal, setAadhaarPhotoLocal] = useState<string | null>(null);
  const [panNumber, setPanNumber] = useState("");
  const [panPhotoLocal, setPanPhotoLocal] = useState<string | null>(null);

  // Step 3 — Business
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<string[]>([]);
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDocLocal, setBusinessDocLocal] = useState<string | null>(null);

  // Step 4 — GST & Bank
  const [gstNumber, setGstNumber] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [chequePhotoLocal, setChequePhotoLocal] = useState<string | null>(null);

  const step1Valid = name.trim().length > 0 && location.trim().length > 0;
  const needsBusinessDoc = businessType.length > 0 && businessType[0] !== "Individual";

  const handleSendSecondaryOtp = async (channel: "phone" | "email") => {
    if (channel === "phone" && phoneValue.length !== 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    if (channel === "email" && !email.includes("@")) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }

    const identifier = channel === "phone" ? "91" + phoneValue : email.trim();
    setOtpBusy(true);
    try {
      const response = await OTPWidget.sendOTP({ identifier });
      if (response.type === "success") {
        setVerifyReqId(response.message);
        setOtpModalFor(channel);
        setSecondaryOtp("");
      } else {
        Alert.alert("Error", "Could not send OTP. Please try again.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not send OTP. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleConfirmSecondaryOtp = async () => {
    if (!verifyReqId || secondaryOtp.length < 4 || !otpModalFor) return;
    setOtpBusy(true);
    try {
      const response = await OTPWidget.verifyOTP({ reqId: verifyReqId, otp: secondaryOtp });
      if (response.type === "success") {
        if (otpModalFor === "phone") setPhoneVerified(true);
        if (otpModalFor === "email") setEmailVerified(true);
        setOtpModalFor(null);
        setSecondaryOtp("");
      } else {
        Alert.alert("Invalid Code", "The OTP you entered is incorrect or expired.");
      }
    } catch (err) {
      Alert.alert("Error", "Verification failed. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !step1Valid) {
      Alert.alert("Missing info", "Please fill at least your name and location.");
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handleSkip = () => {
    if (step < totalSteps) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    import { setCurrentProfile } from "../lib/currentProfile";
    if (submitting) return;
    setSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const authUserId = sessionData?.session?.user?.id;

    let profilePhotoUrl: string | null = null;
    let aadhaarPhotoUrl: string | null = null;
    let panPhotoUrl: string | null = null;
    let chequePhotoUrl: string | null = null;
    let businessDocUrl: string | null = null;

    if (profilePhotoLocal) profilePhotoUrl = await uploadImage(profilePhotoLocal, "profile-photos");
    if (aadhaarPhotoLocal) aadhaarPhotoUrl = await uploadImage(aadhaarPhotoLocal, "aadhaar");
    if (panPhotoLocal) panPhotoUrl = await uploadImage(panPhotoLocal, "pan");
    if (chequePhotoLocal) chequePhotoUrl = await uploadImage(chequePhotoLocal, "cheque");
    if (businessDocLocal) businessDocUrl = await uploadImage(businessDocLocal, "business-docs");

    const payload: any = {
      auth_user_id: authUserId,
      phone: phoneValue ? "+91" + phoneValue : null,
      name: name.trim(),
      location: location.trim(),
      email: email.trim(),
      whatsapp_number: whatsapp.trim(),
      user_type: role,
    };

    if (isContractor) {
      payload.skill = skills.join(" · ");
      payload.experience_years = experience ? Number(experience) : null;
      payload.profile_photo_url = profilePhotoUrl;
      payload.aadhaar_number = aadhaarNumber.trim();
      payload.aadhaar_photo_url = aadhaarPhotoUrl;
      payload.pan_number = panNumber.trim();
      payload.pan_photo_url = panPhotoUrl;
      payload.business_name = businessName.trim();
      payload.business_type = businessType[0] || null;
      payload.business_address = businessAddress.trim();
      payload.business_doc_url = businessDocUrl;
      payload.gst_number = gstNumber.trim();
      payload.bank_account_number = bankAccount.trim();
      payload.ifsc_code = ifsc.trim();
      payload.cheque_photo_url = chequePhotoUrl;
      payload.verification_status = "pending";
    }

    const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select()
    .single();
  
  setSubmitting(false);
  
  if (error) {
    Alert.alert("Signup Error", error.message);
    console.log("SIGNUP ERROR:", error.message);
    return;
  }
  
  if (newProfile) {
    setCurrentProfile(newProfile.id, role === "contractor" ? "contractor" : "client");
  }
  
  router.replace(isContractor ? "/verification-pending" : "/customer");
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              onPress={() => (step > 1 ? setStep((s) => s - 1) : router.back())}
            >
              <Ionicons name="arrow-back" size={22} color="#f8fafc" />
            </Pressable>
            <Text style={styles.headerTitle}>
              {isContractor ? `Contractor Signup (${step}/${totalSteps})` : "Complete Your Profile"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {isContractor && (
            <View style={styles.progressRow}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.progressDot, i + 1 <= step && styles.progressDotActive]}
                />
              ))}
            </View>
          )}

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && (
              <>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#64748b"
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Area, city"
                  placeholderTextColor="#64748b"
                  value={location}
                  onChangeText={setLocation}
                />

                {/* Mobile Number — editable+verify if this wasn't the login channel */}
                <Text style={styles.label}>Mobile Number</Text>
                {phoneVerified ? (
                  <View style={[styles.input, styles.disabledInput]}>
                    <Text style={styles.disabledInputText}>+91 {phoneValue || "—"}</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  </View>
                ) : (
                  <View style={styles.verifyRow}>
                    <TextInput
                      style={[styles.input, styles.verifyRowInput]}
                      placeholder="10-digit number"
                      placeholderTextColor="#64748b"
                      value={phoneValue}
                      onChangeText={setPhoneValue}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                    <Pressable
                      style={styles.verifyBtn}
                      onPress={() => handleSendSecondaryOtp("phone")}
                      disabled={otpBusy}
                    >
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    </Pressable>
                  </View>
                )}

                {/* Gmail — editable+verify if this wasn't the login channel */}
                <Text style={styles.label}>Gmail</Text>
                {emailVerified ? (
                  <View style={[styles.input, styles.disabledInput]}>
                    <Text style={styles.disabledInputText}>{email || "—"}</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  </View>
                ) : (
                  <View style={styles.verifyRow}>
                    <TextInput
                      style={[styles.input, styles.verifyRowInput]}
                      placeholder="you@gmail.com"
                      placeholderTextColor="#64748b"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <Pressable
                      style={styles.verifyBtn}
                      onPress={() => handleSendSecondaryOtp("email")}
                      disabled={otpBusy}
                    >
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    </Pressable>
                  </View>
                )}

                <Text style={styles.label}>WhatsApp Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit number"
                  placeholderTextColor="#64748b"
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                {isContractor && (
                  <>
                    <Text style={styles.label}>Skills / Category</Text>
                    <ChipGroup
                      options={SKILLS}
                      selected={skills}
                      onToggle={(v) =>
                        setSkills((prev) =>
                          prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]
                        )
                      }
                    />

                    <Text style={styles.label}>Experience (years)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 5"
                      placeholderTextColor="#64748b"
                      value={experience}
                      onChangeText={setExperience}
                      keyboardType="number-pad"
                    />

                    <Text style={styles.label}>Profile Photo</Text>
                    <PhotoPicker
                      label="Upload profile photo"
                      uri={profilePhotoLocal}
                      onPicked={setProfilePhotoLocal}
                    />
                  </>
                )}
              </>
            )}

            {isContractor && step === 2 && (
              <>
                <Text style={styles.stepIntro}>Identity Verification</Text>

                <Text style={styles.label}>Aadhaar Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="XXXX XXXX XXXX"
                  placeholderTextColor="#64748b"
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                  keyboardType="number-pad"
                  maxLength={12}
                />
                <Text style={styles.label}>Aadhaar Card Photo</Text>
                <PhotoPicker label="Upload Aadhaar card" uri={aadhaarPhotoLocal} onPicked={setAadhaarPhotoLocal} />

                <Text style={styles.label}>PAN Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ABCDE1234F"
                  placeholderTextColor="#64748b"
                  value={panNumber}
                  onChangeText={(t) => setPanNumber(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                <Text style={styles.label}>PAN Card Photo</Text>
                <PhotoPicker label="Upload PAN card" uri={panPhotoLocal} onPicked={setPanPhotoLocal} />
              </>
            )}

            {isContractor && step === 3 && (
              <>
                <Text style={styles.stepIntro}>Business Verification</Text>

                <Text style={styles.label}>Business / Shop Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sipra Work"
                  placeholderTextColor="#64748b"
                  value={businessName}
                  onChangeText={setBusinessName}
                />

                <Text style={styles.label}>Business Type</Text>
                <ChipGroup
                  options={BUSINESS_TYPES}
                  selected={businessType}
                  onToggle={(v) => setBusinessType([v])}
                />

                <Text style={styles.label}>Business Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Full business address"
                  placeholderTextColor="#64748b"
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  multiline
                />

                {needsBusinessDoc && (
                  <>
                    <Text style={styles.label}>Business Registration Document</Text>
                    <Text style={styles.helperText}>
                      Upload your {businessType[0]} registration certificate / partnership deed / incorporation proof.
                    </Text>
                    <PhotoPicker
                      label="Upload business registration document"
                      uri={businessDocLocal}
                      onPicked={setBusinessDocLocal}
                    />
                  </>
                )}
              </>
            )}

            {isContractor && step === 4 && (
              <>
                <Text style={styles.stepIntro}>GST & Payment Details (optional)</Text>

                <Text style={styles.label}>GST Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Leave blank if not registered"
                  placeholderTextColor="#64748b"
                  value={gstNumber}
                  onChangeText={(t) => setGstNumber(t.toUpperCase())}
                  autoCapitalize="characters"
                />

                <Text style={styles.label}>Bank Account Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Account number"
                  placeholderTextColor="#64748b"
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  keyboardType="number-pad"
                />

                <Text style={styles.label}>IFSC Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor="#64748b"
                  value={ifsc}
                  onChangeText={(t) => setIfsc(t.toUpperCase())}
                  autoCapitalize="characters"
                />

                <Text style={styles.label}>Cancelled Cheque / Passbook Photo</Text>
                <PhotoPicker label="Upload cheque photo" uri={chequePhotoLocal} onPicked={setChequePhotoLocal} />
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.bottomBar}>
            {isContractor && (
              <Pressable style={styles.skipBtn} onPress={handleSkip} disabled={submitting}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.nextBtnWrap, submitting && { opacity: 0.7 }]}
              onPress={step < totalSteps ? handleNext : handleSubmit}
              disabled={submitting}
            >
              <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.nextBtn}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nextBtnText}>
                    {step < totalSteps ? "Next" : "Finish"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Inline OTP verification modal for the secondary channel */}
      <Modal visible={otpModalFor !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Verify your {otpModalFor === "phone" ? "mobile number" : "email"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter the code sent to {otpModalFor === "phone" ? "+91 " + phoneValue : email}
            </Text>
            <TextInput
              style={styles.modalOtpInput}
              placeholder="Enter OTP"
              placeholderTextColor="#64748b"
              value={secondaryOtp}
              onChangeText={setSecondaryOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => {
                  setOtpModalFor(null);
                  setSecondaryOtp("");
                }}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmBtn}
                onPress={handleConfirmSecondaryOtp}
                disabled={otpBusy}
              >
                {otpBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  flex: { flex: 1 },
  glowGreen: { position: "absolute", top: -80, right: -50, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(34, 197, 94, 0.1)" },
  glowBlue: { position: "absolute", bottom: 80, left: -70, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(59, 130, 246, 0.08)" },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30, 41, 59, 0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#f8fafc" },
  headerSpacer: { width: 40 },
  progressRow: { flexDirection: "row", gap: 6, paddingHorizontal: 20, marginBottom: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#1e293b" },
  progressDotActive: { backgroundColor: "#22c55e" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  stepIntro: { fontSize: 18, fontWeight: "700", color: "#f8fafc", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  helperText: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  input: { backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#f8fafc", borderWidth: 1, borderColor: "#1e293b" },
  disabledInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: 0.85 },
  disabledInputText: { fontSize: 16, color: "#94a3b8" },
  textArea: { minHeight: 90, paddingTop: 14, textAlignVertical: "top" },
  verifyRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  verifyRowInput: { flex: 1 },
  verifyBtn: { backgroundColor: "#2563eb", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  verifyBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: "rgba(30, 41, 59, 0.6)", borderWidth: 1, borderColor: "#1e293b" },
  chipActive: { backgroundColor: "rgba(34, 197, 94, 0.2)", borderColor: "#22c55e" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
  chipTextActive: { color: "#22c55e" },
  photoPicker: { height: 120, borderRadius: 14, backgroundColor: "rgba(30, 41, 59, 0.5)", borderWidth: 1, borderColor: "#1e293b", borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoPickerText: { marginTop: 8, fontSize: 13, color: "#64748b", fontWeight: "500" },
  photoPreview: { width: "100%", height: "100%" },
  bottomBar: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#1e293b", backgroundColor: "rgba(15, 23, 42, 0.95)" },
  skipBtn: { paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontSize: 15, fontWeight: "600", color: "#64748b" },
  nextBtnWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  nextBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 14 },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", backgroundColor: "#0f172a", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "#1e293b" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc", marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: "#94a3b8", marginBottom: 20 },
  modalOtpInput: { backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, color: "#f8fafc", borderWidth: 1, borderColor: "#1e293b", textAlign: "center", letterSpacing: 4, marginBottom: 20 },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(30, 41, 59, 0.7)", borderWidth: 1, borderColor: "#1e293b" },
  modalCancelBtnText: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#22c55e" },
  modalConfirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
