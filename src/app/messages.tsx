import { useState, useMemo } from "react";
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

const CONVERSATIONS = [
  {
    id: "1",
    name: "Priya Sharma",
    lastMessage: "When can you start the kitchen work?",
    time: "10:30 AM",
    unread: 2,
    avatarColor: "#22c55e",
  },
  {
    id: "2",
    name: "Rahul Mehta",
    lastMessage: "Thanks for the quote! Looks good.",
    time: "Yesterday",
    unread: 0,
    avatarColor: "#3b82f6",
  },
  {
    id: "3",
    name: "Amit Patel",
    lastMessage: "Are you available this weekend?",
    time: "Mon",
    unread: 1,
    avatarColor: "#a855f7",
  },
];

const TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
  { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/contractor" },
  { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "/contractor" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MessagesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return CONVERSATIONS;
    return CONVERSATIONS.filter(
      (conv) =>
        conv.name.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
    );
  }, [search]);

  const handleTabPress = (tab: (typeof TABS)[number]) => {
    if (tab.key === "messages") return;
    router.push(tab.route as "/contractor" | "/messages");
  };

  const handleConversationPress = (id: string) => {
    // router.push({ pathname: "/chat", params: { id } });
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

        {/* Conversation list */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredConversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={40} color="#334155" />
              <Text style={styles.emptyText}>No conversations found</Text>
            </View>
          ) : (
            filteredConversations.map((conv) => (
              <Pressable
                key={conv.id}
                style={({ pressed }) => [
                  styles.conversationRow,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleConversationPress(conv.id)}
              >
                <View
                  style={[styles.avatar, { backgroundColor: conv.avatarColor }]}
                >
                  <Text style={styles.avatarText}>{getInitials(conv.name)}</Text>
                </View>

                <View style={styles.conversationBody}>
                  <View style={styles.conversationTop}>
                    <Text style={styles.conversationName} numberOfLines={1}>
                      {conv.name}
                    </Text>
                    <Text style={styles.conversationTime}>{conv.time}</Text>
                  </View>

                  <View style={styles.conversationBottom}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
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

        {/* Bottom Tab Bar — same as contractor dashboard */}
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
    gap: 6,
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
  conversationBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lastMessage: {
    flex: 1,
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