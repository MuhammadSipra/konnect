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
  
  const ACTIVE_JOBS = [
    {
      id: "1",
      title: "Kitchen Renovation",
      client: "Priya Sharma",
      location: "Andheri West, Mumbai",
      budget: "₹85,000",
      status: "In Progress",
    },
    {
      id: "2",
      title: "Bathroom Tiling",
      client: "Rahul Mehta",
      location: "Bandra East, Mumbai",
      budget: "₹32,000",
      status: "Starting Soon",
    },
  ];
  
  const NEW_LEADS = [
    {
      id: "1",
      title: "Full Home Painting",
      area: "Powai, Mumbai",
      budget: "₹1,20,000",
      posted: "2 hours ago",
    },
    {
      id: "2",
      title: "Office Partition Work",
      area: "Lower Parel, Mumbai",
      budget: "₹45,000",
      posted: "5 hours ago",
    },
  ];
  
  const TABS = [
    { key: "home", label: "Home", icon: "home" as const },
    { key: "jobs", label: "Jobs", icon: "briefcase" as const },
    { key: "messages", label: "Messages", icon: "chatbubbles" as const },
    { key: "profile", label: "Profile", icon: "person" as const },
  ];
  
  export default function ContractorDashboard() {
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
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#f8fafc" />
            </Pressable>
            <Text style={styles.headerTitle}>Contractor Dashboard</Text>
            <View style={styles.headerSpacer} />
          </View>
  
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={["#1e293b", "#0f172a"]}
                style={styles.profileGradient}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>RK</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>Rajesh Kumar</Text>
                  <Text style={styles.profileSkill}>Civil Contractor · Interiors</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    <Text style={styles.ratingText}>4.8</Text>
                    <Text style={styles.ratingCount}>(127 reviews)</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
  
            {/* Active Jobs */}
            <SectionHeader title="Active Jobs" action="See all" />
            {ACTIVE_JOBS.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
  
            {/* New Leads */}
            <SectionHeader title="New Leads" action="View all" />
            {NEW_LEADS.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
  
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
                        // wire up other tabs later
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
  
  function SectionHeader({ title, action }: { title: string; action: string }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      </View>
    );
  }
  
  function JobCard({
    job,
  }: {
    job: (typeof ACTIVE_JOBS)[0];
  }) {
    return (
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{job.title}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{job.status}</Text>
          </View>
        </View>
        <Text style={styles.cardMeta}>{job.client}</Text>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.cardDetail}>{job.location}</Text>
        </View>
        <Text style={styles.cardBudget}>{job.budget}</Text>
      </Pressable>
    );
  }
  
  function LeadCard({
    lead,
  }: {
    lead: (typeof NEW_LEADS)[0];
  }) {
    return (
      <Pressable style={({ pressed }) => [styles.card, styles.leadCard, pressed && styles.pressed]}>
        <View style={styles.leadAccent} />
        <View style={styles.leadContent}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{lead.title}</Text>
            <Text style={styles.leadTime}>{lead.posted}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.cardDetail}>{lead.area}</Text>
          </View>
          <View style={styles.leadFooter}>
            <Text style={styles.cardBudget}>{lead.budget}</Text>
            <Pressable style={styles.interestBtn}>
              <Text style={styles.interestBtnText}>I'm Interested</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "rgba(30, 41, 59, 0.8)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#1e293b",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#f8fafc",
      letterSpacing: -0.3,
    },
    headerSpacer: {
      width: 40,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    profileCard: {
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 28,
      borderWidth: 1,
      borderColor: "#1e293b",
    },
    profileGradient: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      gap: 16,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#22c55e",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 22,
      fontWeight: "800",
      color: "#ffffff",
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 22,
      fontWeight: "700",
      color: "#f8fafc",
      letterSpacing: -0.3,
    },
    profileSkill: {
      marginTop: 4,
      fontSize: 14,
      color: "#94a3b8",
      fontWeight: "500",
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      gap: 4,
    },
    ratingText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fbbf24",
    },
    ratingCount: {
      fontSize: 13,
      color: "#64748b",
      marginLeft: 4,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#f1f5f9",
    },
    sectionAction: {
      fontSize: 14,
      fontWeight: "600",
      color: "#22c55e",
    },
    card: {
      backgroundColor: "rgba(30, 41, 59, 0.6)",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#1e293b",
    },
    leadCard: {
      flexDirection: "row",
      overflow: "hidden",
      padding: 0,
    },
    leadAccent: {
      width: 4,
      backgroundColor: "#3b82f6",
    },
    leadContent: {
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
    statusBadge: {
      backgroundColor: "rgba(34, 197, 94, 0.15)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(34, 197, 94, 0.35)",
    },
    statusText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#22c55e",
      textTransform: "uppercase",
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
    leadTime: {
      fontSize: 12,
      color: "#64748b",
      fontWeight: "500",
    },
    leadFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    },
    interestBtn: {
      backgroundColor: "#2563eb",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    interestBtnText: {
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