import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  BackHandler,
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
import { getCurrentProfileId, setCurrentProfile } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';
import { useTheme } from "../lib/ThemeContext";
const CATEGORIES = [
  "Full Project",
  "Interior",
  "Civil",
  "Electrical",
  "Plumbing",
  "Carpentry",
] as const;

const BUDGET_RANGES = [
  "Under 1L",
  "1L-5L",
  "5L-10L",
  "10L+",
] as const;

const TIMELINES = ["ASAP", "1 week", "1 month", "flexible"] as const;

type Category = (typeof CATEGORIES)[number];
type Budget = (typeof BUDGET_RANGES)[number];
type Timeline = (typeof TIMELINES)[number];

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  highlightFirst,
  colors,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  highlightFirst?: boolean;
  colors: any;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {options.map((option) => {
        const active = value === option;
        const isFirst = highlightFirst && option === options[0];

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              active && { backgroundColor: colors.blue + '33', borderColor: colors.blue },
              isFirst && active && { backgroundColor: colors.gold + '26', borderColor: colors.gold },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.textSecondary },
                active && { color: colors.blue },
                isFirst && active && { color: colors.gold },
              ]}
            >
              {isFirst && option === "Full Project" ? "Full Project ⭐" : option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Resolve who's logged in — memory first, otherwise fall back to the Supabase session
async function resolveClientId(): Promise<number | null> {
  const cached = getCurrentProfileId();
  if (cached) return cached;

  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData?.session?.user?.id;
  if (!authUserId) return null;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('user_type', 'client')
    .maybeSingle();

  if (profileRow) {
    setCurrentProfile(profileRow.id, 'client');
    return profileRow.id;
  }
  return null;
}

export default function PostProjectScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const { targetContractorId } = useLocalSearchParams<{ targetContractorId?: string }>();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Full Project");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState<Budget>("1L-5L");
  const [location, setLocation] = useState("");
  const [timeline, setTimeline] = useState<Timeline>("flexible");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      router.back();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    location.trim().length > 0;

  const handlePost = async () => {
    if (!canSubmit || posting) return;
    setPosting(true);

    const clientId = await resolveClientId();
    if (!clientId) {
      AppAlert.show("Error", "Please log in again to post a project.");
      setPosting(false);
      return;
    }

    const confirmationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const { error } = await supabase
      .from('projects')
      .insert({
        title: title.trim(),
        category,
        description: description.trim(),
        budget,
        location: location.trim(),
        timeline,
        client_id: clientId,
        confirmation_code: confirmationCode,
        target_contractor_id: targetContractorId ? parseInt(targetContractorId) : null,
      });

    setPosting(false);

    if (error) {
      console.log('POST ERROR:', error.message);
      AppAlert.show("Error", "Could not post your project. Please try again.");
      return;
    }

    console.log('Project posted!');
    router.replace('/customer');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />

      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Post a Project</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Project Title */}
            <Text style={[styles.label, { color: colors.textMuted }]}>Project title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Full kitchen renovation"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Category */}
            <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
            <ChipGroup
              options={CATEGORIES}
              value={category}
              onChange={setCategory}
              highlightFirst
              colors={colors}
            />

            {/* Description */}
            <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe the work needed, materials, size of project…"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            {/* Budget */}
            <Text style={[styles.label, { color: colors.textMuted }]}>Budget range</Text>
            <ChipGroup
              options={BUDGET_RANGES}
              value={budget}
              onChange={setBudget}
              colors={colors}
            />

            {/* Location */}
            <Text style={[styles.label, { color: colors.textMuted }]}>Location</Text>
            <View style={[styles.locationWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.locationInput, { color: colors.textPrimary }]}
                placeholder="Area, city — e.g. Andheri West, Mumbai"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* Timeline */}
            <Text style={[styles.label, { color: colors.textMuted }]}>Timeline</Text>
            <ChipGroup
              options={TIMELINES}
              value={timeline}
              onChange={setTimeline}
              colors={colors}
            />

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Post Project button */}
          <View style={[styles.bottomCtaWrap, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <SafeAreaView edges={["bottom"]}>
              <Pressable
                style={({ pressed }) => [
                  styles.postBtnWrap,
                  (!canSubmit || posting) && styles.postBtnDisabled,
                  pressed && canSubmit && !posting && styles.pressed,
                ]}
                onPress={handlePost}
                disabled={!canSubmit || posting}
              >
                <LinearGradient
                  colors={
                    canSubmit && !posting
                      ? [colors.blue, colors.blueDark]
                      : ["#334155", "#1e293b"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.postBtn}
                >
                  <Ionicons name="send" size={20} color="#ffffff" />
                  <Text style={styles.postBtnText}>{posting ? "Posting..." : "Post Project"}</Text>
                </LinearGradient>
              </Pressable>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  glowBlue: { position: "absolute", top: -60, left: -50, width: 240, height: 240, borderRadius: 120 },
  glowGreen: { position: "absolute", bottom: 120, right: -70, width: 260, height: 260, borderRadius: 130 },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  label: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, marginBottom: 20 },
  textArea: { minHeight: 120, paddingTop: 14 },
  chipRow: { gap: 10, paddingBottom: 4, marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: "600" },
  locationWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, marginBottom: 20 },
  locationInput: { flex: 1, fontSize: 16, padding: 0 },
  bottomCtaWrap: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  postBtnWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 8, shadowColor: "#2563eb", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  postBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  postBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16 },
  postBtnText: { fontSize: 18, fontWeight: "700", color: "#ffffff", letterSpacing: -0.2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});