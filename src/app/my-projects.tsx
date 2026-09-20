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
import { getCurrentProfileId, setCurrentProfile } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';

const BOTTOM_TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "/customer" },
  { key: "projects", label: "My Projects", icon: "folder" as const, route: "/my-projects" },
  { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
];

type ProjectStatusKey = 'open' | 'reviewing' | 'shortlisted' | 'progress';

const STATUS_META: Record<ProjectStatusKey, { label: string; color: string; bg: string; border: string }> = {
  open: { label: "Open — Awaiting Bids", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.3)" },
  reviewing: { label: "Reviewing Bids", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)", border: "rgba(251, 191, 36, 0.3)" },
  shortlisted: { label: "Contractor Shortlisted", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.3)" },
  progress: { label: "In Progress", color: "#22c55e", bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.3)" },
};

function getProjectStatus(bidStatuses: string[]): ProjectStatusKey {
  if (bidStatuses.includes('confirmed') || bidStatuses.includes('accepted')) return 'progress';
  if (bidStatuses.includes('locked')) return 'shortlisted';
  if (bidStatuses.includes('pending')) return 'reviewing';
  return 'open';
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

export default function MyProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  useEffect(() => {
    const getMyProjects = async () => {
      const clientId = await resolveClientId();

      if (!clientId) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      console.log('MY PROJECTS:', data, 'ERROR:', error);

      if (data && data.length > 0) {
        const projectIds = data.map((p) => p.id);
        const { data: bidsData } = await supabase
          .from('bids')
          .select('project_id, status')
          .in('project_id', projectIds);

        const statusMap: Record<number, string[]> = {};
        (bidsData || []).forEach((b) => {
          if (!statusMap[b.project_id]) statusMap[b.project_id] = [];
          statusMap[b.project_id].push(b.status);
        });

        // Completed projects live in History, not here.
        const active = data.filter((p) => !(statusMap[p.id] || []).includes('completed'));

        const withStatus = active.map((p) => ({
          ...p,
          projectStatus: getProjectStatus(statusMap[p.id] || []),
        }));

        setProjects(withStatus);
      } else {
        setProjects([]);
      }

      setLoading(false);
    };
    getMyProjects();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      router.replace('/customer');
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const handleBottomTabPress = (tab: (typeof BOTTOM_TABS)[number]) => {
    if (tab.key === "projects") return;
    router.replace(tab.route as never);
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Projects</Text>
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : !loggedIn ? (
          <View style={styles.centerWrap}>
            <Ionicons name="lock-closed-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>Please log in to see your projects</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.centerWrap}>
            <Ionicons name="folder-open-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>No projects posted yet</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {projects.map((project) => {
              const meta = STATUS_META[project.projectStatus as ProjectStatusKey];
              return (
                <Pressable
                  key={project.id}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                  onPress={() => router.push(`/project-detail?id=${project.id}` as never)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{project.category}</Text>
                    </View>
                    <Text style={styles.postedTime}>
                      {new Date(project.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  <Text style={styles.cardTitle}>{project.title}</Text>

                  <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                    <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>

                  {project.confirmation_code ? (
                    <View style={styles.codeBox}>
                      <Ionicons name="key-outline" size={14} color="#fbbf24" />
                      <Text style={styles.codeText}>Confirmation Code: {project.confirmation_code}</Text>
                    </View>
                  ) : null}

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.infoText}>{project.location}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.infoText}>{project.timeline}</Text>
                  </View>

                  <Text style={styles.cardBudget}>{project.budget}</Text>
                </Pressable>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Bottom Tab Bar */}
        <View style={styles.tabBarWrap}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.tabBar}>
              {BOTTOM_TABS.map((tab) => {
                const active = tab.key === "projects";
                return (
                  <Pressable
                    key={tab.key}
                    style={styles.tabItem}
                    onPress={() => handleBottomTabPress(tab)}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fbbf24",
  },
  postedTime: {
    fontSize: 12,
    color: "#64748b",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  codeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fbbf24",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  cardBudget: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#22c55e",
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