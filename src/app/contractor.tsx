import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    StatusBar,
    Alert,
    TextInput,
  } from "react-native";
  import { SafeAreaView } from "react-native-safe-area-context";
  import { LinearGradient } from "expo-linear-gradient";
  import { useRouter } from "expo-router";
  import { Ionicons } from "@expo/vector-icons";

  const TABS = [
    { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
    { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/jobs" },
    { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
    { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
  ];

  const CONTRACTOR_ID = 1; // TODO: replace with real logged-in user id once auth is wired up

  export default function ContractorDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [activeJobs, setActiveJobs] = useState<any[]>([]);
    const [bidStatuses, setBidStatuses] = useState<Record<number, string>>({});

    const getLeads = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      console.log('LEADS:', data, 'ERROR:', error);
      if (data) setLeads(data);
    };

    const getActiveJobs = async () => {
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .eq('contractor_id', CONTRACTOR_ID)
        .in('status', ['accepted', 'confirmed']);

      console.log('BIDS:', bids, 'ERROR:', bidsError);

      if (bids && bids.length > 0) {
        const projectIds = bids.map((b) => b.project_id);
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds);

        console.log('ACTIVE PROJECTS:', projectsData, 'ERROR:', projectsError);
        if (projectsData) setActiveJobs(projectsData);
      } else {
        setActiveJobs([]);
      }
    };

    const getBidStatuses = async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('project_id, status')
        .eq('contractor_id', CONTRACTOR_ID);

      console.log('BID STATUSES:', data, 'ERROR:', error);

      if (data) {
        const map: Record<number, string> = {};
        data.forEach((b) => {
          map[b.project_id] = b.status;
        });
        setBidStatuses(map);
      }
    };
    const cleanupExpiredBids = async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('bids')
        .delete()
        .eq('contractor_id', CONTRACTOR_ID)
        .eq('status', 'not_selected')
        .lt('not_selected_at', sixHoursAgo);
    };

    const refreshAll = async () => {
      await cleanupExpiredBids();
      await Promise.all([getLeads(), getActiveJobs(), getBidStatuses()]);
    };

    useEffect(() => {
      const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('SESSION:', session);
        if (session?.user) {
          setUser(session.user);
        }
      };
      getSession();

      const getProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', CONTRACTOR_ID)
          .single();
        console.log('PROFILE:', data, 'ERROR:', error);
        if (data) setProfile(data);
      };
      getProfile();

      refreshAll();
    }, []);

    const handleInterested = async (leadId: number) => {
      const { data: existing } = await supabase
        .from('bids')
        .select('id')
        .eq('project_id', leadId)
        .eq('contractor_id', CONTRACTOR_ID)
        .maybeSingle();

      if (existing) {
        console.log('Already bid on this project!');
        return;
      }

      const { error } = await supabase.from('bids').insert({
        project_id: leadId,
        contractor_id: CONTRACTOR_ID,
        amount: 0,
        status: 'pending',
      });

      if (error) {
        console.log('BID ERROR:', error.message);
      } else {
        console.log('Bid placed!');
        refreshAll();
      }
    };

    const handleCancel = async (leadId: number) => {
      const status = bidStatuses[leadId];
      const isConfirmedBid = status === 'confirmed' || status === 'accepted';

      Alert.alert(
        isConfirmedBid ? "Cancel Confirmed Job" : "Cancel Interest",
        isConfirmedBid
          ? "Are you sure? Since this job was confirmed, cancelling now may lead to a trust score and wallet penalty (unless this is your first cancellation this month). A second cancellation on this same project will block you from it permanently."
          : "Are you sure you want to withdraw your interest? No penalty applies before confirmation.",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: async () => {
              if (isConfirmedBid) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('cancellations_this_month, last_cancel_month, trust_score, wallet_balance')
                  .eq('id', CONTRACTOR_ID)
                  .single();

                const currentMonth = new Date().toISOString().slice(0, 7);
                let newCount = 1;
                let newTrustScore = profileData?.trust_score ?? 100;
                let newWallet = profileData?.wallet_balance ?? 0;

                if (profileData?.last_cancel_month === currentMonth) {
                  newCount = (profileData?.cancellations_this_month || 0) + 1;
                }

                if (newCount > 1) {
                  newTrustScore = Math.max(0, newTrustScore - 10);
                  newWallet = Math.max(0, newWallet - 50);
                }

                await supabase
                  .from('profiles')
                  .update({
                    cancellations_this_month: newCount,
                    last_cancel_month: currentMonth,
                    trust_score: newTrustScore,
                    wallet_balance: newWallet,
                  })
                  .eq('id', CONTRACTOR_ID);

                // Reopen the project for the other contractors who were sidelined
                await supabase
                  .from('bids')
                  .update({ status: 'pending', not_selected_at: null })
                  .eq('project_id', leadId)
                  .eq('status', 'not_selected');

                // Track this contractor's cancellations on THIS specific project
                const { data: myBid } = await supabase
                  .from('bids')
                  .select('id, cancel_count')
                  .eq('project_id', leadId)
                  .eq('contractor_id', CONTRACTOR_ID)
                  .single();

                const newCancelCount = (myBid?.cancel_count || 0) + 1;

                await supabase
                  .from('bids')
                  .update({
                    status: newCancelCount >= 2 ? 'blocked' : 'pending',
                    cancel_count: newCancelCount,
                  })
                  .eq('id', myBid?.id);
              } else {
                // Withdrawing interest before confirmation — no penalty, free to re-interest anytime
                await supabase
                  .from('bids')
                  .delete()
                  .eq('project_id', leadId)
                  .eq('contractor_id', CONTRACTOR_ID);
              }

              refreshAll();
            },
          },
        ]
      );
    };

    const handleConfirmCode = async (leadId: number, enteredCode: string) => {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('confirmation_code')
        .eq('id', leadId)
        .single();

      if (projectError || !projectData) {
        Alert.alert("Error", "Could not verify code. Try again.");
        return;
      }

      if (enteredCode.trim() !== projectData.confirmation_code) {
        Alert.alert("Wrong Code", "The code you entered doesn't match. Please check with the client and try again.");
        return;
      }

      Alert.alert(
        "Confirm This Job",
        "Once confirmed, cancelling later may result in a trust score and wallet penalty (unless it's your first cancellation this month). Do you want to proceed?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "OK, Confirm",
            onPress: async () => {
              const { data: myBid } = await supabase
                .from('bids')
                .select('id')
                .eq('project_id', leadId)
                .eq('contractor_id', CONTRACTOR_ID)
                .single();

              if (myBid) {
                await supabase
                  .from('bids')
                  .update({ status: 'confirmed' })
                  .eq('id', myBid.id);
              }

              await supabase
                .from('bids')
                .update({ status: 'not_selected', not_selected_at: new Date().toISOString() })
                .eq('project_id', leadId)
                .neq('contractor_id', CONTRACTOR_ID);

              refreshAll();
            },
          },
        ]
      );
    };
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />

        <LinearGradient
          colors={["#0f172a", "#020617", "#0a0f1a"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.glowGreen} />
        <View style={styles.glowBlue} />

        <SafeAreaView style={styles.safe} edges={["top"]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#f8fafc" />
            </Pressable>
            <Text style={styles.headerTitle}>Contractor Dashboard</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={["#1e293b", "#0f172a"]}
                style={styles.profileGradient}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile?.name
                      ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : '..'}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile?.name || 'Loading...'}</Text>
                  <Text style={styles.profileSkill}>{profile?.skill || ''}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    <Text style={styles.ratingText}>4.8</Text>
                    <Text style={styles.ratingCount}>(127 reviews)</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Active Jobs */}
            <SectionHeader title="Active Jobs" action="See all" />
            {activeJobs.map((job) => (
              <JobCard key={job.id} job={job} onCancel={() => handleCancel(job.id)} />
            ))}

            {/* New Leads */}
            <SectionHeader title="New Leads" action="View all" />
            {leads
              .filter((lead) => !activeJobs.some((job) => job.id === lead.id))
              .filter((lead) => bidStatuses[lead.id] !== 'blocked')
              .map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  bidStatus={bidStatuses[lead.id]}
                  onInterested={() => handleInterested(lead.id)}
                  onCancel={() => handleCancel(lead.id)}
                  onConfirmCode={(code) => handleConfirmCode(lead.id, code)}
                />
              ))}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom Tab Bar */}
          <View style={styles.tabBarWrap}>
            <SafeAreaView edges={["bottom"]}>
              <View style={styles.tabBar}>
                {TABS.map((tab) => {
                  const active = tab.key === "home";
                  return (
                    <Pressable
                      key={tab.key}
                      style={styles.tabItem}
                      onPress={() => {
                        if (tab.key === "home") return;
                        router.push(tab.route as never);
                        // wire up other tabs later
                      }}
                    >
                      <Ionicons
                        name={active ? tab.icon : (`${tab.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                        size={22}
                        color={active ? "#22c55e" : "#64748b"}
                      />
                      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SafeAreaView>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  function SectionHeader({ title, action }: { title: string; action: string }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      </View>
    );
  }

  function JobCard({
    job,
    onCancel,
  }: {
    job: any;
    onCancel: () => void;
  }) {
    const router = useRouter();
    return (
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{job.title}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.cardDetail}>{job.location}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.cardBudget}>{job.budget}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable
              style={styles.messageBtn}
              onPress={() =>
                router.push(
                  `/chat?contractorId=${CONTRACTOR_ID}&projectId=${job.id}&clientId=${job.client_id}&viewerRole=contractor` as never
                )
              }
            >
              <Ionicons name="chatbubble-outline" size={13} color="#3b82f6" />
              <Text style={styles.messageBtnText}>Message</Text>
            </Pressable>
            <Pressable onPress={onCancel}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  }

  function LeadCard({
    lead,
    bidStatus,
    onInterested,
    onCancel,
    onConfirmCode,
  }: {
    lead: any;
    bidStatus?: string;
    onInterested: () => void;
    onCancel: () => void;
    onConfirmCode: (code: string) => void;
  }) {
    const [codeInput, setCodeInput] = useState("");

    const isLocked = bidStatus === 'locked';
    const isConfirmed = bidStatus === 'accepted' || bidStatus === 'confirmed';
    const isPending = bidStatus === 'pending';
    const isCancelled =
      bidStatus === 'cancelled' ||
      bidStatus === 'cancelled_by_client' ||
      bidStatus === 'cancelled_by_contractor';
    const isNotSelected = bidStatus === 'not_selected';

    return (
      <Pressable style={({ pressed }) => [styles.card, styles.leadCard, pressed && styles.pressed]}>
        <View style={styles.leadAccent} />
        <View style={styles.leadContent}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{lead.title}</Text>
            <Text style={styles.leadTime}>{new Date(lead.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.cardDetail}>{lead.location}</Text>
          </View>

          {isLocked && (
            <View style={styles.codeEntryWrap}>
              <Text style={styles.codeEntryLabel}>Client shortlisted you! Enter their confirmation code:</Text>
              <View style={styles.codeEntryRow}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="4-digit code"
                  placeholderTextColor="#64748b"
                  value={codeInput}
                  onChangeText={setCodeInput}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Pressable
                  style={styles.codeSubmitBtn}
                  onPress={() => onConfirmCode(codeInput)}
                >
                  <Text style={styles.codeSubmitText}>Confirm</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.leadFooter}>
            <Text style={styles.cardBudget}>{lead.budget}</Text>

            {isConfirmed ? (
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedBadgeText}>Confirmed</Text>
                </View>
                <Pressable onPress={onCancel}>
                  <Text style={styles.cancelLink}>Cancel</Text>
                </Pressable>
              </View>
            ) : isLocked ? null : isPending ? (
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
                <Pressable onPress={onCancel}>
                  <Text style={styles.cancelLink}>Cancel</Text>
                </Pressable>
              </View>
            ) : isCancelled ? (
              <View style={styles.cancelledBadge}>
                <Text style={styles.cancelledBadgeText}>Cancelled</Text>
              </View>
            ) : isNotSelected ? (
              <View style={styles.cancelledBadge}>
                <Text style={styles.cancelledBadgeText}>Went to another contractor</Text>
              </View>
              ) : (
                <Pressable style={styles.interestBtn} onPress={onInterested}>
                  <Text style={styles.interestBtnText}>I'm Interested</Text>
                </Pressable>
              )}
                     </View>
        </View>
      </Pressable>
    );
  }

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: "#020617",
    },
    glowGreen: {
      position: "absolute",
      top: -60,
      right: -40,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: "rgba(34, 197, 94, 0.1)",
    },
    glowBlue: {
      position: "absolute",
      bottom: 120,
      left: -80,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: "rgba(59, 130, 246, 0.08)",
    },
    safe: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "rgba(30, 41, 59, 0.8)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#1e293b",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#f8fafc",
      letterSpacing: -0.3,
    },
    headerSpacer: {
      width: 40,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    profileCard: {
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 28,
      borderWidth: 1,
      borderColor: "#1e293b",
    },
    profileGradient: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      gap: 16,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#22c55e",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 22,
      fontWeight: "800",
      color: "#ffffff",
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 22,
      fontWeight: "700",
      color: "#f8fafc",
      letterSpacing: -0.3,
    },
    profileSkill: {
      marginTop: 4,
      fontSize: 14,
      color: "#94a3b8",
      fontWeight: "500",
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      gap: 4,
    },
    ratingText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fbbf24",
    },
    ratingCount: {
      fontSize: 13,
      color: "#64748b",
      marginLeft: 4,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#f1f5f9",
    },
    sectionAction: {
      fontSize: 14,
      fontWeight: "600",
      color: "#22c55e",
    },
    card: {
      backgroundColor: "rgba(30, 41, 59, 0.6)",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#1e293b",
    },
    leadCard: {
      flexDirection: "row",
      overflow: "hidden",
      padding: 0,
    },
    leadAccent: {
      width: 4,
      backgroundColor: "#3b82f6",
    },
    leadContent: {
      flex: 1,
      padding: 16,
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
    },
    cardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: "#f8fafc",
    },
    statusBadge: {
      backgroundColor: "rgba(34, 197, 94, 0.15)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(34, 197, 94, 0.35)",
    },
    statusText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#22c55e",
      textTransform: "uppercase",
    },
    cardMeta: {
      marginTop: 6,
      fontSize: 14,
      color: "#94a3b8",
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 8,
    },
    cardDetail: {
      fontSize: 13,
      color: "#64748b",
    },
    cardBudget: {
      marginTop: 10,
      fontSize: 16,
      fontWeight: "700",
      color: "#22c55e",
    },
    leadTime: {
      fontSize: 12,
      color: "#64748b",
      fontWeight: "500",
    },
    leadFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    },
    interestBtn: {
      backgroundColor: "#2563eb",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    interestBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#ffffff",
    },
    pendingBadge: {
      backgroundColor: "rgba(251, 191, 36, 0.15)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(251, 191, 36, 0.35)",
    },
    pendingBadgeText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#fbbf24",
    },
    confirmedBadge: {
      backgroundColor: "rgba(34, 197, 94, 0.15)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(34, 197, 94, 0.35)",
    },
    confirmedBadgeText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#22c55e",
    },
    cancelledBadge: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.35)",
    },
    cancelledBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#ef4444",
    },
    cancelLink: {
      fontSize: 11,
      color: "#ef4444",
      fontWeight: "600",
    },
    codeEntryWrap: {
      marginTop: 12,
      backgroundColor: "rgba(251, 191, 36, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(251, 191, 36, 0.25)",
      borderRadius: 12,
      padding: 12,
    },
    codeEntryLabel: {
      fontSize: 12,
      color: "#fbbf24",
      fontWeight: "600",
      marginBottom: 8,
    },
    codeEntryRow: {
      flexDirection: "row",
      gap: 8,
    },
    codeInput: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.8)",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: "#f8fafc",
      borderWidth: 1,
      borderColor: "#1e293b",
    },
    codeSubmitBtn: {
      backgroundColor: "#2563eb",
      paddingHorizontal: 14,
      justifyContent: "center",
      borderRadius: 8,
    },
    codeSubmitText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#fff",
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    tabBarWrap: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderTopWidth: 1,
      borderTopColor: "#1e293b",
    },
    tabBar: {
      flexDirection: "row",
      paddingTop: 10,
      paddingBottom: 6,
    },
    tabItem: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: "#64748b",
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
    tabLabelActive: {
      color: "#22c55e",
    },
  });
