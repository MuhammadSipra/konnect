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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentProfileId } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

type TabKey = "active" | "completed" | "pending";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
];

const BOTTOM_TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
  { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/jobs" },
  { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
];

async function resolveContractorId(): Promise<number | null> {
  const cached = getCurrentProfileId();
  if (cached) return cached;

  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData?.session?.user?.id;
  if (!authUserId) return null;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('user_type', 'contractor')
    .maybeSingle();

  return profileRow?.id ?? null;
}

export default function JobsScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [loading, setLoading] = useState(true);

  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const contractorId = await resolveContractorId();
      if (!contractorId) {
        setLoading(false);
        return;
      }

      const { data: bids } = await supabase
        .from('bids')
        .select('*')
        .eq('contractor_id', contractorId);

      if (!bids || bids.length === 0) {
        setLoading(false);
        return;
      }

      const projectIds = bids.map((b) => b.project_id);
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);

      const { data: reviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('contractor_id', contractorId);

      const merged = bids.map((bid) => ({
        ...bid,
        project: projects?.find((p) => p.id === bid.project_id),
        review: reviews?.find((r) => r.project_id === bid.project_id),
      })).filter((b) => b.project);

      setActiveJobs(merged.filter((b) => b.status === 'accepted' || b.status === 'confirmed'));
      setCompletedJobs(merged.filter((b) => b.status === 'completed'));
      setPendingJobs(merged.filter((b) => b.status === 'pending' || b.status === 'locked'));

      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      router.replace('/contractor');
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const handleBottomTabPress = (tab: (typeof BOTTOM_TABS)[number]) => {
    if (tab.key === "jobs") return;
    router.replace(tab.route as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />

      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Jobs</Text>
        </View>

        {/* Top tabs */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[
                  styles.tabPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selected && { backgroundColor: colors.green + '26', borderColor: colors.green + '66' },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabPillText, { color: colors.textMuted }, selected && { color: colors.green }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "active" && (
              activeJobs.length === 0 ? (
                <EmptyState text="No active jobs right now." />
              ) : (
                activeJobs.map((job) => (
                  <Pressable
                    key={job.id}
                    style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
                    onPress={() => router.push(`/project-detail?id=${job.project.id}` as never)}
                  >
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{job.project.title}</Text>
                    <View style={styles.cardRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.cardDetail, { color: colors.textMuted }]}>{job.project.location}</Text>
                    </View>
                    <Text style={[styles.cardBudget, { color: colors.green }]}>{job.project.budget}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBadge, { backgroundColor: colors.green + '26', borderColor: colors.green + '59' }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.green }]}>
                          {job.status === 'confirmed' ? 'In Progress' : 'Confirmed'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              )
            )}

            {activeTab === "completed" && (
              completedJobs.length === 0 ? (
                <EmptyState text="No completed jobs yet." />
              ) : (
                completedJobs.map((job) => (
                  <Pressable
                    key={job.id}
                    style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
                    onPress={() => router.push(`/project-detail?id=${job.project.id}` as never)}
                  >
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{job.project.title}</Text>
                      <View style={[styles.completedBadge, { backgroundColor: colors.blue + '26', borderColor: colors.blue + '59' }]}>
                        <Text style={[styles.completedBadgeText, { color: colors.blue }]}>Completed</Text>
                      </View>
                    </View>
                    <View style={styles.cardRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.cardDetail, { color: colors.textMuted }]}>{job.project.location}</Text>
                    </View>
                    <Text style={[styles.cardBudget, { color: colors.green }]}>{job.project.budget}</Text>
                    <Text style={[styles.completedDate, { color: colors.textMuted }]}>
                      Finished on {new Date(job.created_at).toLocaleDateString()}
                    </Text>
                    {job.review ? (
                      <View style={[styles.ratingRow, { borderTopColor: colors.border }]}>
                        <Ionicons name="star" size={16} color={colors.gold} />
                        <Text style={[styles.ratingText, { color: colors.gold }]}>{job.review.rating} rating received</Text>
                      </View>
                    ) : (
                      <View style={[styles.ratingRow, { borderTopColor: colors.border }]}>
                        <Text style={[styles.noRatingText, { color: colors.textMuted }]}>No rating yet</Text>
                      </View>
                    )}
                  </Pressable>
                ))
              )
            )}

            {activeTab === "pending" && (
              pendingJobs.length === 0 ? (
                <EmptyState text="No pending jobs right now." />
              ) : (
                pendingJobs.map((job) => (
                  <Pressable
                    key={job.id}
                    style={({ pressed }) => [styles.card, styles.pendingCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
                    onPress={() => router.push('/contractor' as never)}
                  >
                    <View style={[styles.pendingAccent, { backgroundColor: colors.gold }]} />
                    <View style={styles.pendingContent}>
                      <View style={styles.cardTop}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{job.project.title}</Text>
                        <Text style={[styles.pendingTime, { color: colors.textMuted }]}>
                          {new Date(job.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.cardDetail, { color: colors.textMuted }]}>{job.project.location}</Text>
                      </View>
                      <Text style={[styles.cardBudget, { color: colors.green }]}>{job.project.budget}</Text>

                      <View style={styles.pendingFooter}>
                        <View style={styles.waitingBadge}>
                          <Ionicons name="time-outline" size={14} color={colors.gold} />
                          <Text style={[styles.waitingText, { color: colors.gold }]}>
                            {job.status === 'locked'
                              ? 'Client shortlisted you — enter code on Home'
                              : 'Waiting for client response'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))
              )
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Bottom Tab Bar */}
        <View style={[styles.tabBarWrap, { backgroundColor: colors.surfaceSolid, borderTopColor: colors.border }]}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.tabBar}>
              {BOTTOM_TABS.map((tab) => {
                const active = tab.key === "jobs";
                return (
                  <Pressable
                    key={tab.key}
                    style={styles.tabItem}
                    onPress={() => handleBottomTabPress(tab)}
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

function EmptyState({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="briefcase-outline" size={40} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glowGreen: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110 },
  glowBlue: { position: "absolute", bottom: 120, left: -80, width: 260, height: 260, borderRadius: 130 },
  safe: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  tabPill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  tabPillText: { fontSize: 14, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "500" },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  pendingCard: { flexDirection: "row", overflow: "hidden", padding: 0 },
  pendingAccent: { width: 4 },
  pendingContent: { flex: 1, padding: 16 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  cardDetail: { fontSize: 13 },
  cardBudget: { marginTop: 10, fontSize: 16, fontWeight: "700" },
  statusRow: { marginTop: 12, flexDirection: "row" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  completedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  completedBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  completedDate: { marginTop: 10, fontSize: 13, fontWeight: "500" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  ratingText: { fontSize: 14, fontWeight: "600" },
  noRatingText: { fontSize: 13, fontWeight: "500" },
  pendingTime: { fontSize: 12, fontWeight: "500" },
  pendingFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 10 },
  waitingBadge: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  waitingText: { flex: 1, fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  tabBarWrap: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
  tabBar: { flexDirection: "row", paddingTop: 10, paddingBottom: 6 },
  tabItem: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
});