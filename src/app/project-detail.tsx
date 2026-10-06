import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, Modal,
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
import { getCurrentProfileId } from '../lib/currentProfile';
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
  const { id, viewerRole } = useLocalSearchParams<{ id?: string; viewerRole?: string }>();
  const { colors, mode } = useTheme();

  const isContractorView = viewerRole === 'contractor';
  const myContractorId = isContractorView ? getCurrentProfileId() : null;

  const [project, setProject] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [ratingModalBid, setRatingModalBid] = useState<any>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const submittingReviewRef = useRef(false);

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

  useEffect(() => {
    const onBackPress = () => {
      router.back();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

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

  // Client removes a shortlist BEFORE the confirmation code is used: free, no penalty.
  const handleUnlock = (bidId: string) => {
    AppAlert.show(
      "Remove shortlist?",
      "This contractor will go back to Pending. No penalty applies before the confirmation code is used.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Unlock",
          style: "destructive",
          onPress: async () => {
            await supabase.from('bids').update({ status: 'pending' }).eq('id', bidId);
            loadData();
          },
        },
      ]
    );
  };

  // Contractor withdraws a pending/locked bid BEFORE confirmation: free, no penalty.
  const handleWithdraw = (bidId: string) => {
    if (!myContractorId) return;
    AppAlert.show(
      "Withdraw your bid?",
      "Your bid will be removed from this project. No penalty applies before confirmation.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Withdraw",
          style: "destructive",
          onPress: async () => {
            await supabase.from('bids').delete().eq('id', bidId).eq('contractor_id', myContractorId);
            router.back();
          },
        },
      ]
    );
  };

  // Client-initiated cancellation of a CONFIRMED bid opens the reason picker.
  const handleCancelConfirmed = (bidId: string) => {
    setCancelReasonBidId(bidId);
  };

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
    if (submittingReviewRef.current) return; // blocks double taps
    if (!ratingModalBid || selectedRating === 0) {
      AppAlert.show("Select a rating", "Please tap a star rating before submitting.");
      return;
    }

    submittingReviewRef.current = true;
    setSubmittingReview(true);
    try {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('project_id', project.id)
        .eq('contractor_id', ratingModalBid.contractor_id)
        .limit(1);

      await supabase.from('bids').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', ratingModalBid.id);

      if (!existingReview || existingReview.length === 0) {
        await supabase.from('reviews').insert({
          project_id: project.id,
          contractor_id: ratingModalBid.contractor_id,
          client_id: project.client_id,
          rating: selectedRating,
          comment: comment.trim(),
        });
      }

      setRatingModalBid(null);
      loadData();
    } finally {
      submittingReviewRef.current = false;
      setSubmittingReview(false);
    }
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

  const visibleBids = bids
    .filter(
      (b) =>
        b.status !== 'not_selected' &&
        b.status !== 'cancelled_by_client' &&
        b.status !== 'cancelled_by_contractor' &&
        b.status !== 'blocked'
    )
    .filter((b) => !isContractorView || b.contractor_id === myContractorId);

  // Show the client who cancelled (and why) while the project is open again.
  const hasActiveBid = bids.some((b) => ['confirmed', 'accepted', 'completed'].includes(b.status));
  const contractorCancelledBids =
    isContractorView || hasActiveBid
      ? []
      : bids.filter((b) => b.cancelled_by === 'contractor' && (b.status === 'pending' || b.status === 'blocked'));

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
          <View style={styles.headerSpacer} />
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

            {project.confirmation_code && !isContractorView ? (
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

          {contractorCancelledBids.map((b) => (
            <View key={`cancel-${b.id}`} style={styles.cancelBanner}>
              <Ionicons name="alert-circle-outline" size={20} color="#f97316" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelBannerTitle}>{b.profile?.name || 'The contractor'} cancelled this job</Text>
                {b.cancellation_reason ? (
                  <Text style={[styles.cancelBannerText, { color: colors.textSecondary }]}>Reason: {b.cancellation_reason}</Text>
                ) : null}
                <Text style={[styles.cancelBannerText, { color: colors.textSecondary }]}>
                  Your project is open again and we're looking for another contractor.
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.bidsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{isContractorView ? 'Your Bid' : 'Bids Received'}</Text>
            {!isContractorView && <Text style={[styles.bidsCount, { color: colors.textMuted }]}>{visibleBids.length} bids</Text>}
          </View>

          {visibleBids.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {isContractorView ? "No bid found." : "No bids yet. Check back soon."}
              </Text>
            </View>
          ) : (
            visibleBids.map((bid) => {
              const name = bid.profile?.name || 'Unknown';
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              const isLocked = bid.status === 'locked';
              const isConfirmed = bid.status === 'confirmed';
              const isCompleted = bid.status === 'completed';
              const chatViewerRole = isContractorView ? 'contractor' : 'client';

              return (
                <View key={bid.id} style={[styles.bidCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <LinearGradient colors={[colors.blue, colors.blueDark]} style={styles.bidAvatar}>
                    <Text style={styles.bidAvatarText}>{initials}</Text>
                  </LinearGradient>
                  <View style={styles.bidBody}>
                    <Text style={[styles.bidName, { color: colors.textPrimary }]}>{name}</Text>
                    <Text style={[styles.bidSkill, { color: colors.textSecondary }]}>{bid.profile?.skill || ''}</Text>
                    {bid.message ? <Text style={[styles.bidMessage, { color: colors.textMuted }]}>{bid.message}</Text> : null}
                    {!isContractorView && bid.cancelled_by === 'contractor' && bid.status === 'pending' ? (
                      <Text style={styles.cancelledTag}>Cancelled this job earlier</Text>
                    ) : null}
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
                          onPress={() => router.push(`/chat?contractorId=${bid.contractor_id}&projectId=${id}&clientId=${project.client_id}&viewerRole=${chatViewerRole}` as never)}
                        >
                          <Ionicons name="chatbubble-outline" size={13} color={colors.blue} />
                          <Text style={[styles.messageBtnText, { color: colors.blue }]}>Message</Text>
                        </Pressable>
                        {!isContractorView && (
                          <>
                            <Pressable onPress={() => handleMarkComplete(bid)}>
                              <Text style={[styles.completeLink, { color: colors.green }]}>Mark Complete</Text>
                            </Pressable>
                            <Pressable onPress={() => handleCancelConfirmed(bid.id)}>
                              <Text style={[styles.cancelLink, { color: colors.red }]}>Cancel</Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    ) : isLocked ? (
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={[styles.acceptedBadge, { backgroundColor: colors.green + '26', borderColor: colors.green + '59' }]}>
                          <Text style={[styles.acceptedBadgeText, { color: colors.green }]}>Locked</Text>
                        </View>
                        <Pressable
                          style={styles.messageBtn}
                          onPress={() => router.push(`/chat?contractorId=${bid.contractor_id}&projectId=${id}&clientId=${project.client_id}&viewerRole=${chatViewerRole}` as never)}
                        >
                          <Ionicons name="chatbubble-outline" size={13} color={colors.blue} />
                          <Text style={[styles.messageBtnText, { color: colors.blue }]}>Message</Text>
                        </Pressable>
                        {isContractorView ? (
                          <Pressable onPress={() => handleWithdraw(bid.id)}>
                            <Text style={[styles.cancelLink, { color: colors.red }]}>Withdraw</Text>
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => handleUnlock(bid.id)}>
                            <Text style={[styles.cancelLink, { color: colors.red }]}>Unlock</Text>
                          </Pressable>
                        )}
                      </View>
                    ) : isContractorView ? (
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={[styles.acceptedBadge, { backgroundColor: colors.gold + '26', borderColor: colors.gold + '59' }]}>
                          <Text style={[styles.acceptedBadgeText, { color: colors.gold }]}>Pending</Text>
                        </View>
                        <Pressable onPress={() => handleWithdraw(bid.id)}>
                          <Text style={[styles.cancelLink, { color: colors.red }]}>Withdraw</Text>
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
              <Pressable
                disabled={submittingReview}
                style={[styles.modalConfirmBtn, { backgroundColor: colors.green, opacity: submittingReview ? 0.6 : 1 }]}
                onPress={submitReview}
              >
                <Text style={styles.modalConfirmBtnText}>{submittingReview ? 'Submitting...' : 'Submit'}</Text>
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
  headerSpacer: { width: 40, height: 40 },
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
  cancelBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(249, 115, 22, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.35)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  cancelBannerTitle: { fontSize: 14, fontWeight: "700", color: "#f97316", marginBottom: 4 },
  cancelBannerText: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  cancelledTag: { fontSize: 11, fontWeight: "600", color: "#f97316", marginTop: 4 },
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