import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { getCurrentProfileId, getCurrentRole } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';

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

const RECENT_LIMIT = 7;
const DATE_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
] as const;
type DateFilterKey = (typeof DATE_FILTERS)[number]['key'];

export default function HistoryScreen() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');

  useEffect(() => {
    const load = async () => {
      const identity = await resolveMyIdentity();
      if (!identity) {
        setLoading(false);
        return;
      }
      setRole(identity.role);

      if (identity.role === 'contractor') {
        const { data: bidsData } = await supabase
          .from('bids')
          .select('*')
          .eq('contractor_id', identity.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        if (!bidsData || bidsData.length === 0) {
          setEntries([]);
          setLoading(false);
          return;
        }

        const projectIds = bidsData.map((b) => b.project_id);
        const { data: projectsData } = await supabase.from('projects').select('*').in('id', projectIds);
        const { data: reviewsData } = await supabase.from('reviews').select('*').eq('contractor_id', identity.id);

        const merged = bidsData.map((bid) => ({
          bid,
          project: projectsData?.find((p) => p.id === bid.project_id),
          review: reviewsData?.find((r) => r.project_id === bid.project_id),
        }));
        setEntries(merged);
      } else {
        const { data: projectsData } = await supabase.from('projects').select('*').eq('client_id', identity.id);
        if (!projectsData || projectsData.length === 0) {
          setEntries([]);
          setLoading(false);
          return;
        }
        const projectIds = projectsData.map((p) => p.id);

        const { data: bidsData } = await supabase
          .from('bids')
          .select('*')
          .in('project_id', projectIds)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        if (!bidsData || bidsData.length === 0) {
          setEntries([]);
          setLoading(false);
          return;
        }

        const contractorIds = bidsData.map((b) => b.contractor_id);
        const { data: contractorsData } = await supabase.from('profiles').select('*').in('id', contractorIds);
        const { data: reviewsData } = await supabase.from('reviews').select('*').eq('client_id', identity.id);

        const merged = bidsData.map((bid) => ({
          bid,
          project: projectsData.find((p) => p.id === bid.project_id),
          contractor: contractorsData?.find((c) => c.id === bid.contractor_id),
          review: reviewsData?.find((r) => r.project_id === bid.project_id),
        }));
        setEntries(merged);
      }

      setLoading(false);
    };
    load();
  }, []);

  const isContractor = role === 'contractor';

  const dateFiltered = entries.filter(({ bid }) => {
    if (dateFilter === 'all' || !bid.completed_at) return true;
    const days = dateFilter === '7d' ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return new Date(bid.completed_at).getTime() >= cutoff;
  });

  const visibleEntries = showAll ? dateFiltered : dateFiltered.slice(0, RECENT_LIMIT);
  const hasMore = !showAll && entries.length > RECENT_LIMIT;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>{showAll ? "Full History" : "History"}</Text>
          <View style={styles.iconBtn} />
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {showAll && (
              <View style={styles.filterRow}>
                {DATE_FILTERS.map((f) => (
                  <Pressable
                    key={f.key}
                    style={[styles.filterChip, dateFilter === f.key && styles.filterChipActive]}
                    onPress={() => setDateFilter(f.key)}
                  >
                    <Text style={[styles.filterChipText, dateFilter === f.key && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {visibleEntries.length === 0 ? (
              <View style={styles.centerWrap}>
                <Ionicons name="time-outline" size={40} color="#475569" />
                <Text style={styles.emptyText}>No completed projects yet.</Text>
              </View>
            ) : (
              visibleEntries.map(({ bid, project, contractor, review }) => (
                <View key={bid.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.projectTitle}>{project?.title || 'Project'}</Text>
                    {project?.category ? (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{project.category}</Text>
                      </View>
                    ) : null}
                  </View>

                  {isContractor ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={14} color="#64748b" />
                      <Text style={styles.metaText}>{project?.location || '—'}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.metaText}>{project?.budget || '—'}</Text>
                    </View>
                  ) : (
                    <View style={styles.metaRow}>
                      <Ionicons name="person-outline" size={14} color="#64748b" />
                      <Text style={styles.metaText}>{contractor?.name || 'Contractor'}</Text>
                    </View>
                  )}

                  <Text style={styles.dateText}>
                    Completed {bid.completed_at ? new Date(bid.completed_at).toLocaleDateString() : '—'}
                  </Text>

                  {review ? (
                    <View style={styles.reviewBox}>
                      <View style={styles.starsRow}>
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Ionicons key={i} name="star" size={14} color="#fbbf24" />
                        ))}
                      </View>
                      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                    </View>
                  ) : (
                    <Text style={styles.noReviewText}>No rating given</Text>
                  )}
                </View>
              ))
            )}

            {hasMore && (
              <Pressable style={styles.seeFullBtn} onPress={() => setShowAll(true)}>
                <Text style={styles.seeFullBtnText}>See Full History</Text>
                <Ionicons name="chevron-forward" size={16} color="#22c55e" />
              </Pressable>
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
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(30,41,59,0.6)",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  filterChipActive: { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "#22c55e" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  filterChipTextActive: { color: "#22c55e" },
  card: { backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1e293b", marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  projectTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#f8fafc" },
  categoryBadge: { backgroundColor: "rgba(251,191,36,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  categoryText: { fontSize: 11, fontWeight: "600", color: "#fbbf24" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  metaText: { fontSize: 13, color: "#94a3b8" },
  metaDot: { fontSize: 13, color: "#475569" },
  dateText: { fontSize: 12, color: "#64748b", marginTop: 4, marginBottom: 10 },
  reviewBox: { backgroundColor: "rgba(15,23,42,0.6)", borderRadius: 10, padding: 10 },
  starsRow: { flexDirection: "row", gap: 2, marginBottom: 4 },
  reviewComment: { fontSize: 13, color: "#cbd5e1", lineHeight: 19 },
  noReviewText: { fontSize: 12, color: "#475569", fontStyle: "italic" },
  seeFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
  },
  seeFullBtnText: { fontSize: 14, fontWeight: "700", color: "#22c55e" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});