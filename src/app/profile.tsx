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
  
  const PORTFOLIO = [
    { id: "1", color: "#3b82f6", label: "Kitchen" },
    { id: "2", color: "#22c55e", label: "Bathroom" },
    { id: "3", color: "#f59e0b", label: "Living Room" },
    { id: "4", color: "#a855f7", label: "Office" },
  ];
  
  const REVIEWS = [
    {
      id: "1",
      name: "Priya Sharma",
      rating: 5,
      date: "2 weeks ago",
      text: "Rajesh completed our kitchen renovation on time and within budget. Excellent workmanship and very professional.",
    },
    {
      id: "2",
      name: "Rahul Mehta",
      rating: 5,
      date: "1 month ago",
      text: "Great civil contractor. Clear communication throughout the project. Would definitely hire again for future work.",
    },
  ];
  
  const TABS = [
    { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
    { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/jobs" },
    { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
    { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
  ];
  
  export default function ProfileScreen() {
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
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#f8fafc" />
            </Pressable>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              onPress={() => {
                // router.push("/edit-profile");
              }}
            >
              <Ionicons name="create-outline" size={22} color="#f8fafc" />
            </Pressable>
          </View>
  
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile hero */}
            <View style={styles.hero}>
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>RK</Text>
              </LinearGradient>
              <Text style={styles.name}>Rajesh Kumar</Text>
              <Text style={styles.skill}>Civil Contractor · Interiors</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={18} color="#fbbf24" />
                <Text style={styles.ratingText}>4.8</Text>
                <Text style={styles.reviewCount}>(127 reviews)</Text>
              </View>
            </View>
  
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatBox value="84" label="Jobs Completed" />
              <View style={styles.statDivider} />
              <StatBox value="12+" label="Years Experience" />
              <View style={styles.statDivider} />
              <StatBox value="98%" label="Response Rate" />
            </View>
  
            {/* About */}
            <SectionTitle title="About" />
            <View style={styles.card}>
              <Text style={styles.bio}>
                Experienced civil contractor based in Mumbai with over 12 years in
                residential and commercial projects. Specializing in full home
                renovations, kitchen & bathroom upgrades, and structural work.
                Licensed, insured, and committed to quality craftsmanship.
              </Text>
            </View>
  
            {/* Portfolio */}
            <SectionTitle title="Portfolio" />
            <View style={styles.portfolioGrid}>
              {PORTFOLIO.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.portfolioItem,
                    { backgroundColor: item.color },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.portfolioLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
  
            {/* Reviews */}
            <SectionTitle title="Reviews" />
            {REVIEWS.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {review.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Ionicons key={i} name="star" size={12} color="#fbbf24" />
                      ))}
                      <Text style={styles.reviewDate}>{review.date}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
  
            <View style={{ height: 100 }} />
          </ScrollView>
  
          {/* Bottom Tab Bar */}
          <View style={styles.tabBarWrap}>
            <SafeAreaView edges={["bottom"]}>
              <View style={styles.tabBar}>
                {TABS.map((tab) => {
                  const active = tab.key === "profile";
                  return (
                    <Pressable
                      key={tab.key}
                      style={styles.tabItem}
                      onPress={() => {
                        if (!active) router.push(tab.route as never);
                      }}
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
  
  function SectionTitle({ title }: { title: string }) {
    return <Text style={styles.sectionTitle}>{title}</Text>;
  }
  
  function StatBox({ value, label }: { value: string; label: string }) {
    return (
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    iconBtn: {
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    hero: {
      alignItems: "center",
      paddingVertical: 24,
    },
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
    avatarText: {
      fontSize: 32,
      fontWeight: "800",
      color: "#ffffff",
    },
    name: {
      fontSize: 24,
      fontWeight: "800",
      color: "#f8fafc",
      letterSpacing: -0.5,
    },
    skill: {
      marginTop: 6,
      fontSize: 15,
      color: "#94a3b8",
      fontWeight: "500",
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      gap: 4,
    },
    ratingText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#fbbf24",
    },
    reviewCount: {
      fontSize: 14,
      color: "#64748b",
      marginLeft: 4,
    },
    statsRow: {
      flexDirection: "row",
      backgroundColor: "rgba(30, 41, 59, 0.6)",
      borderRadius: 16,
      paddingVertical: 20,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: "#1e293b",
      marginBottom: 28,
    },
    statBox: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      fontSize: 22,
      fontWeight: "800",
      color: "#f8fafc",
      letterSpacing: -0.5,
    },
    statLabel: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: "600",
      color: "#64748b",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    statDivider: {
      width: 1,
      backgroundColor: "#1e293b",
      marginVertical: 4,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#f1f5f9",
      marginBottom: 12,
    },
    card: {
      backgroundColor: "rgba(30, 41, 59, 0.6)",
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: "#1e293b",
      marginBottom: 28,
    },
    bio: {
      fontSize: 15,
      color: "#94a3b8",
      lineHeight: 24,
      fontWeight: "500",
    },
    portfolioGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 28,
    },
    portfolioItem: {
      width: "47%",
      aspectRatio: 1,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    portfolioLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: "rgba(255,255,255,0.9)",
    },
    reviewCard: {
      backgroundColor: "rgba(30, 41, 59, 0.6)",
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: "#1e293b",
      marginBottom: 12,
    },
    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    reviewAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#334155",
      alignItems: "center",
      justifyContent: "center",
    },
    reviewAvatarText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#f8fafc",
    },
    reviewMeta: {
      flex: 1,
    },
    reviewName: {
      fontSize: 15,
      fontWeight: "700",
      color: "#f8fafc",
    },
    reviewStars: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      marginTop: 2,
    },
    reviewDate: {
      fontSize: 12,
      color: "#64748b",
      marginLeft: 8,
    },
    reviewText: {
      fontSize: 14,
      color: "#94a3b8",
      lineHeight: 22,
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
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
  });