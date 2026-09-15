import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  "Full Project", "Interior", "Civil", "Electrical", "Plumbing", "Carpentry",
] as const;

type Category = (typeof CATEGORIES)[number];

const TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "/customer" },
  { key: "projects", label: "My Projects", icon: "folder" as const, route: "/my-projects" },
  { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
];

export default function CustomerDashboard() {
  const router = useRouter();
  const [contractors, setContractors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("Full Project");

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .ilike('user_type', 'contractor')
      .then(({ data, error }) => {
        console.log('CONTRACTORS:', data, 'ERROR:', error);
        if (data) setContractors(data);
      });
  }, []);
  const handleExitApp = () => {
    Alert.alert(
      "Exit Konnect?",
      "Are you sure you want to exit the app?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleExitApp();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const displayList = contractors.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.skill?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={handleExitApp}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>Find Contractors</Text>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.push('/post-project' as never)}
          >
            <Ionicons name="add" size={24} color="#f8fafc" />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              const isFullProject = cat === "Full Project";
              return (
                <Pressable key={cat} onPress={() => setActiveCategory(cat)} style={[styles.chip, active && styles.chipActive, isFullProject && active && styles.chipFullProjectActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive, isFullProject && active && styles.chipFullProjectText]}>
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

        {/* Bottom Tab Bar */}
        <View style={styles.tabBarWrap}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.tabBar}>
              {TABS.map((tab) => {
                const active = tab.key === "home";
                return (
                  <Pressable
                    key={tab.key}
                    style={styles.tabItem}
                    onPress={() => {
                      if (tab.key === "home") return;
                      router.replace(tab.route as never);
                    }}
                  >
                    <Ionicons
                      name={active ? tab.icon : (`${tab.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                      size={22}
                      color={active ? "#22c55e" : "#64748b"}
                    />
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ContractorCard({ contractor }: { contractor: any }) {
  const router = useRouter();
  const initials = contractor.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?";
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => router.push(`/contractor-detail?id=${contractor.id}` as never)}>
      {contractor.profile_photo_url ? (
  <Image source={{ uri: contractor.profile_photo_url }} style={styles.avatarImage} />
) : (
  <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.avatar}>
    <Text style={styles.avatarText}>{initials}</Text>
  </LinearGradient>
)}
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{contractor.name}</Text>
        <Text style={styles.cardSkill}>{contractor.skill}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text style={styles.ratingText}>{contractor.rating || '4.8'}</Text>
            <Text style={styles.reviewText}>({contractor.reviews || 0})</Text>
          </View>
          <View style={styles.distanceRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.distanceText}>{contractor.location || 'Mumbai'}</Text>
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
  tabBarWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  tabBar: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  tabLabelActive: {
    color: "#22c55e",
  },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});