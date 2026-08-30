import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentProfileId, setCurrentProfile } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';

  const TABS = [
    { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
    { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/jobs" },
    { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
    { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
  ];

  export default function ContractorDashboard() {
    const router = useRouter();
    const [contractorId, setContractorId] = useState<number | null>(null);
    const [resolvingId, setResolvingId] = useState(true);

    const [profile, setProfile] = useState<any>(null);
    const [avgRating, setAvgRating] = useState(0);
const [reviewCount, setReviewCount] = useState(0);
    const [leads, setLeads] = useState<any[]>([]);
    const [activeJobs, setActiveJobs] = useState<any[]>([]);
    const [bidStatuses, setBidStatuses] = useState<Record<number, string>>({});
    const [portfolio, setPortfolio] = useState<any[]>([]);
const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Resolve who's logged in — memory first, otherwise fall back to the Supabase session
    const resolveContractorId = async (): Promise<number | null> => {
      const cached = getCurrentProfileId();
      if (cached) return cached;

      const { data: sessionData } = await supabase.auth.getSession();
      const authUserId = sessionData?.session?.user?.id;
      if (!authUserId) return null;

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('user_type', 'contractor')
        .maybeSingle();

      if (profileRow) {
        setCurrentProfile(profileRow.id, 'contractor');
        return profileRow.id;
      }
      return null;
    };

    const getProfile = async (id: number) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      console.log('PROFILE:', data, 'ERROR:', error);
      if (data) setProfile(data);
    };
    const getPortfolio = async (id: number) => {
      const { data } = await supabase
        .from('portfolio_photos')
        .select('*')
        .eq('contractor_id', id)
        .order('created_at', { ascending: false });
      if (data) setPortfolio(data);
    };
    
    const handleAddPortfolioPhoto = async () => {
      if (!contractorId) return;
    
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo access to upload portfolio photos.");
        return;
      }
    
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;
    
      setUploadingPhoto(true);
    
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `portfolio/${contractorId}_${Date.now()}.${fileExt}`;
    
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, arrayBuffer, { contentType: blob.type || 'image/jpeg' });
    
        if (uploadError) {
          Alert.alert("Upload Error", uploadError.message);
          setUploadingPhoto(false);
          return;
        }
    
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
    
        await supabase.from('portfolio_photos').insert({
          contractor_id: contractorId,
          photo_url: urlData.publicUrl,
        });
    
        await getPortfolio(contractorId);
      } catch (err) {
        Alert.alert("Error", "Could not upload photo.");
      } finally {
        setUploadingPhoto(false);
      }
    };
    const getReviews = async (id: number) => {
      const { data } = await supabase.from('reviews').select('rating').eq('contractor_id', id);
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAvgRating(avg);
        setReviewCount(data.length);
      }
    };

    const getLeads = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      console.log('LEADS:', data, 'ERROR:', error);
      if (data) setLeads(data);
    };

    const getActiveJobs = async (id: number) => {
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .eq('contractor_id', id)
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

    const getBidStatuses = async (id: number) => {
      const { data, error } = await supabase
        .from('bids')
        .select('project_id, status')
        .eq('contractor_id', id);

      console.log('BID STATUSES:', data, 'ERROR:', error);

      if (data) {
        const map: Record<number, string> = {};
        data.forEach((b) => {
          map[b.project_id] = b.status;
        });
        setBidStatuses(map);
      }
    };

    const cleanupExpiredBids = async (id: number) => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('bids')
        .delete()
        .eq('contractor_id', id)
        .eq('status', 'not_selected')
        .lt('not_selected_at', sixHoursAgo);
    };

    const refreshAll = async (id: number) => {
      await cleanupExpiredBids(id);
      await Promise.all([getLeads(), getActiveJobs(id), getBidStatuses(id)]);
    };

    useEffect(() => {
      const init = async () => {
        const id = await resolveContractorId();
        setContractorId(id);
        setResolvingId(false);

        if (id) {
          await getProfile(id);
          await getPortfolio(id);
          await getReviews(id);
          await refreshAll(id);
        }
      };
      init();
    }, []);

    const handleInterested = async (leadId: number) => {
      if (!contractorId) return;

      const { data: existing } = await supabase
        .from('bids')
        .select('id')
        .eq('project_id', leadId)
        .eq('contractor_id', contractorId)
        .maybeSingle();

      if (existing) {
        console.log('Already bid on this project!');
        return;
      }

      const { error } = await supabase.from('bids').insert({
        project_id: leadId,
        contractor_id: contractorId,
        amount: 0,
        status: 'pending',
      });

      if (error) {
        console.log('BID ERROR:', error.message);
      } else {
        console.log('Bid placed!');
        refreshAll(contractorId);
      }
    };

    const handleCancel = async (leadId: number) => {
      if (!contractorId) return;
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
                  .eq('id', contractorId)
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
                  .eq('id', contractorId);

                await supabase
                  .from('bids')
                  .update({ status: 'pending', not_selected_at: null })
                  .eq('project_id', leadId)
                  .eq('status', 'not_selected');

                const { data: myBid } = await supabase
                  .from('bids')
                  .select('id, cancel_count')
                  .eq('project_id', leadId)
                  .eq('contractor_id', contractorId)
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
                await supabase
                  .from('bids')
                  .delete()
                  .eq('project_id', leadId)
                  .eq('contractor_id', contractorId);
              }

              refreshAll(contractorId);
            },
          },
        ]
      );
    };

    const handleConfirmCode = async (leadId: number, enteredCode: string) => {
      if (!contractorId) return;

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
                .eq('contractor_id', contractorId)
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
                .neq('contractor_id', contractorId);

              refreshAll(contractorId);
            },
          },
        ]
      );
    };

    if (resolvingId) {
      return (
        <View style={styles.root}>
          <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#22c55e" />
          </SafeAreaView>
        </View>
      );
    }

    if (!contractorId) {
      return (
        <View style={styles.root}>
          <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.centerWrap}>
            <Text style={styles.emptyText}>Please log in to continue</Text>
            <Pressable style={styles.loginRedirectBtn} onPress={() => router.replace('/welcome')}>
              <Text style={styles.loginRedirectBtnText}>Go to Login</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      );
    }

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
  <Text style={styles.ratingText}>{avgRating > 0 ? avgRating.toFixed(1) : 'New'}</Text>
  <Text style={styles.ratingCount}>({reviewCount} reviews)</Text>
