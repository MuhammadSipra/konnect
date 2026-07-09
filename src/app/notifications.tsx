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
  
  const NOTIFICATIONS = {
    today: [
      {
        id: "1",
        type: "lead",
        icon: "briefcase",
        iconColor: "#22c55e",
        iconBg: "rgba(34,197,94,0.15)",
        title: "New project in your area",
        subtitle: "Full home renovation · Andheri West · ₹1,20,000",
        time: "10:30 AM",
        unread: true,
      },
      {
        id: "2",
        type: "message",
        icon: "chatbubble",
        iconColor: "#3b82f6",
        iconBg: "rgba(59,130,246,0.15)",
        title: "Priya Sharma sent a message",
        subtitle: "When can you start the kitchen work?",
        time: "9:15 AM",
        unread: true,
      },
      {
        id: "3",
        type: "payment",
        icon: "cash",
        iconColor: "#f59e0b",
        iconBg: "rgba(245,158,11,0.15)",
        title: "Payment received",
        subtitle: "₹42,500 credited for Bathroom Tiling project",
        time: "8:00 AM",
        unread: false,
      },
    ],
    yesterday: [
      {
        id: "4",
        type: "review",
        icon: "star",
        iconColor: "#fbbf24",
        iconBg: "rgba(251,191,36,0.15)",
        title: "New review received",
        subtitle: "Rahul Mehta gave you 5 stars ⭐",
        time: "6:30 PM",
        unread: false,
      },
      {
        id: "5",
        type: "complete",
        icon: "checkmark-circle",
        iconColor: "#22c55e",
        iconBg: "rgba(34,197,94,0.15)",
        title: "Project completed",
        subtitle: "Office Partition Work marked as complete",
        time: "3:00 PM",
        unread: false,
      },
    ],
  };
  
  export default function NotificationsScreen() {
    const router = useRouter();
  
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
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>Today</Text>
            {NOTIFICATIONS.today.map((n) => (
              <NotifCard key={n.id} item={n} />
            ))}
            <Text style={styles.sectionLabel}>Yesterday</Text>
            {NOTIFICATIONS.yesterday.map((n) => (
              <NotifCard key={n.id} item={n} />
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }
  
  function NotifCard({ item }: { item: (typeof NOTIFICATIONS.today)[0] }) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          item.unread && styles.cardUnread,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
        <Text style={styles.cardTime}>{item.time}</Text>
        {item.unread && <View style={styles.unreadDot} />}
      </Pressable>
    );
  }
  
  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#020617" },
    glowGreen: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(34,197,94,0.1)" },
    glowBlue: { position: "absolute", bottom: 120, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(59,130,246,0.08)" },
    safe: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30,41,59,0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc", letterSpacing: -0.3 },
    headerSpacer: { width: 40 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
    sectionLabel: { fontSize: 13, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },
    card: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1e293b", gap: 12 },
    cardUnread: { backgroundColor: "rgba(30,41,59,0.9)", borderColor: "#334155" },
    iconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: "700", color: "#f8fafc", marginBottom: 3 },
    cardSubtitle: { fontSize: 13, color: "#94a3b8", lineHeight: 18 },
    cardTime: { fontSize: 11, color: "#64748b", fontWeight: "500", flexShrink: 0 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e", flexShrink: 0 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  });