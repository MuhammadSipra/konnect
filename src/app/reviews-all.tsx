import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';

export default function ReviewsAllScreen() {
  const router = useRouter();
  const { contractorId } = useLocalSearchParams<{ contractorId?: string }>();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!contractorId) {
        setLoading(false);
        return;
      }
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('contractor_id', contractorId)
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
      setLoading(false);
    };
    load();
  }, [contractorId]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>All Reviews</Text>
          <View style={styles.iconBtn} />
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {reviews.length === 0 ? (
              <View style={styles.centerWrap}>
                <Ionicons name="star-outline" size={40} color="#475569" />
                <Text style={styles.emptyText}>No reviews yet.</Text>
              </View>
            ) : (
              reviews.map((r) => (
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
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
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
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, color: "#64748b", fontWeight: "500" },
  reviewCard: { backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1e293b", marginBottom: 12 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#334155", alignItems: "center", justifyContent: "center" },
  reviewAvatarText: { fontSize: 14, fontWeight: "700", color: "#f8fafc" },
  reviewMeta: { flex: 1 },
  reviewName: { fontSize: 15, fontWeight: "700", color: "#f8fafc" },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  reviewDate: { fontSize: 12, color: "#64748b", marginLeft: 8 },
  reviewText: { fontSize: 14, color: "#94a3b8", lineHeight: 22 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});