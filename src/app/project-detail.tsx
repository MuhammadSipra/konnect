import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';

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
      Alert.alert("Select a rating", "Please tap a star rating before submitting.");
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
      <View style={styles.root}>
        <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </SafeAreaView>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <Text style={styles.emptyText}>Project not found</Text>
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={styles.iconBtn} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{project.category}</Text>
              </View>
              <Text style={styles.postedTime}>
                Posted {new Date(project.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.projectTitle}>{project.title}</Text>

            {project.confirmation_code ? (
              <View style={styles.codeBox}>
                <Ionicons name="key-outline" size={14} color="#fbbf24" />
                <Text style={styles.codeText}>Confirmation Code: {project.confirmation_code}</Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#64748b" />
              <Text style={styles.infoText}>{project.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#64748b" />
              <Text style={styles.infoText}>Timeline: {project.timeline}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="wallet-outline" size={16} color="#64748b" />
              <Text style={styles.infoText}>Budget: {project.budget}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.card}>
            <Text style={styles.description}>{project.description}</Text>
          </View>

          <View style={styles.bidsHeader}>
            <Text style={styles.sectionTitle}>Bids Received</Text>
            <Text style={styles.bidsCount}>{visibleBids.length} bids</Text>
          </View>

          {visibleBids.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.description}>No bids yet. Check back soon.</Text>
            </View>
          ) : (
            visibleBids.map((bid) => {
              const name = bid.profile?.name || 'Unknown';
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              const isLocked = bid.status === 'locked';
              const isConfirmed = bid.status === 'confirmed';
              const isCompleted = bid.status === 'completed';

              return (
                <View key={bid.id} style={styles.bidCard}>
                  <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.bidAvatar}>
                    <Text style={styles.bidAvatarText}>{initials}</Text>
                  </LinearGradient>
                  <View style={styles.bidBody}>
                    <Text style={styles.bidName}>{name}</Text>
                    <Text style={styles.bidSkill}>{bid.profile?.skill || ''}</Text>
                    {bid.message ? <Text style={styles.bidMessage}>{bid.message}</Text> : null}
                  </View>
                  <View style={styles.bidRight}>
                    <Text style={styles.bidAmount}>
                      {bid.amount ? `₹${bid.amount}` : 'No quote'}
                    </Text>
                    {isCompleted ? (
                      <View style={styles.acceptedBadge}>
                        <Text style={styles.acceptedBadgeText}>Completed</Text>
                      </View>
                    ) : isConfirmed ? (
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={styles.acceptedBadge}>
                          <Text style={styles.acceptedBadgeText}>Confirmed</Text>
                        </View>
                        <Pressable
                          style={styles.messageBtn}
                          onPress={() => router.replace(`/chat?contractorId=${bid.contractor_id}&projectId=${id}&clientId=${project.client_id}&viewerRole=client` as never)}
                        >
                          <Ionicons name="chatbubble-outline" size={13} color="#3b82f6" />
                          <Text style={styles.messageBtnText}>Message</Text>
                        </Pressable>
                        <Pressable onPress={() => handleMarkComplete(bid)}>
                          <Text style={styles.completeLink}>Mark Complete</Text>
                        </Pressable>
                        <Pressable onPress={() => handleCancelConfirmed(bid.id)}>
                          <Text style={styles.cancelLink}>Cancel</Text>
                        </Pressable>
                      </View>
                    ) : isLocked ? (
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={styles.acceptedBadge}>
                          <Text style={styles.acceptedBadgeText}>Locked</Text>
                        </View>
                        <Pressable
                          style={styles.messageBtn}
                          onPress={() => router.replace(`/chat?contractorId=${bid.contractor_id}&projectId=${id}&clientId=${project.client_id}&viewerRole=client` as never)}
                        >
                          <Ionicons name="chatbubble-outline" size={13} color="#3b82f6" />
                          <Text style={styles.messageBtnText}>Message</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]}
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
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate this Contractor</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 16 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setSelectedRating(star)}>
                  <Ionicons
                    name={star <= selectedRating ? "star" : "star-outline"}
                    size={32}
                    color="#fbbf24"
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.modalOtpInput}
              placeholder="Optional comment"
              placeholderTextColor="#64748b"
              value={comment}
              onChangeText={setComment}
            />
            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setRatingModalBid(null)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={submitReview}>
                <Text style={styles.modalConfirmBtnText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={cancelReasonBidId !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Why are you cancelling?</Text>
            <View style={{ marginTop: 16, gap: 10 }}>
              {CLIENT_CANCEL_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  style={styles.reasonOption}
                  onPress={() => submitClientCancellation(reason)}
                >
                  <Text style={styles.reasonOptionText}>{reason}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.modalDismissBtn} onPress={() => setCancelReasonBidId(null)}>
              <Text style={styles.modalDismissBtnText}>Never mind</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  safe: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#64748b", fontWeight: "500" },
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
  projectTitle: { fontSize: 22, fontWeight: "800", color: "#f8fafc", letterSpacing: -0.5, marginBottom: 10 },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  codeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fbbf24",
  },
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
  bidMessage: { fontSize: 12, color: "#64748b", marginTop: 4 },
  bidRight: { alignItems: "flex-end", gap: 6 },
  bidAmount: { fontSize: 15, fontWeight: "700", color: "#22c55e" },
  acceptBtn: { backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  acceptBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  acceptedBadge: { backgroundColor: "rgba(34,197,94,0.15)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(34,197,94,0.35)" },
  acceptedBadgeText: { fontSize: 12, fontWeight: "700", color: "#22c55e" },
  cancelLink: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "600",
  },
  completeLink: {
    fontSize: 11,
    color: "#22c55e",
    fontWeight: "600",
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", backgroundColor: "#0f172a", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "#1e293b" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc", textAlign: "center" },
  modalOtpInput: { backgroundColor: "rgba(30,41,59,0.7)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#f8fafc", borderWidth: 1, borderColor: "#1e293b", marginBottom: 16 },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(30,41,59,0.7)", borderWidth: 1, borderColor: "#1e293b" },
  modalCancelBtnText: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#22c55e" },
  modalConfirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  reasonOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(30,41,59,0.7)",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  reasonOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f8fafc",
  },
  modalDismissBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDismissBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
});