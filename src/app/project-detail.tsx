import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlert } from '../lib/AppAlert';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

const CLIENT_CANCEL_REASONS = [
  "Project no longer needed",
  "Budget changed",
  "Selected another contractor",
  "Contractor unavailable",
  "Other",
];

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, mode } = useTheme();

  const [project, setProject] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [ratingModalBid, setRatingModalBid] = useState<any>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState("");

  const [cancelReasonBidId, setCancelReasonBidId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    console.log('PROJECT:', projectData, 'ERROR:', projectError);
    if (projectData) setProject(projectData);

    const { data: bidsData, error: bidsError } = await supabase
      .from('bids')
      .select('*')
      .eq('project_id', id);
    console.log('BIDS:', bidsData, 'ERROR:', bidsError);

    if (bidsData && bidsData.length > 0) {
      const contractorIds = bidsData.map((b) => b.contractor_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', contractorIds);
      console.log('BID PROFILES:', profilesData, 'ERROR:', profilesError);

      const merged = bidsData.map((bid) => {
        const contractorProfile = profilesData?.find((p) => p.id === bid.contractor_id);
        return { ...bid, profile: contractorProfile };
      });
      setBids(merged);
    } else {
      setBids([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleLock = async (bidId: string) => {
    const { error } = await supabase
      .from('bids')
      .update({ status: 'locked' })
      .eq('id', bidId);

    if (error) {
      console.log('LOCK ERROR:', error.message);
      return;
    }

    console.log('Bid locked!');
    loadData();
  };

  // Client-initiated cancellation of a CONFIRMED bid opens the reason picker.
  const handleCancelConfirmed = (bidId: string) => {
    setCancelReasonBidId(bidId);
  };

  // Client cancellations carry NO penalty on the contractor (no trust/wallet hit,
  // and the per-project cancel_count that leads to "blocked" is untouched —
  // that counter only moves when the CONTRACTOR is the one who cancels).
  // The client themselves gets a soft trust hit only from their 2nd cancellation
  // in a calendar month onward.
  const submitClientCancellation = async (reason: string) => {
    if (!cancelReasonBidId || !project) return;
    const bidId = cancelReasonBidId;
    setCancelReasonBidId(null);

    const clientId = project.client_id;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('cancellations_this_month, last_cancel_month, trust_score')
      .eq('id', clientId)
      .single();

    const currentMonth = new Date().toISOString().slice(0, 7);
    let newCount = 1;
    let newTrustScore = profileData?.trust_score ?? 100;

    if (profileData?.last_cancel_month === currentMonth) {
      newCount = (profileData?.cancellations_this_month || 0) + 1;
    }

    if (newCount > 1) {
      newTrustScore = Math.max(0, newTrustScore - 5);
    }

    await supabase
      .from('profiles')
      .update({
        cancellations_this_month: newCount,
        last_cancel_month: currentMonth,
        trust_score: newTrustScore,
      })
      .eq('id', clientId);

    await supabase
      .from('bids')
      .update({ status: 'pending', not_selected_at: null })
      .eq('project_id', id)
      .eq('status', 'not_selected');

    await supabase
      .from('bids')
      .update({
        status: 'pending',
        cancelled_by: 'client',
        cancellation_reason: reason,
      })
      .eq('id', bidId);

    loadData();
  };

  const handleMarkComplete = (bid: any) => {
    setRatingModalBid(bid);
    setSelectedRating(0);
    setComment("");
  };

  const submitReview = async () => {
    if (!ratingModalBid || selectedRating === 0) {
      AppAlert.show("Select a rating", "Please tap a star rating before submitting.");
      return;
    }

    await supabase.from('bids').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', ratingModalBid.id);

    await supabase.from('reviews').insert({
      project_id: project.id,
      contractor_id: ratingModalBid.contractor_id,
      client_id: project.client_id,
      rating: selectedRating,
      comment: comment.trim(),
    });

    setRatingModalBid(null);
    loadData();
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
        </SafeAreaView>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Project not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  const visibleBids = bids.filter(
    (b) =>
      b.status !== 'not_selected' &&
      b.status !== 'cancelled_by_client' &&
      b.status !== 'cancelled_by_contractor' &&
      b.status !== 'blocked'
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Project Details</Text>
          <View style={styles.iconBtn} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View style={[styles.categoryBadge, { backgroundColor: colors.gold + '26', borderColor: colors.gold + '4D' }]}>
                <Text style={[styles.categoryText, { color: colors.gold }]}>{project.category}</Text>
              </View>
              <Text style={[styles.postedTime, { color: colors.textMuted }]}>
                Posted {new Date(project.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.projectTitle, { color: colors.textPrimary }]}>{project.title}</Text>

            {project.confirmation_code ? (
              <View style={[styles.codeBox, { backgroundColor: colors.gold + '1A', borderColor: colors.gold + '4D' }]}>
                <Ionicons name="key-outline" size={14} color={colors.gold} />
                <Text style={[styles.codeText, { color: colors.gold }]}>Confirmation Code: {project.confirmation_code}</Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{project.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>Timeline: {project.timeline}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="wallet-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>Budget: {project.budget}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{project.description}</Text>
          </View>

          <View style={styles.bidsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bids Received</Text>
            <Text style={[styles.bidsCount, { color: colors.textMuted }]}>{visibleBids.length} bids</Text>
          </View>

          {visibleBids.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.description, { color: colors.textSecondary }]}>No bids yet. Check back soon.</Text>
            </View>
          ) : (
            visibleBids.map((bid) => {
              const name = bid.profile?.name || 'Unknown';
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              const isLocked = bid.status === 'locked';
              const isConfirmed = bid.status === 'confirmed';
              const isCompleted = bid.status === 'completed';

              return (
                <View key={bid.id} style={[styles.bidCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <LinearGradient colors={[colors.blue, colors.blueDark]} style={styles.bidAvatar}>
                    <Text style={styles.bidAvatarText}>{initials}</Text>
                  </LinearGradient>
                  <View style={styles.bidBody}>
                    <Text style={[styles.bidName, { color: colors.textPrimary }]}>{name}</Text>
                    <Text style={[styles.bidSkill, { color: colors.textSecondary }]}>{bid.profile?.skill || ''}</Text>
                    {bid.message ? <Text style={[styles.bidMessage, { color: colors.textMuted }]}>{bid.message}</Text> : null}
                  </View>
                  <View style={styles.bidRight}>
                    <Text style={[styles.bidAmount, { color: colors.green }]}>
                      {bid.amount ? `₹${bid.amount}` : 'No quote'}
                    </Text>
                    {isCompleted ? (
                      <View style={[styles.acceptedBadge, { backgroundColor: colors.green + '26', borderColor: colors.green + '59' }]}>
                        <Text style={[styles.acceptedBadgeText, { color: colors.green }]}>Completed</Text>
                      </View>
                    ) : isConfirmed ? (
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={[styles.acceptedBadge, { backgroundColor: colors.green + '26', borderColor: colors.green + '59' }]}>
                          <Text style={[styles.acceptedBadgeText, { color: colors.green }]}>Confirmed</Text>
                        </View>
                        <Pressable
                          style={styles.messageBtn}
                          onPress={() => router.replace(`/chat?contractorId=${bid.contractor_id}&projectId=${id}&clientId=${project.client_id}&viewerRole=client` as never)}
                        >
                          <Ionicons name="chatbubble-outline" size={13} color={colors.blue} />
                          <Text style={[styles.messageBtnText, { color: colors.blue }]}>Message</Text>
                        </Pressable>
                        <Pressable onPress={() => handleMarkComplete(bid)}>
                          <Text style={[styles.completeLink, { color: colors.green }]}>Mark Complete</Text>
                        </Pressable>
                        <Pressable onPress={() => handleCancelConfirmed(bid.id)}>
                          <Text style={[styles.cancelLink, { color: colors.red }]}>Cancel</Text>
                        </Pressable>
                      </View>
                    ) : isLocked ? (
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={[styles.acceptedBadge, { backgroundColor: colors.green + '26', borderColor: colors.green + '59' }]}>
                          <Text style={[styles.acceptedBadgeText, { color: colors.green }]}>Locked</Text>
                        </View>
                        <Pressable
                          style={styles.messageBtn}
                          onPress={() => router.replace(`/chat?contractorId=${bid.contractor_id}&projectId=${id}&clientId=${project.client_id}&viewerRole=client` as never)}
                        >
                          <Ionicons name="chatbubble-outline" size={13} color={colors.blue} />
                          <Text style={[styles.messageBtnText, { color: colors.blue }]}>Message</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.acceptBtn, { backgroundColor: colors.blueDark }, pressed && styles.pressed]}
                        onPress={() => handleLock(bid.id)}
                      >
                        <Text style={styles.acceptBtnText}>Lock</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={ratingModalBid !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rate this Contractor</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 16 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setSelectedRating(star)}>
                  <Ionicons
                    name={star <= selectedRating ? "star" : "star-outline"}
                    size={32}
                    color={colors.gold}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.modalOtpInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Optional comment"
              placeholderTextColor={colors.textMuted}
              value={comment}
              onChangeText={setComment}
            />
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalCancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setRatingModalBid(null)}>
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirmBtn, { backgroundColor: colors.green }]} onPress={submitReview}>
                <Text style={styles.modalConfirmBtnText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={cancelReasonBidId !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Why are you cancelling?</Text>
            <View style={{ marginTop: 16, gap: 10 }}>
              {CLIENT_CANCEL_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  style={[styles.reasonOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => submitClientCancellation(reason)}
                >
                  <Text style={[styles.reasonOptionText, { color: colors.textPrimary }]}>{reason}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.modalDismissBtn} onPress={() => setCancelReasonBidId(null)}>
              <Text style={[styles.modalDismissBtnText, { color: colors.textMuted }]}>Never mind</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  categoryBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  categoryText: { fontSize: 13, fontWeight: "600" },
  postedTime: { fontSize: 12 },
  projectTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, marginBottom: 10 },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  codeText: { fontSize: 13, fontWeight: "700" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoText: { fontSize: 14, fontWeight: "500" },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24 },
  bidsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  bidsCount: { fontSize: 14, fontWeight: "500" },
  bidCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, gap: 12 },
  bidAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  bidAvatarText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  bidBody: { flex: 1 },
  bidName: { fontSize: 15, fontWeight: "700" },
  bidSkill: { fontSize: 13, marginTop: 2 },
  bidMessage: { fontSize: 12, marginTop: 4 },
  bidRight: { alignItems: "flex-end", gap: 6 },
  bidAmount: { fontSize: 15, fontWeight: "700" },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  acceptBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  acceptedBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  acceptedBadgeText: { fontSize: 12, fontWeight: "700" },
  cancelLink: { fontSize: 11, fontWeight: "600" },
  completeLink: { fontSize: 11, fontWeight: "600" },
  messageBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  messageBtnText: { fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", borderRadius: 20, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  modalOtpInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1, marginBottom: 16 },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  modalCancelBtnText: { fontSize: 14, fontWeight: "600" },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalConfirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  reasonOption: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  reasonOptionText: { fontSize: 14, fontWeight: "600" },
  modalDismissBtn: { marginTop: 16, paddingVertical: 12, alignItems: "center" },
  modalDismissBtnText: { fontSize: 14, fontWeight: "600" },
});