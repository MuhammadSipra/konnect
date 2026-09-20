import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlert } from '../lib/AppAlert';
import { clearCurrentProfile, getCurrentProfileId, getCurrentRole } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

const CONTRACTOR_TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
  { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/jobs" },
  { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
];

const CLIENT_TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "/customer" },
  { key: "projects", label: "My Projects", icon: "folder" as const, route: "/my-projects" },
  { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
];

async function resolveMyIdentity(): Promise<{ id: number; role: string } | null> {
  const cachedId = getCurrentProfileId();
  const cachedRole = getCurrentRole();
  if (cachedId && cachedRole) return { id: cachedId, role: cachedRole };

  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData?.session?.user?.id;
  if (!authUserId) return null;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, user_type')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (profileRow) return { id: profileRow.id, role: profileRow.user_type };
  return null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();

  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [jobsCompleted, setJobsCompleted] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const identity = await resolveMyIdentity();
      if (!identity) {
        setLoading(false);
        return;
      }

      setRole(identity.role);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', identity.id)
        .single();
      if (profileData) setProfile(profileData);

      if (identity.role === 'contractor') {
        const { count } = await supabase
          .from('bids')
          .select('*', { count: 'exact', head: true })
          .eq('contractor_id', identity.id)
          .eq('status', 'completed');
        setJobsCompleted(count || 0);

        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('rating')
          .eq('contractor_id', identity.id);
        if (reviewsData && reviewsData.length > 0) {
          const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
          setAvgRating(avg);
          setReviewCount(reviewsData.length);
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (role) {
        router.replace(role === 'contractor' ? '/contractor' : '/customer');
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [role]);

  const handleSignOut = () => {
    AppAlert.show("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          clearCurrentProfile();
          router.dismissAll();
          router.replace("/welcome");
        },
      },
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

  if (!profile) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Please log in to continue</Text>
          <Pressable style={[styles.loginRedirectBtn, { backgroundColor: colors.blue }]} onPress={() => router.replace('/welcome')}>
            <Text style={styles.loginRedirectBtnText}>Go to Login</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const initials = (profile.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isContractor = role === 'contractor';
  const currentTabs = role === 'contractor' ? CONTRACTOR_TABS : CLIENT_TABS;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />

      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBtn} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Profile</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={[colors.green, colors.greenDark]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.name}</Text>
            <Text style={[styles.skill, { color: colors.textSecondary }]}>{profile.skill || (isContractor ? "Contractor" : "Client")}</Text>
            {isContractor && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={18} color={colors.gold} />
                <Text style={[styles.ratingText, { color: colors.gold }]}>{avgRating > 0 ? avgRating.toFixed(1) : "New"}</Text>
                <Text style={[styles.reviewCount, { color: colors.textMuted }]}>({reviewCount} reviews)</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          {isContractor && (
            <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <StatBox value={String(jobsCompleted)} label="Jobs Completed" />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatBox value={profile.experience_years ? `${profile.experience_years}+` : "—"} label="Years Experience" />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatBox value={String(profile.trust_score ?? 100)} label="Trust Score" />
            </View>
          )}

          {/* Details */}
          <SectionTitle title="Details" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DetailRow icon="call-outline" label="Phone" value={profile.phone || "—"} />
            <DetailRow icon="mail-outline" label="Email" value={profile.email || "—"} />
            <DetailRow icon="location-outline" label="Location" value={profile.location || "—"} />
            {isContractor && (
              <DetailRow icon="wallet-outline" label="Wallet Balance" value={`₹${profile.wallet_balance ?? 0}`} last />
            )}
          </View>

          {/* Menu */}
          <SectionTitle title="More" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isContractor && (
              <MenuRow
                icon="shield-checkmark-outline"
                label="Verification Status"
                badge={profile.verification_status}
                onPress={() => router.push("/verification-pending" as never)}
              />
            )}
            {isContractor && (
              <MenuRow
                icon="cash-outline"
                label="Earnings"
                onPress={() => router.push("/earnings" as never)}
              />
            )}
            <MenuRow
              icon="time-outline"
              label="History"
              onPress={() => router.push("/history" as never)}
            />
            <MenuRow
              icon="help-buoy-outline"
              label="Help & Support"
              onPress={() => router.push("/help-support" as never)}
            />
            <MenuRow
              icon="settings-outline"
              label="Settings"
              onPress={() => router.push("/settings" as never)}
              last
            />
          </View>

          <Pressable style={[styles.signOutBtn, { backgroundColor: colors.red + '1A', borderColor: colors.red + '40' }]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.red} />
            <Text style={[styles.signOutText, { color: colors.red }]}>Sign Out</Text>
          </Pressable>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Tab Bar */}
        <View style={[styles.tabBarWrap, { backgroundColor: colors.surfaceSolid, borderTopColor: colors.border }]}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.tabBar}>
            {currentTabs.map((tab) => {
                const active = tab.key === "profile";
                return (
                  <Pressable
                    key={tab.key}
                    style={styles.tabItem}
                    onPress={() => {
                      if (!active) router.replace(tab.route as never);
                    }}
                  >
                    <Ionicons
                      name={
                        active
                          ? tab.icon
                          : (`${tab.icon}-outline` as keyof typeof Ionicons.glyphMap)
                      }
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

function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>;
}

function StatBox({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  badge,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[styles.detailRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{label}</Text>
      {badge ? (
        <View style={[styles.menuBadge, { backgroundColor: colors.gold + '26' }]}>
          <Text style={[styles.menuBadgeText, { color: colors.gold }]}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glowGreen: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110 },
  glowBlue: { position: "absolute", bottom: 120, left: -80, width: 260, height: 260, borderRadius: 130 },
  safe: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 15, fontWeight: "500" },
  loginRedirectBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  loginRedirectBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  hero: { alignItems: "center", paddingVertical: 24 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#ffffff" },
  name: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  skill: { marginTop: 6, fontSize: 15, fontWeight: "500" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 4 },
  ratingText: { fontSize: 16, fontWeight: "700" },
  reviewCount: { fontSize: 14, marginLeft: 4 },
  statsRow: { flexDirection: "row", borderRadius: 16, paddingVertical: 20, paddingHorizontal: 12, borderWidth: 1, marginBottom: 28 },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { marginTop: 4, fontSize: 11, fontWeight: "600", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3 },
  statDivider: { width: 1, marginVertical: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  card: { borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, marginBottom: 28 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  detailLabel: { fontSize: 14, fontWeight: "500", width: 80 },
  detailValue: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  menuBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginRight: 4 },
  menuBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  signOutText: { fontSize: 15, fontWeight: "700" },
  tabBarWrap: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
  tabBar: { flexDirection: "row", paddingTop: 10, paddingBottom: 6 },
  tabItem: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
});