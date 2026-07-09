import {
    View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
  } from "react-native";
  import { SafeAreaView } from "react-native-safe-area-context";
  import { LinearGradient } from "expo-linear-gradient";
  import { useRouter } from "expo-router";
  import { Ionicons } from "@expo/vector-icons";
  
  const BIDS = [
    { id: "1", name: "Rajesh Kumar", skill: "Civil Contractor", rating: 4.8, reviews: 127, amount: "₹82,000", time: "21 days", initials: "RK", color: "#22c55e" },
    { id: "2", name: "Amit Patel", skill: "Interior Designer", rating: 4.9, reviews: 89, amount: "₹91,000", time: "25 days", initials: "AP", color: "#3b82f6" },
    { id: "3", name: "Suresh Reddy", skill: "Full Project Contractor", rating: 4.7, reviews: 203, amount: "₹78,000", time: "28 days", initials: "SR", color: "#a855f7" },
  ];
  
  export default function ProjectDetailScreen() {
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
            <Text style={styles.headerTitle}>Project Details</Text>
            <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#f8fafc" />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>Full Project ⭐</Text>
                </View>
                <Text style={styles.postedTime}>Posted 2 hours ago</Text>
              </View>
              <Text style={styles.projectTitle}>Full Kitchen Renovation</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#64748b" />
                <Text style={styles.infoText}>Andheri West, Mumbai</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#64748b" />
                <Text style={styles.infoText}>Timeline: 1 month</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="wallet-outline" size={16} color="#64748b" />
                <Text style={styles.infoText}>Budget: ₹80,000 – ₹1,00,000</Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.card}>
              <Text style={styles.description}>
                Looking for an experienced contractor for complete kitchen renovation. Work includes demolition of existing kitchen, new modular cabinets, granite countertop, electrical work, plumbing, and tiling. Quality materials preferred. Please share portfolio of similar past work.
              </Text>
            </View>
            <View style={styles.bidsHeader}>
              <Text style={styles.sectionTitle}>Bids Received</Text>
              <Text style={styles.bidsCount}>{BIDS.length} bids</Text>
            </View>
            {BIDS.map((bid) => (
              <Pressable key={bid.id} style={({ pressed }) => [styles.bidCard, pressed && styles.pressed]}>
                <LinearGradient colors={[bid.color, bid.color + "cc"]} style={styles.bidAvatar}>
                  <Text style={styles.bidAvatarText}>{bid.initials}</Text>
                </LinearGradient>
                <View style={styles.bidBody}>
                  <Text style={styles.bidName}>{bid.name}</Text>
                  <Text style={styles.bidSkill}>{bid.skill}</Text>
                  <View style={styles.bidRating}>
                    <Ionicons name="star" size={13} color="#fbbf24" />
                    <Text style={styles.bidRatingText}>{bid.rating}</Text>
                    <Text style={styles.bidReviews}>({bid.reviews})</Text>
                  </View>
                </View>
                <View style={styles.bidRight}>
                  <Text style={styles.bidAmount}>{bid.amount}</Text>
                  <Text style={styles.bidTime}>{bid.time}</Text>
                  <View style={styles.viewBtn}>
                    <Text style={styles.viewBtnText}>View</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
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
    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
    card: { backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1e293b", marginBottom: 20 },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    categoryBadge: { backgroundColor: "rgba(251,191,36,0.15)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
    categoryText: { fontSize: 13, fontWeight: "600", color: "#fbbf24" },
    postedTime: { fontSize: 12, color: "#64748b" },
    projectTitle: { fontSize: 22, fontWeight: "800", color: "#f8fafc", letterSpacing: -0.5, marginBottom: 14 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    infoText: { fontSize: 14, color: "#94a3b8", fontWeight: "500" },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: "#f1f5f9", marginBottom: 12 },
    description: { fontSize: 15, color: "#94a3b8", lineHeight: 24 },
    bidsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    bidsCount: { fontSize: 14, color: "#64748b", fontWeight: "500" },
    bidCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1e293b", gap: 12 },
    bidAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
    bidAvatarText: { fontSize: 16, fontWeight: "800", color: "#fff" },
    bidBody: { flex: 1 },
    bidName: { fontSize: 15, fontWeight: "700", color: "#f8fafc" },
    bidSkill: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
    bidRating: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 },
    bidRatingText: { fontSize: 13, fontWeight: "700", color: "#fbbf24" },
    bidReviews: { fontSize: 12, color: "#64748b" },
    bidRight: { alignItems: "flex-end", gap: 4 },
    bidAmount: { fontSize: 16, fontWeight: "700", color: "#22c55e" },
    bidTime: { fontSize: 12, color: "#64748b" },
    viewBtn: { backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    viewBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  });