import { Ionicons } from "@expo/vector-icons";
import { OTPWidget } from "@msg91comm/sendotp-react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    Image,
    Modal,
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
import { getCurrentProfileId, getCurrentRole } from "../lib/currentProfile";
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
    const { error } = await supabase.storage.from("documents").upload(fileName, arrayBuffer, { contentType: blob.type || "image/jpeg" });
    if (error) return null;
    const { data } = supabase.storage.from("documents").getPublicUrl(fileName);
    return data.publicUrl;
  } catch {
    return null;
  }
}

function PhotoPicker({ label, uri, onPicked, colors }: { label: string; uri: string | null; onPicked: (u: string) => void; colors: any }) {
  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      AppAlert.show("Permission needed", "Please allow photo access to upload this document.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets[0]) onPicked(result.assets[0].uri);
  };

  return (
    <Pressable style={[styles.photoPicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handlePick}>
      {uri ? (
        <Image source={{ uri }} style={styles.photoPreview} />
      ) : (
        <>
          <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
          <Text style={[styles.photoPickerText, { color: colors.textMuted }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function ChipGroup<T extends string>({ options, selected, onToggle, colors }: { options: readonly T[]; selected: T[]; onToggle: (v: T) => void; colors: any }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => onToggle(option)}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, active && { backgroundColor: colors.green + '33', borderColor: colors.green }]}
          >
            <Text style={[styles.chipText, { color: colors.textSecondary }, active && { color: colors.green }]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

async function resolveMyIdentity(): Promise<{ id: number; role: string } | null> {
  const cachedId = getCurrentProfileId();
  const cachedRole = getCurrentRole();
  if (cachedId && cachedRole) return { id: cachedId, role: cachedRole };
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData?.session?.user?.id;
  if (!authUserId) return null;
  const { data: profileRow } = await supabase.from('profiles').select('id, user_type').eq('auth_user_id', authUserId).maybeSingle();
  if (profileRow) return { id: profileRow.id, role: profileRow.user_type };
  return null;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();

  const [role, setRole] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [profilePhotoLocal, setProfilePhotoLocal] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [savingSafe, setSavingSafe] = useState(false);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);
  const [otpModalFor, setOtpModalFor] = useState<"phone" | "email" | null>(null);
  const [verifyReqId, setVerifyReqId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarPhotoLocal, setAadhaarPhotoLocal] = useState<string | null>(null);
  const [aadhaarPhotoUrl, setAadhaarPhotoUrl] = useState<string | null>(null);
  const [panNumber, setPanNumber] = useState("");
  const [panPhotoLocal, setPanPhotoLocal] = useState<string | null>(null);
  const [panPhotoUrl, setPanPhotoUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<string[]>([]);
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDocLocal, setBusinessDocLocal] = useState<string | null>(null);
  const [businessDocUrl, setBusinessDocUrl] = useState<string | null>(null);
  const [gstNumber, setGstNumber] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [chequePhotoLocal, setChequePhotoLocal] = useState<string | null>(null);
  const [chequePhotoUrl, setChequePhotoUrl] = useState<string | null>(null);
  const [savingSensitive, setSavingSensitive] = useState(false);

  const isContractor = role === 'contractor';

  useEffect(() => {
    const load = async () => {
      const identity = await resolveMyIdentity();
      if (!identity) { setLoading(false); return; }
      setRole(identity.role);
      setProfileId(identity.id);

      const { data } = await supabase.from('profiles').select('*').eq('id', identity.id).single();
      if (data) {
        setName(data.name || "");
        setLocation(data.location || "");
        setWhatsapp(data.whatsapp_number || "");
        setSkills(data.skill ? data.skill.split(" · ").filter(Boolean) : []);
        setExperience(data.experience_years ? String(data.experience_years) : "");
        setProfilePhotoUrl(data.profile_photo_url || null);

        setPhone((data.phone || "").replace("+91", ""));
        setOriginalPhone((data.phone || "").replace("+91", ""));
        setEmail(data.email || "");
        setOriginalEmail(data.email || "");

        setAadhaarNumber(data.aadhaar_number || "");
        setAadhaarPhotoUrl(data.aadhaar_photo_url || null);
        setPanNumber(data.pan_number || "");
        setPanPhotoUrl(data.pan_photo_url || null);
        setBusinessName(data.business_name || "");
        setBusinessType(data.business_type ? [data.business_type] : []);
        setBusinessAddress(data.business_address || "");
        setBusinessDocUrl(data.business_doc_url || null);
        setGstNumber(data.gst_number || "");
        setBankAccount(data.bank_account_number || "");
        setIfsc(data.ifsc_code || "");
        setChequePhotoUrl(data.cheque_photo_url || null);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const onBackPress = () => { router.back(); return true; };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const handlePhoneChange = (v: string) => {
    setPhone(v);
    setPhoneVerified(v === originalPhone);
  };
  const handleEmailChange = (v: string) => {
    setEmail(v);
    setEmailVerified(v === originalEmail);
  };

  const handleSendOtp = async (channel: "phone" | "email") => {
    if (channel === "phone" && phone.replace(/\D/g, "").length !== 10) {
      AppAlert.show("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    if (channel === "email" && !email.includes("@")) {
      AppAlert.show("Invalid email", "Enter a valid email address.");
      return;
    }
    const identifier = channel === "phone" ? "91" + phone.replace(/\D/g, "").slice(-10) : email.trim();
    setOtpBusy(true);
    try {
      const response = await OTPWidget.sendOTP({ identifier });
      if (response.type === "success") {
        setVerifyReqId(response.message);
        setOtpModalFor(channel);
        setOtpInput("");
      } else {
        AppAlert.show("Error", "Could not send OTP. Please try again.");
      }
    } catch {
      AppAlert.show("Error", "Could not send OTP. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!verifyReqId || otpInput.length < 4 || !otpModalFor) return;
    setOtpBusy(true);
    try {
      const response = await OTPWidget.verifyOTP({ reqId: verifyReqId, otp: otpInput });
      if (response.type === "success") {
        if (otpModalFor === "phone") setPhoneVerified(true);
        if (otpModalFor === "email") setEmailVerified(true);
        setOtpModalFor(null);
        setOtpInput("");
      } else {
        AppAlert.show("Invalid Code", "The OTP you entered is incorrect or expired.");
      }
    } catch {
      AppAlert.show("Error", "Verification failed. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleSaveSafe = async () => {
    if (!profileId) return;
    setSavingSafe(true);

    let newPhotoUrl = profilePhotoUrl;
    if (profilePhotoLocal) {
      const uploaded = await uploadImage(profilePhotoLocal, "profile-photos");
      if (uploaded) newPhotoUrl = uploaded;
    }

    const payload: any = { name: name.trim(), location: location.trim(), whatsapp_number: whatsapp.trim() };
    if (isContractor) {
      payload.skill = skills.join(" · ");
      payload.experience_years = experience ? Number(experience) : null;
      payload.profile_photo_url = newPhotoUrl;
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', profileId);
    setSavingSafe(false);

    if (error) { AppAlert.show("Error", error.message); return; }
    setProfilePhotoUrl(newPhotoUrl);
    setProfilePhotoLocal(null);
    AppAlert.show("Saved", "Your profile has been updated.");
  };

  const handleSaveContact = async () => {
    if (!profileId) return;
    const phoneChanged = phone !== originalPhone;
    const emailChanged = email !== originalEmail;
    if (!phoneChanged && !emailChanged) return;
    if (phoneChanged && !phoneVerified) { AppAlert.show("Verify Required", "Please verify your new phone number before saving."); return; }
    if (emailChanged && !emailVerified) { AppAlert.show("Verify Required", "Please verify your new email before saving."); return; }

    setSavingContact(true);
    const payload: any = {};
    if (phoneChanged) payload.phone = "+91" + phone.replace(/\D/g, "").slice(-10);
    if (emailChanged) payload.email = email.trim();
    if (isContractor) payload.verification_status = 'pending';

    const { error } = await supabase.from('profiles').update(payload).eq('id', profileId);
    setSavingContact(false);

    if (error) { AppAlert.show("Error", error.message); return; }

    if (isContractor) {
      AppAlert.show("Submitted for Review", "Your contact details were updated. Our team will re-verify your account shortly.", [
        { text: "OK", onPress: () => router.replace('/verification-pending') },
      ]);
    } else {
      setOriginalPhone(phone);
      setOriginalEmail(email);
      AppAlert.show("Saved", "Your contact details have been updated.");
    }
  };

  const handleSaveSensitive = async () => {
    if (!profileId) return;
    setSavingSensitive(true);

    let newAadhaarUrl = aadhaarPhotoUrl;
    let newPanUrl = panPhotoUrl;
    let newBusinessDocUrl = businessDocUrl;
    let newChequeUrl = chequePhotoUrl;

    if (aadhaarPhotoLocal) { const u = await uploadImage(aadhaarPhotoLocal, "aadhaar"); if (u) newAadhaarUrl = u; }
    if (panPhotoLocal) { const u = await uploadImage(panPhotoLocal, "pan"); if (u) newPanUrl = u; }
    if (businessDocLocal) { const u = await uploadImage(businessDocLocal, "business-docs"); if (u) newBusinessDocUrl = u; }
    if (chequePhotoLocal) { const u = await uploadImage(chequePhotoLocal, "cheque"); if (u) newChequeUrl = u; }

    const payload: any = {
      aadhaar_number: aadhaarNumber.trim(),
      aadhaar_photo_url: newAadhaarUrl,
      pan_number: panNumber.trim(),
      pan_photo_url: newPanUrl,
      business_name: businessName.trim(),
      business_type: businessType[0] || null,
      business_address: businessAddress.trim(),
      business_doc_url: newBusinessDocUrl,
      gst_number: gstNumber.trim(),
      bank_account_number: bankAccount.trim(),
      ifsc_code: ifsc.trim(),
      cheque_photo_url: newChequeUrl,
      verification_status: 'pending',
    };

    const { error } = await supabase.from('profiles').update(payload).eq('id', profileId);
    setSavingSensitive(false);

    if (error) { AppAlert.show("Error", error.message); return; }

    AppAlert.show("Submitted for Review", "Your business/KYC details were updated. Our team will re-verify your account shortly.", [
      { text: "OK", onPress: () => router.replace('/verification-pending') },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.green} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Info</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isContractor && (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>Profile Photo</Text>
                <PhotoPicker label="Upload profile photo" uri={profilePhotoLocal || profilePhotoUrl} onPicked={setProfilePhotoLocal} colors={colors} />
              </>
            )}
            <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={name} onChangeText={setName} placeholderTextColor={colors.textMuted} />
            <Text style={[styles.label, { color: colors.textMuted }]}>Location</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={location} onChangeText={setLocation} placeholderTextColor={colors.textMuted} />
            <Text style={[styles.label, { color: colors.textMuted }]}>WhatsApp Number</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" maxLength={10} placeholderTextColor={colors.textMuted} />
            {isContractor && (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>Skills / Category</Text>
                <ChipGroup options={SKILLS} selected={skills} onToggle={(v) => setSkills((prev) => prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v])} colors={colors} />
                <Text style={[styles.label, { color: colors.textMuted }]}>Experience (years)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={experience} onChangeText={setExperience} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />
              </>
            )}
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.green }]} onPress={handleSaveSafe} disabled={savingSafe}>
              {savingSafe ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Phone & Email</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isContractor && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.gold} />
                <Text style={[styles.warningText, { color: colors.gold }]}>Changing these will require re-verification by our team before your account is active again.</Text>
              </View>
            )}
            <Text style={[styles.label, { color: colors.textMuted }]}>Mobile Number</Text>
            <View style={styles.verifyRow}>
              <TextInput style={[styles.input, styles.verifyRowInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={phone} onChangeText={handlePhoneChange} keyboardType="phone-pad" maxLength={10} placeholderTextColor={colors.textMuted} />
              {phoneVerified ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.green} style={{ marginLeft: 8 }} />
              ) : (
                <Pressable style={[styles.verifyBtn, { backgroundColor: colors.blueDark }]} onPress={() => handleSendOtp("phone")} disabled={otpBusy}>
                  <Text style={styles.verifyBtnText}>Verify</Text>
                </Pressable>
              )}
            </View>
            <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
            <View style={styles.verifyRow}>
              <TextInput style={[styles.input, styles.verifyRowInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={email} onChangeText={handleEmailChange} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.textMuted} />
              {emailVerified ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.green} style={{ marginLeft: 8 }} />
              ) : (
                <Pressable style={[styles.verifyBtn, { backgroundColor: colors.blueDark }]} onPress={() => handleSendOtp("email")} disabled={otpBusy}>
                  <Text style={styles.verifyBtnText}>Verify</Text>
                </Pressable>
              )}
            </View>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.blue }]} onPress={handleSaveContact} disabled={savingContact}>
              {savingContact ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Contact Info</Text>}
            </Pressable>
          </View>

          {isContractor && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>KYC, Business & Bank</Text>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.gold} />
                  <Text style={[styles.warningText, { color: colors.gold }]}>Any change here will require re-verification by our team before your account is active again.</Text>
                </View>

                <Text style={[styles.subHeading, { color: colors.textPrimary }]}>Identity</Text>
                <Text style={[styles.label, { color: colors.textMuted }]}>Aadhaar Number</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={aadhaarNumber} onChangeText={setAadhaarNumber} keyboardType="number-pad" maxLength={12} placeholderTextColor={colors.textMuted} />
                <Text style={[styles.label, { color: colors.textMuted }]}>Aadhaar Card Photo</Text>
                <PhotoPicker label="Upload Aadhaar card" uri={aadhaarPhotoLocal || aadhaarPhotoUrl} onPicked={setAadhaarPhotoLocal} colors={colors} />

                <Text style={[styles.label, { color: colors.textMuted }]}>PAN Number</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={panNumber} onChangeText={(t) => setPanNumber(t.toUpperCase())} autoCapitalize="characters" maxLength={10} placeholderTextColor={colors.textMuted} />
                <Text style={[styles.label, { color: colors.textMuted }]}>PAN Card Photo</Text>
                <PhotoPicker label="Upload PAN card" uri={panPhotoLocal || panPhotoUrl} onPicked={setPanPhotoLocal} colors={colors} />

                <Text style={[styles.subHeading, { color: colors.textPrimary }]}>Business</Text>
                <Text style={[styles.label, { color: colors.textMuted }]}>Business / Shop Name</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={businessName} onChangeText={setBusinessName} placeholderTextColor={colors.textMuted} />
                <Text style={[styles.label, { color: colors.textMuted }]}>Business Type</Text>
                <ChipGroup options={BUSINESS_TYPES} selected={businessType} onToggle={(v) => setBusinessType([v])} colors={colors} />
                <Text style={[styles.label, { color: colors.textMuted }]}>Business Address</Text>
                <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={businessAddress} onChangeText={setBusinessAddress} multiline placeholderTextColor={colors.textMuted} />
                {businessType[0] && businessType[0] !== "Individual" && (
                  <>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Business Registration Document</Text>
                    <PhotoPicker label="Upload business document" uri={businessDocLocal || businessDocUrl} onPicked={setBusinessDocLocal} colors={colors} />
                  </>
                )}

                <Text style={[styles.subHeading, { color: colors.textPrimary }]}>GST & Bank (optional)</Text>
                <Text style={[styles.label, { color: colors.textMuted }]}>GST Number</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={gstNumber} onChangeText={(t) => setGstNumber(t.toUpperCase())} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />
                <Text style={[styles.label, { color: colors.textMuted }]}>Bank Account Number</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={bankAccount} onChangeText={setBankAccount} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />
                <Text style={[styles.label, { color: colors.textMuted }]}>IFSC Code</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} value={ifsc} onChangeText={(t) => setIfsc(t.toUpperCase())} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />
                <Text style={[styles.label, { color: colors.textMuted }]}>Cancelled Cheque Photo</Text>
                <PhotoPicker label="Upload cheque photo" uri={chequePhotoLocal || chequePhotoUrl} onPicked={setChequePhotoLocal} colors={colors} />

                <Pressable style={[styles.saveBtn, { backgroundColor: colors.gold }]} onPress={handleSaveSensitive} disabled={savingSensitive}>
                  {savingSensitive ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save & Submit for Review</Text>}
                </Pressable>
              </View>
            </>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={otpModalFor !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Verify your {otpModalFor === "phone" ? "mobile number" : "email"}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Enter the code sent to {otpModalFor === "phone" ? "+91 " + phone : email}</Text>
            <TextInput style={[styles.modalOtpInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} placeholder="Enter OTP" placeholderTextColor={colors.textMuted} value={otpInput} onChangeText={setOtpInput} keyboardType="number-pad" maxLength={6} autoFocus />
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalCancelBtn, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => { setOtpModalFor(null); setOtpInput(""); }}>
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirmBtn, { backgroundColor: colors.green }]} onPress={handleConfirmOtp} disabled={otpBusy}>
                {otpBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmBtnText}>Confirm</Text>}
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
  safe: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 40, height: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, marginTop: 4 },
  subHeading: { fontSize: 14, fontWeight: "700", marginTop: 16, marginBottom: 4 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  textArea: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  photoPicker: { height: 100, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoPickerText: { marginTop: 6, fontSize: 12, fontWeight: "500" },
  photoPreview: { width: "100%", height: "100%" },
  verifyRow: { flexDirection: "row", alignItems: "center" },
  verifyRowInput: { flex: 1 },
  verifyBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, marginLeft: 8 },
  verifyBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  warningBox: { flexDirection: "row", gap: 8, marginBottom: 8 },
  warningText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },
  saveBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  pressed: { opacity: 0.85 },
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