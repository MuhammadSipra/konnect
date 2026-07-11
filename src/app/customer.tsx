import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  TextInput,
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

type Category = (typeof CATEGORIES)[number];

const CONTRACTORS = [
  {
    id: "1",
    name: "Rajesh Kumar",
    skill: "Civil Contractor · Full Project",
    rating: 4.8,
    reviews: 127,
    distance: "1.2 km",
  },
  {
    id: "2",
    name: "Amit Patel",
    skill: "Interior Designer · Full Project",
    rating: 4.9,
    reviews: 89,
    distance: "2.4 km",
  },
  {
    id: "3",
    name: "Suresh Reddy",
    skill: "Electrical & Plumbing · Full Project",
    rating: 4.7,
    reviews: 203,
    distance: "3.1 km",
  },
];

export default function CustomerDashboard() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("Full Project");

  const displayList = CONTRACTORS.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.skill.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0f172a", "#020617", "#0a0f1a"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>Find Contractors</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for contractors..."
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              const isFullProject = cat === "Full Project";
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.chip,
                    active && styles.chipActive,
                    isFullProject && active && styles.chipFullProjectActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                      isFullProject && active && styles.chipFullProjectText,
                    ]}
                  >
                    {isFullProject ? "Full Project ⭐" : cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Contractors</Text>
            <Text style={styles.sectionCount}>{displayList.length} found</Text>
          </View>
          {displayList.map((contractor) => (
            <ContractorCard key={contractor.id} contractor={contractor} />
          ))}
          {displayList.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color="#475569" />
              <Text style={styles.emptyText}>No contractors found</Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
        <View style={styles.bottomCtaWrap}>
          <SafeAreaView edges={["bottom"]}>
            <Pressable
              style={({ pressed }) => [styles.postBtnWrap, pressed && styles.pressed]}
              onPress={() => router.push("/post-project")}

            >
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.postBtn}
              >
                <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
                <Text style={styles.postBtnText}>Post a Project</Text>
              </LinearGradient>
            </Pressable>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ContractorCard({ contractor }: { contractor: (typeof CONTRACTORS)[0] }) {
  const router = useRouter();
  const initials = contractor.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => router.push("/contractor-detail")}>
      <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </LinearGradient>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{contractor.name}</Text>
        <Text style={styles.cardSkill}>{contractor.skill}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text style={styles.ratingText}>{contractor.rating}</Text>
            <Text style={styles.reviewText}>({contractor.reviews})</Text>
          </View>
          <View style={styles.distanceRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.distanceText}>{contractor.distance}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#475569" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  glowGreen: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(34, 197, 94, 0.1)" },
  glowBlue: { position: "absolute", bottom: 120, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(59, 130, 246, 0.08)" },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30, 41, 59, 0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc", letterSpacing: -0.3 },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#1e293b", marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 16, color: "#f8fafc", padding: 0 },
  categories: { gap: 10, paddingBottom: 4, marginBottom: 24 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: "rgba(30, 41, 59, 0.6)", borderWidth: 1, borderColor: "#1e293b" },
  chipActive: { backgroundColor: "rgba(59, 130, 246, 0.2)", borderColor: "#3b82f6" },
  chipFullProjectActive: { backgroundColor: "rgba(251, 191, 36, 0.15)", borderColor: "#fbbf24" },
  chipText: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },
  chipTextActive: { color: "#60a5fa" },
  chipFullProjectText: { color: "#fbbf24" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#f1f5f9" },
  sectionCount: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30, 41, 59, 0.6)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1e293b", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#f8fafc" },
  cardSkill: { marginTop: 4, fontSize: 14, color: "#94a3b8", fontWeight: "500" },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 14, fontWeight: "700", color: "#fbbf24" },
  reviewText: { fontSize: 12, color: "#64748b" },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  distanceText: { fontSize: 12, color: "#64748b" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, color: "#64748b" },
  bottomCtaWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: "rgba(15, 23, 42, 0.95)", borderTopWidth: 1, borderTopColor: "#1e293b" },
  postBtnWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 8 },
  postBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16 },
  postBtnText: { fontSize: 18, fontWeight: "700", color: "#ffffff", letterSpacing: -0.2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});