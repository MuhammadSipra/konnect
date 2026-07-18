import { supabase } from '../lib/supabase';
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  highlightFirst?: boolean;
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
              active && styles.chipActive,
              isFirst && active && styles.chipGoldActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                active && styles.chipTextActive,
                isFirst && active && styles.chipGoldText,
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

export default function PostProjectScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Full Project");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState<Budget>("1L-5L");
  const [location, setLocation] = useState("");
  const [timeline, setTimeline] = useState<Timeline>("flexible");

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    location.trim().length > 0;

    const handlePost = async () => {
      console.log('handlePost called, canSubmit:', canSubmit);
      if (!canSubmit) return;
    
      const { error } = await supabase
        .from('projects')
        .insert({
          title: title.trim(),
          category,
          description: description.trim(),
          budget,
          location: location.trim(),
          timeline,
          client_id: 1,
        });
    
      if (error) {
        console.log('POST ERROR:', error.message);
        return;
      }
    
      console.log('Project posted!');
      router.replace('/customer');
    };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#0f172a", "#020617", "#0a0f1a"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowBlue} />
      <View style={styles.glowGreen} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>Post a Project</Text>
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
            <Text style={styles.label}>Project title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Full kitchen renovation"
              placeholderTextColor="#64748b"
              value={title}
              onChangeText={setTitle}
            />

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <ChipGroup
              options={CATEGORIES}
              value={category}
              onChange={setCategory}
              highlightFirst
            />

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the work needed, materials, size of project…"
              placeholderTextColor="#64748b"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            {/* Budget */}
            <Text style={styles.label}>Budget range</Text>
            <ChipGroup
              options={BUDGET_RANGES}
              value={budget}
              onChange={setBudget}
            />

            {/* Location */}
            <Text style={styles.label}>Location</Text>
            <View style={styles.locationWrap}>
              <Ionicons name="location-outline" size={20} color="#64748b" />
              <TextInput
                style={styles.locationInput}
                placeholder="Area, city — e.g. Andheri West, Mumbai"
                placeholderTextColor="#64748b"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* Timeline */}
            <Text style={styles.label}>Timeline</Text>
            <ChipGroup
              options={TIMELINES}
              value={timeline}
              onChange={setTimeline}
            />

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Post Project button */}
          <View style={styles.bottomCtaWrap}>
            <SafeAreaView edges={["bottom"]}>
              <Pressable
                style={({ pressed }) => [
                  styles.postBtnWrap,
                  !canSubmit && styles.postBtnDisabled,
                  pressed && canSubmit && styles.pressed,
                ]}
                onPress={handlePost}
                disabled={!canSubmit}
              >
                <LinearGradient
                  colors={
                    canSubmit
                      ? ["#3b82f6", "#2563eb"]
                      : ["#334155", "#1e293b"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.postBtn}
                >
                  <Ionicons name="send" size={20} color="#ffffff" />
                  <Text style={styles.postBtnText}>Post Project</Text>
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
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  flex: {
    flex: 1,
  },
  glowBlue: {
    position: "absolute",
    top: -60,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  glowGreen: {
    position: "absolute",
    bottom: 120,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  input: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 20,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  chipRow: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  chipActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "#3b82f6",
  },
  chipGoldActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "#fbbf24",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
  },
  chipTextActive: {
    color: "#60a5fa",
  },
  chipGoldText: {
    color: "#fbbf24",
  },
  locationWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 20,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: "#f8fafc",
    padding: 0,
  },
  bottomCtaWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  postBtnWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  postBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  postBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});