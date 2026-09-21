import { Ionicons } from "@expo/vector-icons";
import { OTPWidget } from "@msg91comm/sendotp-react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { setCurrentProfile } from "../lib/currentProfile";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";

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
  colors,
}: {
  label: string;
  uri: string | null;
  onPicked: (localUri: string) => void;
  colors: any;
}) {
  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      AppAlert.show("Permission needed", "Please allow photo access to upload this document.");
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
    <Pressable style={[styles.photoPicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handlePick}>
      {uri ? (
        <Image source={{ uri }} style={styles.photoPreview} />
      ) : (
        <>
          <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
          <Text style={[styles.photoPickerText, { color: colors.textMuted }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
  colors,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
  colors: any;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => onToggle(option)}
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              active && { backgroundColor: colors.green + '33', borderColor: colors.green },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.textSecondary }, active && { color: colors.green }]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
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
      AppAlert.show("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    if (channel === "email" && !email.includes("@")) {
      AppAlert.show("Invalid email", "Enter a valid email address.");
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
        AppAlert.show("Error", "Could not send OTP. Please try again.");
      }
    } catch (err) {
      AppAlert.show("Error", "Could not send OTP. Please try again.");
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
        AppAlert.show("Invalid Code", "The OTP you entered is incorrect or expired.");
      }
    } catch (err) {
      AppAlert.show("Error", "Verification failed. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !step1Valid) {
      AppAlert.show("Missing info", "Please fill at least your name and location.");
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
    AppAlert.show("Signup Error", error.message);
    console.log("SIGNUP ERROR:", error.message);
    return;
  }
  
  if (newProfile) {
    setCurrentProfile(newProfile.id, role === "contractor" ? "contractor" : "client");
  }
  
  router.replace(isContractor ? "/verification-pending" : "/customer");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
              onPress={() => (step > 1 ? setStep((s) => s - 1) : router.back())}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {isContractor ? `Contractor Signup (${step}/${totalSteps})` : "Complete Your Profile"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {isContractor && (
            <View style={styles.progressRow}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.progressDot, { backgroundColor: colors.border }, i + 1 <= step && { backgroundColor: colors.green }]}
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
                <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>Location</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Area, city"
                  placeholderTextColor={colors.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />

                {/* Mobile Number — editable+verify if this wasn't the login channel */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Mobile Number</Text>
                {phoneVerified ? (
                  <View style={[styles.input, styles.disabledInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.disabledInputText, { color: colors.textSecondary }]}>+91 {phoneValue || "—"}</Text>
                    <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                  </View>
                ) : (
                  <View style={styles.verifyRow}>
                    <TextInput
                      style={[styles.input, styles.verifyRowInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="10-digit number"
                      placeholderTextColor={colors.textMuted}
                      value={phoneValue}
                      onChangeText={setPhoneValue}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                    <Pressable
                      style={[styles.verifyBtn, { backgroundColor: colors.blueDark }]}
                      onPress={() => handleSendSecondaryOtp("phone")}
                      disabled={otpBusy}
                    >
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    </Pressable>
                  </View>
                )}

                {/* Gmail — editable+verify if this wasn't the login channel */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Gmail</Text>
                {emailVerified ? (
                  <View style={[styles.input, styles.disabledInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.disabledInputText, { color: colors.textSecondary }]}>{email || "—"}</Text>
                    <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                  </View>
                ) : (
                  <View style={styles.verifyRow}>
                    <TextInput
                      style={[styles.input, styles.verifyRowInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="you@gmail.com"
                      placeholderTextColor={colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <Pressable
                      style={[styles.verifyBtn, { backgroundColor: colors.blueDark }]}
                      onPress={() => handleSendSecondaryOtp("email")}
                      disabled={otpBusy}
                    >
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    </Pressable>
                  </View>
                )}

                <Text style={[styles.label, { color: colors.textMuted }]}>WhatsApp Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="10-digit number"
                  placeholderTextColor={colors.textMuted}
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                {isContractor && (
                  <>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Skills / Category</Text>
                    <ChipGroup
                      options={SKILLS}
                      selected={skills}
                      onToggle={(v) =>
                        setSkills((prev) =>
                          prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]
                        )
                      }
                      colors={colors}
                    />

                    <Text style={[styles.label, { color: colors.textMuted }]}>Experience (years)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder="e.g. 5"
                      placeholderTextColor={colors.textMuted}
                      value={experience}
                      onChangeText={setExperience}
                      keyboardType="number-pad"
                    />

                    <Text style={[styles.label, { color: colors.textMuted }]}>Profile Photo</Text>
                    <PhotoPicker
                      label="Upload profile photo"
                      uri={profilePhotoLocal}
                      onPicked={setProfilePhotoLocal}
                      colors={colors}
                    />
                  </>
                )}
              </>
            )}

            {isContractor && step === 2 && (
              <>
                <Text style={[styles.stepIntro, { color: colors.textPrimary }]}>Identity Verification</Text>

                <Text style={[styles.label, { color: colors.textMuted }]}>Aadhaar Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="XXXX XXXX XXXX"
                  placeholderTextColor={colors.textMuted}
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                  keyboardType="number-pad"
                  maxLength={12}
                />
                <Text style={[styles.label, { color: colors.textMuted }]}>Aadhaar Card Photo</Text>
                <PhotoPicker label="Upload Aadhaar card" uri={aadhaarPhotoLocal} onPicked={setAadhaarPhotoLocal} colors={colors} />

                <Text style={[styles.label, { color: colors.textMuted }]}>PAN Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="ABCDE1234F"
                  placeholderTextColor={colors.textMuted}
                  value={panNumber}
                  onChangeText={(t) => setPanNumber(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                <Text style={[styles.label, { color: colors.textMuted }]}>PAN Card Photo</Text>
                <PhotoPicker label="Upload PAN card" uri={panPhotoLocal} onPicked={setPanPhotoLocal} colors={colors} />
              </>
            )}

            {isContractor && step === 3 && (
              <>
                <Text style={[styles.stepIntro, { color: colors.textPrimary }]}>Business Verification</Text>

                <Text style={[styles.label, { color: colors.textMuted }]}>Business / Shop Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Sipra Work"
                  placeholderTextColor={colors.textMuted}
                  value={businessName}
                  onChangeText={setBusinessName}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>Business Type</Text>
                <ChipGroup
                  options={BUSINESS_TYPES}
                  selected={businessType}
                  onToggle={(v) => setBusinessType([v])}
                  colors={colors}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>Business Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Full business address"
                  placeholderTextColor={colors.textMuted}
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  multiline
                />

                {needsBusinessDoc && (
                  <>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Business Registration Document</Text>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>
                      Upload your {businessType[0]} registration certificate / partnership deed / incorporation proof.
                    </Text>
                    <PhotoPicker
                      label="Upload business registration document"
                      uri={businessDocLocal}
                      onPicked={setBusinessDocLocal}
                      colors={colors}
                    />
                  </>
                )}
              </>
            )}

            {isContractor && step === 4 && (
              <>
                <Text style={[styles.stepIntro, { color: colors.textPrimary }]}>GST & Payment Details (optional)</Text>

                <Text style={[styles.label, { color: colors.textMuted }]}>GST Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Leave blank if not registered"
                  placeholderTextColor={colors.textMuted}
                  value={gstNumber}
                  onChangeText={(t) => setGstNumber(t.toUpperCase())}
                  autoCapitalize="characters"
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>Bank Account Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Account number"
                  placeholderTextColor={colors.textMuted}
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  keyboardType="number-pad"
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>IFSC Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor={colors.textMuted}
                  value={ifsc}
                  onChangeText={(t) => setIfsc(t.toUpperCase())}
                  autoCapitalize="characters"
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>Cancelled Cheque / Passbook Photo</Text>
                <PhotoPicker label="Upload cheque photo" uri={chequePhotoLocal} onPicked={setChequePhotoLocal} colors={colors} />
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            {isContractor && (
              <Pressable style={styles.skipBtn} onPress={handleSkip} disabled={submitting}>
                <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.nextBtnWrap, submitting && { opacity: 0.7 }]}
              onPress={step < totalSteps ? handleNext : handleSubmit}
              disabled={submitting}
            >
              <LinearGradient colors={[colors.green, colors.greenDark]} style={styles.nextBtn}>
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
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Verify your {otpModalFor === "phone" ? "mobile number" : "email"}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter the code sent to {otpModalFor === "phone" ? "+91 " + phoneValue : email}
            </Text>
            <TextInput
              style={[styles.modalOtpInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Enter OTP"
              placeholderTextColor={colors.textMuted}
              value={secondaryOtp}
              onChangeText={setSecondaryOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalCancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setOtpModalFor(null);
                  setSecondaryOtp("");
                }}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: colors.green }]}
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
  root: { flex: 1 },
  flex: { flex: 1 },
  glowGreen: { position: "absolute", top: -80, right: -50, width: 260, height: 260, borderRadius: 130 },
  glowBlue: { position: "absolute", bottom: 80, left: -70, width: 280, height: 280, borderRadius: 140 },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  headerSpacer: { width: 40 },
  progressRow: { flexDirection: "row", gap: 6, paddingHorizontal: 20, marginBottom: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  stepIntro: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  helperText: { fontSize: 12, marginBottom: 8 },
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1 },
  disabledInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: 0.85 },
  disabledInputText: { fontSize: 16 },
  textArea: { minHeight: 90, paddingTop: 14, textAlignVertical: "top" },
  verifyRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  verifyRowInput: { flex: 1 },
  verifyBtn: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  verifyBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  photoPicker: { height: 120, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoPickerText: { marginTop: 8, fontSize: 13, fontWeight: "500" },
  photoPreview: { width: "100%", height: "100%" },
  bottomBar: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  skipBtn: { paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontSize: 15, fontWeight: "600" },
  nextBtnWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  nextBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 14 },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", borderRadius: 20, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  modalSubtitle: { fontSize: 13, marginBottom: 20 },
  modalOtpInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, borderWidth: 1, textAlign: "center", letterSpacing: 4, marginBottom: 20 },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  modalCancelBtnText: { fontSize: 14, fontWeight: "600" },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalConfirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});