import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

  const handleBottomTabPress = (tab: (typeof BOTTOM_TABS)[number]) => {
    if (tab.key === "jobs") return;
    router.push(tab.route as never);
  };

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Jobs</Text>
        </View>

        {/* Top tabs */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabPill, selected && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabPillText, selected && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#22c55e" />
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
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                    onPress={() => router.push(`/project-detail?id=${job.project.id}` as never)}
                  >
                    <Text style={styles.cardTitle}>{job.project.title}</Text>
                    <View style={styles.cardRow}>
                      <Ionicons name="location-outline" size={14} color="#64748b" />
                      <Text style={styles.cardDetail}>{job.project.location}</Text>
                    </View>
                    <Text style={styles.cardBudget}>{job.project.budget}</Text>
                    <View style={styles.statusRow}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
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
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                    onPress={() => router.push(`/project-detail?id=${job.project.id}` as never)}
                  >
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{job.project.title}</Text>
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>Completed</Text>
                      </View>
                    </View>
                    <View style={styles.cardRow}>
                      <Ionicons name="location-outline" size={14} color="#64748b" />
                      <Text style={styles.cardDetail}>{job.project.location}</Text>
                    </View>
                    <Text style={styles.cardBudget}>{job.project.budget}</Text>
                    <Text style={styles.completedDate}>
                      Finished on {new Date(job.created_at).toLocaleDateString()}
                    </Text>
                    {job.review ? (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={16} color="#fbbf24" />
                        <Text style={styles.ratingText}>{job.review.rating} rating received</Text>
                      </View>
                    ) : (
                      <View style={styles.ratingRow}>
                        <Text style={styles.noRatingText}>No rating yet</Text>
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
                    style={({ pressed }) => [styles.card, styles.pendingCard, pressed && styles.pressed]}
                    onPress={() => router.push('/contractor' as never)}
                  >
                    <View style={styles.pendingAccent} />
                    <View style={styles.pendingContent}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle}>{job.project.title}</Text>
                        <Text style={styles.pendingTime}>
                          {new Date(job.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Ionicons name="location-outline" size={14} color="#64748b" />
                        <Text style={styles.cardDetail}>{job.project.location}</Text>
                      </View>
                      <Text style={styles.cardBudget}>{job.project.budget}</Text>

                      <View style={styles.pendingFooter}>
                        <View style={styles.waitingBadge}>
                          <Ionicons name="time-outline" size={14} color="#fbbf24" />
                          <Text style={styles.waitingText}>
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
        <View style={styles.tabBarWrap}>
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

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="briefcase-outline" size={40} color="#334155" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  glowGreen: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  glowBlue: {
    position: "absolute",
    bottom: 120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  safe: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  tabPillActive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  tabPillTextActive: {
    color: "#22c55e",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  pendingCard: {
    flexDirection: "row",
    overflow: "hidden",
    padding: 0,
  },
  pendingAccent: {
    width: 4,
    backgroundColor: "#fbbf24",
  },
  pendingContent: {
    flex: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  cardDetail: {
    fontSize: 13,
    color: "#64748b",
  },
  cardBudget: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#22c55e",
  },
  statusRow: {
    marginTop: 12,
    flexDirection: "row",
  },
  statusBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#22c55e",
    textTransform: "uppercase",
  },
  completedBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3b82f6",
    textTransform: "uppercase",
  },
  completedDate: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fbbf24",
  },
  noRatingText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  pendingTime: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  pendingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
  },
  waitingBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  waitingText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#fbbf24",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
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
});
