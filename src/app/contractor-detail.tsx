import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Dimensions, Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PORTFOLIO_ITEM_SIZE = (SCREEN_WIDTH - 40 - 12) / 2; // 40 = scrollContent horizontal padding, 12 = grid gap

export default function ContractorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [jobsDone, setJobsDone] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (profileData) setProfile(profileData);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('contractor_id', id)
        .order('created_at', { ascending: false });

      if (reviewsData && reviewsData.length > 0) {
        const clientIds = reviewsData.map((r) => r.client_id);
        const { data: clientsData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', clientIds);

        const merged = reviewsData.map((r) => ({
          ...r,
          clientName: clientsData?.find((c) => c.id === r.client_id)?.name || 'Client',
        }));
        setReviews(merged);
      } else {
        setReviews([]);
      }

      const { data: portfolioData } = await supabase
        .from('portfolio_photos')
        .select('*')
        .eq('contractor_id', id)
        .order('created_at', { ascending: false });
      if (portfolioData) setPortfolio(portfolioData);

      const { count } = await supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('contractor_id', id)
        .eq('status', 'completed');
      setJobsDone(count || 0);

      setLoading(false);
    };
    loadData();
  }, [id]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </SafeAreaView>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <Text style={styles.reviewText}>Contractor not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  const initials = (profile.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
          <View style={styles.iconBtn} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
          {profile.profile_photo_url ? (
  <Image source={{ uri: profile.profile_photo_url }} style={styles.avatarImage} />
) : (
  <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.avatar}>
    <Text style={styles.avatarText}>{initials}</Text>
  </LinearGradient>
)}
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.skill}>{profile.skill || "Contractor"}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.ratingText}>{avgRating > 0 ? avgRating.toFixed(1) : "New"}</Text>
              <Text style={styles.reviewCount}>({reviews.length} reviews)</Text>
              {profile.location ? (
                <>
                  <View style={styles.dot} />
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.distance}>{profile.location}</Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{jobsDone}</Text>
              <Text style={styles.statLbl}>Jobs Done</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{profile.experience_years ? `${profile.experience_years}+` : "—"}</Text>
              <Text style={styles.statLbl}>Years Exp</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{profile.trust_score ?? 100}</Text>
              <Text style={styles.statLbl}>Trust Score</Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
  <Text style={styles.sectionTitle}>Portfolio</Text>
  {portfolio.length > 2 && (
    <Pressable onPress={() => router.push(`/portfolio-all?contractorId=${id}` as never)}>
      <Text style={styles.viewAllLink}>View All</Text>
    </Pressable>
  )}
</View>
{portfolio.length === 0 ? (
  <View style={styles.card}>
    <Text style={styles.bio}>No portfolio photos yet.</Text>
  </View>
) : (
  <View style={styles.portfolioGrid}>
    {portfolio.slice(0, 2).map((item) => (
      <Image
        key={item.id}
        source={{ uri: item.photo_url }}
        style={[styles.portfolioItem, { width: PORTFOLIO_ITEM_SIZE, height: PORTFOLIO_ITEM_SIZE }]}
      />
    ))}
  </View>
)}

<View style={styles.sectionHeaderRow}>
  <Text style={styles.sectionTitle}>Reviews</Text>
  {reviews.length > 5 && (
    <Pressable onPress={() => router.push(`/reviews-all?contractorId=${id}` as never)}>
      <Text style={styles.viewAllLink}>See All</Text>
    </Pressable>
  )}
</View>
{reviews.length === 0 ? (
  <View style={styles.card}>
    <Text style={styles.bio}>No reviews yet.</Text>
  </View>
) : (
  reviews.slice(0, 5).map((r) => (
    <View key={r.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>
            {r.clientName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </Text>
        </View>
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewName}>{r.clientName}</Text>
          <View style={styles.starsRow}>
            {Array.from({ length: r.rating }).map((_, i) => (
              <Ionicons key={i} name="star" size={12} color="#fbbf24" />
            ))}
            <Text style={styles.reviewDate}>
              {new Date(r.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      {r.comment ? <Text style={styles.reviewText}>{r.comment}</Text> : null}
    </View>
  ))
)}
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.bottomRow}>
              <Pressable
                style={styles.msgBtn}
                onPress={() =>
                  Alert.alert(
                    "Message this contractor",
                    "You'll be able to message this contractor once they've bid on one of your posted projects."
                  )
                }
              >
                <Ionicons name="chatbubble-outline" size={20} color="#f8fafc" />
                <Text style={styles.msgBtnText}>Message</Text>
              </Pressable>
              <Pressable
                style={styles.hireWrap}
                onPress={() => router.push(`/post-project?targetContractorId=${id}` as never)}
              >
                <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.hireBtn}>
                  <Text style={styles.hireBtnText}>Post a Project for {profile.name?.split(" ")[0] || "them"}</Text>
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
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 4, flexWrap: "wrap", justifyContent: "center" },
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
  
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
viewAllLink: { fontSize: 13, fontWeight: "700", color: "#22c55e" },portfolioItem: {  borderRadius: 14, backgroundColor: "#1e293b" },
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
  hireBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 14, paddingHorizontal: 8 },
  hireBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", textAlign: "center" },
  avatarImage: { width: 96, height: 96, borderRadius: 48, marginBottom: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