</View>
                </View>
              </LinearGradient>
            </View>

            {/* Portfolio */}
<SectionHeader title="Portfolio" action="" />
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
  <Pressable style={styles.addPhotoBtn} onPress={handleAddPortfolioPhoto} disabled={uploadingPhoto}>
    {uploadingPhoto ? (
      <ActivityIndicator color="#22c55e" />
    ) : (
      <>
        <Ionicons name="camera-outline" size={24} color="#64748b" />
        <Text style={styles.addPhotoText}>Add Photo</Text>
      </>
    )}
  </Pressable>
  {portfolio.map((item: any) => (
    <Image key={item.id} source={{ uri: item.photo_url }} style={styles.portfolioThumb} />
  ))}
</ScrollView>

{/* Active Jobs */}
<SectionHeader title="Active Jobs" action="See all" />

            {/* Active Jobs */}
            <SectionHeader title="Active Jobs" action="See all" />
            {activeJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                contractorId={contractorId}
                onCancel={() => handleCancel(job.id)}
              />
            ))}

            {/* New Leads */}
            <SectionHeader title="New Leads" action="View all" />
            {leads
              .filter((lead) => !activeJobs.some((job) => job.id === lead.id))
              .filter((lead) => bidStatuses[lead.id] !== 'blocked')
              .filter((lead) => !lead.target_contractor_id || lead.target_contractor_id === contractorId)
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
    contractorId,
    onCancel,
  }: {
    job: any;
    contractorId: number;
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
                  `/chat?contractorId=${contractorId}&projectId=${job.id}&clientId=${job.client_id}&viewerRole=contractor` as never
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
    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    emptyText: {
      fontSize: 15,
      color: "#64748b",
      fontWeight: "500",
    },
    loginRedirectBtn: {
      backgroundColor: "#3b82f6",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    loginRedirectBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
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
    addPhotoBtn: {
      width: 90,
      height: 90,
      borderRadius: 14,
      backgroundColor: "rgba(30, 41, 59, 0.5)",
      borderWidth: 1,
      borderColor: "#1e293b",
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    addPhotoText: {
      fontSize: 11,
      color: "#64748b",
      marginTop: 4,
      fontWeight: "500",
    },
    portfolioThumb: {
      width: 90,
      height: 90,
      borderRadius: 14,
      marginRight: 10,
      backgroundColor: "#1e293b",
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
    tabLabelActive: {
      color: "#22c55e",
    },
  });
