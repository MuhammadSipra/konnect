import {
    View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
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
    { id: "1", name: "Priya Sharma", rating: 5, date: "2 weeks ago", text: "Excellent work! Completed on time and within budget." },
    { id: "2", name: "Rahul Mehta", rating: 5, date: "1 month ago", text: "Very professional. Would hire again." },
  ];
  
  export default function ContractorDetailScreen() {
    const router = useRouter();
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.header}>
            <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#f8fafc" />
            </Pressable>
            <Text style={styles.headerTitle}>Contractor Profile</Text>
            <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Ionicons name="share-outline" size={22} color="#f8fafc" />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.avatar}>
                <Text style={styles.avatarText}>RK</Text>
              </LinearGradient>
              <Text style={styles.name}>Rajesh Kumar</Text>
              <Text style={styles.skill}>Civil Contractor · Full Project</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#fbbf24" />
                <Text style={styles.ratingText}>4.8</Text>
                <Text style={styles.reviewCount}>(127 reviews)</Text>
                <View style={styles.dot} />
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text style={styles.distance}>1.2 km away</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statVal}>84</Text><Text style={styles.statLbl}>Jobs Done</Text></View>
              <View style={styles.statDiv} />
              <View style={styles.statBox}><Text style={styles.statVal}>12+</Text><Text style={styles.statLbl}>Years Exp</Text></View>
              <View style={styles.statDiv} />
              <View style={styles.statBox}><Text style={styles.statVal}>98%</Text><Text style={styles.statLbl}>Response</Text></View>
            </View>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              <Text style={styles.bio}>Experienced civil contractor based in Mumbai with over 12 years in residential and commercial projects. Specializing in full home renovations, kitchen & bathroom upgrades, and structural work.</Text>
            </View>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <View style={styles.portfolioGrid}>
              {PORTFOLIO.map((item) => (
                <Pressable key={item.id} style={[styles.portfolioItem, { backgroundColor: item.color }]}>
                  <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.portfolioLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {REVIEWS.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}><Text style={styles.reviewAvatarText}>{r.name.split(" ").map(n => n[0]).join("")}</Text></View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewName}>{r.name}</Text>
                    <View style={styles.starsRow}>
                      {Array.from({ length: r.rating }).map((_, i) => <Ionicons key={i} name="star" size={12} color="#fbbf24" />)}
                      <Text style={styles.reviewDate}>{r.date}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText}>{r.text}</Text>
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
          <View style={styles.bottomBar}>
            <SafeAreaView edges={["bottom"]}>
              <View style={styles.bottomRow}>
                <Pressable style={styles.msgBtn}>
                  <Ionicons name="chatbubble-outline" size={20} color="#f8fafc" />
                  <Text style={styles.msgBtnText}>Message</Text>
                </Pressable>
                <Pressable style={styles.hireWrap}>
                  <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.hireBtn}>
                    <Text style={styles.hireBtnText}>Hire Now</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </SafeAreaView>
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#020617" },
    safe: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30,41,59,0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc" },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },
    hero: { alignItems: "center", paddingVertical: 24 },
    avatar: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
    name: { fontSize: 24, fontWeight: "800", color: "#f8fafc", letterSpacing: -0.5 },
    skill: { marginTop: 6, fontSize: 15, color: "#94a3b8", fontWeight: "500" },
    ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 4 },
    ratingText: { fontSize: 15, fontWeight: "700", color: "#fbbf24" },
    reviewCount: { fontSize: 13, color: "#64748b" },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#475569" },
    distance: { fontSize: 13, color: "#64748b" },
    statsRow: { flexDirection: "row", backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, paddingVertical: 20, paddingHorizontal: 12, borderWidth: 1, borderColor: "#1e293b", marginBottom: 24 },
    statBox: { flex: 1, alignItems: "center" },
    statVal: { fontSize: 22, fontWeight: "800", color: "#f8fafc" },
    statLbl: { marginTop: 4, fontSize: 11, fontWeight: "600", color: "#64748b", textTransform: "uppercase" },
    statDiv: { width: 1, backgroundColor: "#1e293b", marginVertical: 4 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: "#f1f5f9", marginBottom: 12 },
    card: { backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1e293b", marginBottom: 24 },
    bio: { fontSize: 15, color: "#94a3b8", lineHeight: 24 },
    portfolioGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
    portfolioItem: { width: "47%", aspectRatio: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 8 },
    portfolioLabel: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
    reviewCard: { backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1e293b", marginBottom: 12 },
    reviewHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
    reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#334155", alignItems: "center", justifyContent: "center" },
    reviewAvatarText: { fontSize: 14, fontWeight: "700", color: "#f8fafc" },
    reviewMeta: { flex: 1 },
    reviewName: { fontSize: 15, fontWeight: "700", color: "#f8fafc" },
    starsRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
    reviewDate: { fontSize: 12, color: "#64748b", marginLeft: 8 },
    reviewText: { fontSize: 14, color: "#94a3b8", lineHeight: 22 },
    bottomBar: { backgroundColor: "rgba(15,23,42,0.95)", borderTopWidth: 1, borderTopColor: "#1e293b", paddingHorizontal: 20, paddingTop: 12 },
    bottomRow: { flexDirection: "row", gap: 12, paddingBottom: 8 },
    msgBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(30,41,59,0.8)", borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: "#334155" },
    msgBtnText: { fontSize: 16, fontWeight: "600", color: "#f8fafc" },
    hireWrap: { flex: 2, borderRadius: 14, overflow: "hidden" },
    hireBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 14 },
    hireBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  });