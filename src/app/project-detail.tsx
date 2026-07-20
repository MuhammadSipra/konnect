import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [project, setProject] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleAccept = async (bidId: string) => {
    const { error } = await supabase
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bidId);

    if (error) {
      console.log('ACCEPT ERROR:', error.message);
      return;
    }

    console.log('Bid accepted! Other bids will now be hidden.');
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

  // If any bid is already accepted, only show that one.
  // Otherwise show all pending bids.
  const hasAccepted = bids.some((b) => b.status === 'accepted');
  const visibleBids = hasAccepted
    ? bids.filter((b) => b.status === 'accepted')
    : bids;

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
            <Text style={styles.sectionTitle}>
              {hasAccepted ? 'Confirmed Contractor' : 'Bids Received'}
            </Text>
            <Text style={styles.bidsCount}>{visibleBids.length} {hasAccepted ? '' : 'bids'}</Text>
          </View>

          {visibleBids.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.description}>No bids yet. Check back soon.</Text>
            </View>
          ) : (
            visibleBids.map((bid) => {
              const name = bid.profile?.name || 'Unknown';
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              const isAccepted = bid.status === 'accepted';

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
                    {isAccepted ? (
                      <View style={styles.acceptedBadge}>
                        <Text style={styles.acceptedBadgeText}>Accepted</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]}
                        onPress={() => handleAccept(bid.id)}
                      >
                        <Text style={styles.acceptBtnText}>Accept</Text>
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
  bidMessage: { fontSize: 12, color: "#64748b", marginTop: 4 },
  bidRight: { alignItems: "flex-end", gap: 6 },
  bidAmount: { fontSize: 15, fontWeight: "700", color: "#22c55e" },
  acceptBtn: { backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  acceptBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  acceptedBadge: { backgroundColor: "rgba(34,197,94,0.15)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(34,197,94,0.35)" },
  acceptedBadgeText: { fontSize: 12, fontWeight: "700", color: "#22c55e" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
