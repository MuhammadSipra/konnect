import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function JobDetailScreen() {
  const router = useRouter();
  const { bidId } = useLocalSearchParams<{ bidId?: string }>();
  const { colors, mode } = useTheme();

  const [bid, setBid] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!bidId) { setLoading(false); return; }

      const { data: bidData } = await supabase.from('bids').select('*').eq('id', bidId).single();
      if (bidData) {
        setBid(bidData);

        const { data: projectData } = await supabase.from('projects').select('*').eq('id', bidData.project_id).single();
        if (projectData) setProject(projectData);

        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*')
          .eq('project_id', bidData.project_id)
          .eq('contractor_id', bidData.contractor_id)
          .maybeSingle();
        if (reviewData) setReview(reviewData);
      }
      setLoading(false);
    };
    load();
  }, [bidId]);

  useEffect(() => {
    const onBackPress = () => { router.back(); return true; };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.green} />
        </SafeAreaView>
      </View>
    );
  }

  if (!bid || !project) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Job not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  const duration = bid.confirmed_at && bid.completed_at ? daysBetween(bid.confirmed_at, bid.completed_at) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Job Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.completedBadge, { backgroundColor: colors.green + '26', borderColor: colors.green + '59' }]}>
              <Text style={[styles.completedBadgeText, { color: colors.green }]}>Completed</Text>
            </View>
            <Text style={[styles.projectTitle, { color: colors.textPrimary }]}>{project.title}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{project.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{project.category}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Timeline</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.timelineRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>Started</Text>
              <Text style={[styles.timelineValue, { color: colors.textPrimary }]}>
                {bid.confirmed_at ? new Date(bid.confirmed_at).toLocaleDateString() : 'Not recorded'}
              </Text>
            </View>
            <View style={styles.timelineRow}>
              <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>Completed</Text>
              <Text style={[styles.timelineValue, { color: colors.textPrimary }]}>
                {bid.completed_at ? new Date(bid.completed_at).toLocaleDateString() : 'Not recorded'}
              </Text>
            </View>
            {duration !== null && (
              <Text style={[styles.durationText, { color: colors.textMuted }]}>{duration} day{duration === 1 ? '' : 's'} to complete</Text>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Client Review</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {review ? (
              <>
                <View style={styles.starsRow}>
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Ionicons key={i} name="star" size={18} color={colors.gold} />
                  ))}
                </View>
                {review.comment ? (
                  <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>
                ) : (
                  <Text style={[styles.noReviewText, { color: colors.textMuted }]}>No written comment.</Text>
                )}
              </>
            ) : (
              <Text style={[styles.noReviewText, { color: colors.textMuted }]}>No rating given yet.</Text>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Earnings</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.noteText, { color: colors.textMuted }]}>
                Payment collection and platform fee tracking are coming in a future update — not recorded for this job yet.
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, fontWeight: "500" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 40, height: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  completedBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, marginBottom: 10 },
  completedBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  projectTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  infoText: { fontSize: 14, fontWeight: "500" },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  timelineRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1 },
  timelineLabel: { fontSize: 14 },
  timelineValue: { fontSize: 14, fontWeight: "700" },
  durationText: { fontSize: 12, marginTop: 10, fontStyle: "italic" },
  starsRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  reviewComment: { fontSize: 14, lineHeight: 21 },
  noReviewText: { fontSize: 13, fontStyle: "italic" },
  noteRow: { flexDirection: "row", gap: 8 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.85 },
});