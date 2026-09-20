import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';

import {
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
import { AppAlert } from '../lib/AppAlert';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

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
  const { colors, mode } = useTheme();
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
    AppAlert.show(
      "Exit Konnect?",
      "Are you sure you want to exit the app?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
      ]
    );
  };
  useEffect(() => {
    const onBackPress = () => {
      handleExitApp();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const displayList = contractors.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.skill?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} onPress={handleExitApp}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Find Contractors</Text>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
            onPress={() => router.push('/post-project' as never)}
          >
            <Ionicons name="add" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search for contractors..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              const isFullProject = cat === "Full Project";
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    active && { backgroundColor: colors.blue + '26', borderColor: colors.blue },
                    isFullProject && active && { backgroundColor: colors.gold + '26', borderColor: colors.gold },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.textSecondary },
                      active && { color: colors.blue },
                      isFullProject && active && { color: colors.gold },
                    ]}
                  >
                    {isFullProject ? "Full Project ⭐" : cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Nearby Contractors</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{displayList.length} found</Text>
          </View>
          {displayList.map((contractor) => (
            <ContractorCard key={contractor.id} contractor={contractor} />
          ))}
          {displayList.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No contractors found</Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Tab Bar */}
        <View style={[styles.tabBarWrap, { backgroundColor: colors.surfaceSolid, borderTopColor: colors.border }]}>
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
                      color={active ? colors.green : colors.textMuted}
                    />
                    <Text style={[styles.tabLabel, { color: active ? colors.green : colors.textMuted }]}>
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
  const { colors } = useTheme();
  const initials = contractor.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?";
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
      onPress={() => router.push(`/contractor-detail?id=${contractor.id}` as never)}
    >
      {contractor.profile_photo_url ? (
        <Image source={{ uri: contractor.profile_photo_url }} style={styles.avatarImage} />
      ) : (
        <LinearGradient colors={[colors.blue, colors.blueDark]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.textPrimary }]}>{contractor.name}</Text>
        <Text style={[styles.cardSkill, { color: colors.textSecondary }]}>{contractor.skill}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={[styles.ratingText, { color: colors.gold }]}>{contractor.rating || '4.8'}</Text>
            <Text style={[styles.reviewText, { color: colors.textMuted }]}>({contractor.reviews || 0})</Text>
          </View>
          <View style={styles.distanceRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.distanceText, { color: colors.textMuted }]}>{contractor.location || 'Mumbai'}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glowGreen: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110 },
  glowBlue: { position: "absolute", bottom: 120, left: -80, width: 260, height: 260, borderRadius: 130 },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  categories: { gap: 10, paddingBottom: 4, marginBottom: 24 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionCount: { fontSize: 13, fontWeight: "500" },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700" },
  cardSkill: { marginTop: 4, fontSize: 14, fontWeight: "500" },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 14, fontWeight: "700" },
  reviewText: { fontSize: 12 },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  distanceText: { fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15 },
  tabBarWrap: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
  tabBar: { flexDirection: "row", paddingTop: 10, paddingBottom: 6 },
  tabItem: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});