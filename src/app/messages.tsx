import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentProfileId, getCurrentRole } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';

const TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
  { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/jobs" },
  { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
];

function getInitials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];

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

export default function MessagesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<number | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const identity = await resolveMyIdentity();
      if (!identity) {
        setLoading(false);
        return;
      }
      setMyId(identity.id);
      setMyRole(identity.role);

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${identity.id},receiver_id.eq.${identity.id}`)
        .order('created_at', { ascending: false });

      if (!messages || messages.length === 0) {
        setLoading(false);
        return;
      }
      const grouped: Record<string, any> = {};
      for (const m of messages) {
        const otherId = m.sender_id === identity.id ? m.receiver_id : m.sender_id;
        const key = `${m.project_id}-${otherId}`;
        if (!grouped[key]) {
          grouped[key] = {
            projectId: m.project_id,
            otherId,
            lastMessage: m.content,
            time: m.created_at,
            unread: 0,
          };
        }
        if (m.receiver_id === identity.id && !m.is_read) {
          grouped[key].unread += 1;
        }
      }
      
      const groupList = Object.values(grouped);

      const otherIds = [...new Set(groupList.map((g: any) => g.otherId))];
      const projectIds = [...new Set(groupList.map((g: any) => g.projectId))];

      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', otherIds);
      const { data: projects } = await supabase.from('projects').select('id, title').in('id', projectIds);

      const merged = groupList
        .map((g: any) => ({
          ...g,
          name: profiles?.find((p) => p.id === g.otherId)?.name || 'Unknown',
          projectTitle: projects?.find((p) => p.id === g.projectId)?.title || '',
        }))
        .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setConversations(merged);
      setLoading(false);
    };
    load();
  }, []);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.lastMessage.toLowerCase().includes(query)
    );
  }, [search, conversations]);

  const handleTabPress = (tab: (typeof TABS)[number]) => {
    if (tab.key === "messages") return;
    router.push(tab.route as never);
  };

  const handleConversationPress = (conv: any) => {
    if (!myId || !myRole) return;
    const contractorId = myRole === 'contractor' ? myId : conv.otherId;
    const clientId = myRole === 'client' ? myId : conv.otherId;
    router.push({
      pathname: "/chat",
      params: {
        contractorId: String(contractorId),
        clientId: String(clientId),
        projectId: String(conv.projectId),
        viewerRole: myRole,
      },
    } as never);
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
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredConversations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>No conversations yet</Text>
              </View>
            ) : (
              filteredConversations.map((conv, i) => (
                <Pressable
                  key={`${conv.projectId}-${conv.otherId}`}
                  style={({ pressed }) => [
                    styles.conversationRow,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleConversationPress(conv)}
                >
                  <View
                    style={[styles.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}
                  >
                    <Text style={styles.avatarText}>{getInitials(conv.name)}</Text>
                  </View>

                  <View style={styles.conversationBody}>
  <View style={styles.conversationTop}>
    <Text style={styles.conversationName} numberOfLines={1}>
      {conv.name}
    </Text>
    <Text style={styles.conversationTime}>
      {new Date(conv.time).toLocaleDateString()}
    </Text>
  </View>
  {conv.projectTitle ? (
    <Text style={styles.projectTag} numberOfLines={1}>{conv.projectTitle}</Text>
  ) : null}
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Text style={[styles.lastMessage, { flex: 1 }]} numberOfLines={1}>
      {conv.lastMessage}
    </Text>
    {conv.unread > 0 && (
      <View style={styles.unreadBadge}>
        <Text style={styles.unreadText}>{conv.unread}</Text>
      </View>
    )}
  </View>
</View>
                </Pressable>
              ))
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Bottom Tab Bar */}
        <View style={styles.tabBarWrap}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.tabBar}>
              {TABS.map((tab) => {
                const active = tab.key === "messages";
                return (
                  <Pressable
                    key={tab.key}
                    style={styles.tabItem}
                    onPress={() => handleTabPress(tab)}
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
                    <Text
                      style={[styles.tabLabel, active && styles.tabLabelActive]}
                    >
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#f8fafc",
    padding: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  conversationBody: {
    flex: 1,
    gap: 3,
  },
  conversationTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  conversationName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  conversationTime: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
  },
  projectTag: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22c55e",
  },
  lastMessage: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
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
