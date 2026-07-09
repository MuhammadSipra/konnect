import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type TabKey = "active" | "completed" | "pending";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
];

const ACTIVE_JOBS = [
  {
    id: "1",
    title: "Kitchen Renovation",
    client: "Priya Sharma",
    location: "Andheri West, Mumbai",
    budget: "₹85,000",
    progress: 65,
  },
  {
    id: "2",
    title: "Bathroom Tiling",
    client: "Rahul Mehta",
    location: "Bandra East, Mumbai",
    budget: "₹32,000",
    progress: 30,
  },
];

const COMPLETED_JOBS = [
  {
    id: "1",
    title: "Living Room Painting",
    client: "Anita Desai",
    location: "Powai, Mumbai",
    budget: "₹28,000",
    completedOn: "Feb 12, 2026",
    rating: 5,
  },
  {
    id: "2",
    title: "Office Partition Work",
    client: "TechStart Pvt Ltd",
    location: "Lower Parel, Mumbai",
    budget: "₹45,000",
    completedOn: "Jan 28, 2026",
    rating: 4.5,
  },
];

const PENDING_JOBS = [
  {
    id: "1",
    title: "Full Home Painting",
    client: "Vikram Singh",
    location: "Malad West, Mumbai",
    budget: "₹1,20,000",
    requestedOn: "2 hours ago",
  },
  {
    id: "2",
    title: "Modular Kitchen Setup",
    client: "Neha Kapoor",
    location: "Goregaon East, Mumbai",
    budget: "₹95,000",
    requestedOn: "Yesterday",
  },
];

const BOTTOM_TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
  { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/jobs" },
  { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "/contractor" },
];

export default function JobsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("active");

  const handleBottomTabPress = (tab: (typeof BOTTOM_TABS)[number]) => {
    if (tab.key === "jobs") return;
    router.push(tab.route as "/contractor" | "/jobs" | "/messages");
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "active" &&
            ACTIVE_JOBS.map((job) => (
              <Pressable
                key={job.id}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <Text style={styles.cardTitle}>{job.title}</Text>
                <Text style={styles.cardMeta}>{job.client}</Text>
                <View style={styles.cardRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.cardDetail}>{job.location}</Text>
                </View>
                <Text style={styles.cardBudget}>{job.budget}</Text>

                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressPercent}>{job.progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${job.progress}%` }]} />
                </View>
              </Pressable>
            ))}

          {activeTab === "completed" &&
            COMPLETED_JOBS.map((job) => (
              <Pressable
                key={job.id}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{job.title}</Text>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>{job.client}</Text>
                <View style={styles.cardRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.cardDetail}>{job.location}</Text>
                </View>
                <Text style={styles.cardBudget}>{job.budget}</Text>
                <Text style={styles.completedDate}>Finished on {job.completedOn}</Text>

                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#fbbf24" />
                  <Text style={styles.ratingText}>
                    {job.rating} rating received
                  </Text>
                </View>
              </Pressable>
            ))}

          {activeTab === "pending" &&
            PENDING_JOBS.map((job) => (
              <Pressable
                key={job.id}
                style={({ pressed }) => [styles.card, styles.pendingCard, pressed && styles.pressed]}
              >
                <View style={styles.pendingAccent} />
                <View style={styles.pendingContent}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{job.title}</Text>
                    <Text style={styles.pendingTime}>{job.requestedOn}</Text>
                  </View>
                  <Text style={styles.cardMeta}>{job.client}</Text>
                  <View style={styles.cardRow}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.cardDetail}>{job.location}</Text>
                  </View>
                  <Text style={styles.cardBudget}>{job.budget}</Text>

                  <View style={styles.pendingFooter}>
                    <View style={styles.waitingBadge}>
                      <Ionicons name="time-outline" size={14} color="#fbbf24" />
                      <Text style={styles.waitingText}>Waiting for your response</Text>
                    </View>
                    <Pressable style={styles.respondBtn}>
                      <Text style={styles.respondBtnText}>Respond</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}

          <View style={{ height: 100 }} />
        </ScrollView>

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
  cardMeta: {
    marginTop: 6,
    fontSize: 14,
    color: "#94a3b8",
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
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#22c55e",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1e293b",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#22c55e",
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
  respondBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  respondBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
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