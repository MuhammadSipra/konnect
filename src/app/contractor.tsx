import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlert } from '../lib/AppAlert';
import { getCurrentProfileId, setCurrentProfile } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';

  const TABS = [
    { key: "home", label: "Home", icon: "home" as const, route: "/contractor" },
    { key: "jobs", label: "Jobs", icon: "briefcase" as const, route: "/jobs" },
    { key: "messages", label: "Messages", icon: "chatbubbles" as const, route: "/messages" },
    { key: "profile", label: "Profile", icon: "person" as const, route: "/profile" },
  ];

  const CONTRACTOR_CANCEL_REASONS = [
    "Client changed requirements",
    "Price or budget issue",
    "Can't take the project right now",
    "Other",
  ];

  export default function ContractorDashboard() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [contractorId, setContractorId] = useState<number | null>(null);
    const [resolvingId, setResolvingId] = useState(true);

    const [profile, setProfile] = useState<any>(null);
    const [avgRating, setAvgRating] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);
    const [leads, setLeads] = useState<any[]>([]);
    const [activeJobs, setActiveJobs] = useState<any[]>([]);
    const [bidStatuses, setBidStatuses] = useState<Record<number, string>>({});
    const [bidCancelInfo, setBidCancelInfo] = useState<Record<number, { cancelled_by?: string; cancellation_reason?: string }>>({});
    const [portfolio, setPortfolio] = useState<any[]>([]);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [cancelReasonLeadId, setCancelReasonLeadId] = useState<number | null>(null);

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

    const getReviews = async (id: number) => {
      const { data } = await supabase.from('reviews').select('rating').eq('contractor_id', id);
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAvgRating(avg);
        setReviewCount(data.length);
      }
    };

    const uploadPortfolioPhoto = async (uri: string) => {
      if (!contractorId) return;
      setUploadingPhoto(true);
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `portfolio/${contractorId}_${Date.now()}.${fileExt}`;
    
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, arrayBuffer, { contentType: blob.type || 'image/jpeg' });
    
        if (uploadError) {
          AppAlert.show("Upload Error", uploadError.message);
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
        AppAlert.show("Error", "Could not upload photo.");
      } finally {
        setUploadingPhoto(false);
      }
    };
    
    const handleAddPortfolioPhoto = () => {
      if (!contractorId) return;
      AppAlert.show("Add Photo", "Choose a source", [
        {
          text: "Camera",
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              AppAlert.show("Permission needed", "Please allow camera access to take a photo.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
            if (!result.canceled && result.assets[0]) await uploadPortfolioPhoto(result.assets[0].uri);
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              AppAlert.show("Permission needed", "Please allow photo access to upload portfolio photos.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) await uploadPortfolioPhoto(result.assets[0].uri);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
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
        .select('project_id, status, cancelled_by, cancellation_reason')
        .eq('contractor_id', id);

      console.log('BID STATUSES:', data, 'ERROR:', error);

      if (data) {
        const map: Record<number, string> = {};
        const cancelMap: Record<number, { cancelled_by?: string; cancellation_reason?: string }> = {};
        data.forEach((b) => {
          map[b.project_id] = b.status;
          cancelMap[b.project_id] = { cancelled_by: b.cancelled_by, cancellation_reason: b.cancellation_reason };
        });
        setBidStatuses(map);
        setBidCancelInfo(cancelMap);
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

    const handleExitApp = () => {
      AppAlert.show(
        "Exit Konnect?",
        "Are you sure you want to exit the app?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
        ]
      );
    };

    useEffect(() => {
      const onBackPress = () => {
        handleExitApp();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
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

    // Cancelling a bid that was never confirmed = always free, no reason needed.
    // Cancelling a CONFIRMED bid = opens the reason picker below.
    const handleCancel = async (leadId: number) => {
      if (!contractorId) return;
      const status = bidStatuses[leadId];
      const isConfirmedBid = status === 'confirmed' || status === 'accepted';

      if (isConfirmedBid) {
        setCancelReasonLeadId(leadId);
        return;
      }

      AppAlert.show(
        "Cancel Interest",
        "Are you sure you want to withdraw your interest? No penalty applies before confirmation.",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: async () => {
              await supabase
                .from('bids')
                .delete()
                .eq('project_id', leadId)
                .eq('contractor_id', contractorId);
              refreshAll(contractorId);
            },
          },
        ]
      );
    };

    // Contractor-initiated cancellation of a CONFIRMED bid: keeps the existing
    // penalty rules (1st free, 2nd+ trust/wallet hit, per-project block after 2nd).
    const submitContractorCancellation = async (reason: string) => {
      if (!contractorId || cancelReasonLeadId === null) return;
      const leadId = cancelReasonLeadId;
      setCancelReasonLeadId(null);

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
          cancelled_by: 'contractor',
          cancellation_reason: reason,
        })
        .eq('id', myBid?.id);

      refreshAll(contractorId);
    };

    const handleConfirmCode = async (leadId: number, enteredCode: string) => {
      if (!contractorId) return;

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('confirmation_code')
        .eq('id', leadId)
        .single();

      if (projectError || !projectData) {
        AppAlert.show("Error", "Could not verify code. Try again.");
        return;
      }

      if (enteredCode.trim() !== projectData.confirmation_code) {
        AppAlert.show("Wrong Code", "The code you entered doesn't match. Please check with the client and try again.");
        return;
      }

      AppAlert.show(
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
        <View style={[styles.root, { backgroundColor: colors.bg }]}>
          <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.centerWrap}>
            <ActivityIndicator size="large" color={colors.green} />
          </SafeAreaView>
        </View>
      );
    }

    if (!contractorId) {
      return (
        <View style={[styles.root, { backgroundColor: colors.bg }]}>
          <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.centerWrap}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Please log in to continue</Text>
            <Pressable style={[styles.loginRedirectBtn, { backgroundColor: colors.blue }]} onPress={() => router.replace('/welcome')}>
              <Text style={styles.loginRedirectBtnText}>Go to Login</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      );
    }

    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />

        <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
        <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
        <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

        <SafeAreaView style={styles.safe} edges={["top"]}>
          {/* Header */}
          <View style={styles.header}>
          <Pressable
  style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
  onPress={handleExitApp}
>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Contractor Dashboard</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile */}
            <View style={[styles.profileCard, { borderColor: colors.border }]}>
              <LinearGradient
                colors={colors.cardGradient}
                style={styles.profileGradient}
              >
               <View style={[styles.avatar, { backgroundColor: colors.green }]}>
  {profile?.profile_photo_url ? (
    <Image source={{ uri: profile.profile_photo_url }} style={styles.avatarImage} />
  ) : (
    <Text style={styles.avatarText}>
      {profile?.name
        ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '..'}
    </Text>
  )}
</View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: colors.textPrimary }]}>{profile?.name || 'Loading...'}</Text>
                  <Text style={[styles.profileSkill, { color: colors.textSecondary }]}>{profile?.skill || ''}</Text>
                  <View style={styles.ratingRow}>
  <Ionicons name="star" size={16} color={colors.gold} />
  <Text style={[styles.ratingText, { color: colors.gold }]}>{avgRating > 0 ? avgRating.toFixed(1) : 'New'}</Text>
  <Text style={[styles.ratingCount, { color: colors.textMuted }]}>({reviewCount} reviews)</Text>
</View>
                </View>
              </LinearGradient>
            </View>

            {/* Portfolio */}
            <SectionHeader
  title="Portfolio"
  action={portfolio.length > 0 ? "View All" : ""}
  onAction={() => router.push('/portfolio-all' as never)}
/>
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
  <Pressable style={[styles.addPhotoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleAddPortfolioPhoto} disabled={uploadingPhoto}>
    {uploadingPhoto ? (
      <ActivityIndicator color={colors.green} />
    ) : (
      <>
        <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
        <Text style={[styles.addPhotoText, { color: colors.textMuted }]}>Add Photo</Text>
      </>
    )}
  </Pressable>
  {portfolio.slice(0, 3).map((item: any) => (
    <Image key={item.id} source={{ uri: item.photo_url }} style={[styles.portfolioThumb, { backgroundColor: colors.surfaceSolid }]} />
  ))}
</ScrollView>

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
              .filter((lead) => bidStatuses[lead.id] !== 'completed')
              .filter((lead) => !lead.target_contractor_id || lead.target_contractor_id === contractorId)
              .map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  bidStatus={bidStatuses[lead.id]}
                  cancelInfo={bidCancelInfo[lead.id]}
                  contractorId={contractorId}
                  onInterested={() => handleInterested(lead.id)}
                  onCancel={() => handleCancel(lead.id)}
                  onConfirmCode={(code) => handleConfirmCode(lead.id, code)}
                />
              ))}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom Tab Bar */}
          <View style={[styles.tabBarWrap, { backgroundColor: colors.surfaceSolid, borderTopColor: colors.border }]}>
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
                        router.replace(tab.route as never);
                      }}
                    >
                      <Ionicons
                        name={active ? tab.icon : (`${tab.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                        size={22}
                        color={active ? colors.green : colors.textMuted}
                      />
                      <Text style={[styles.tabLabel, { color: active ? colors.green : colors.textMuted }]}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SafeAreaView>
          </View>
        </SafeAreaView>

        {/* Cancellation reason picker — shown for CONFIRMED bids only */}
        <Modal visible={cancelReasonLeadId !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Why are you cancelling?</Text>
              <View style={{ marginTop: 16, gap: 10 }}>
                {CONTRACTOR_CANCEL_REASONS.map((reason) => (
                  <Pressable
                    key={reason}
                    style={[styles.reasonOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => submitContractorCancellation(reason)}
                  >
                    <Text style={[styles.reasonOptionText, { color: colors.textPrimary }]}>{reason}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.modalDismissBtn} onPress={() => setCancelReasonLeadId(null)}>
                <Text style={[styles.modalDismissBtnText, { color: colors.textMuted }]}>Never mind</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction?: () => void }) {
    const { colors } = useTheme();
    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Pressable onPress={onAction}>
          <Text style={[styles.sectionAction, { color: colors.green }]}>{action}</Text>
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
    const { colors } = useTheme();
    return (
      <Pressable style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{job.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.green + '26', borderColor: colors.green + '59' }]}>
            <Text style={[styles.statusText, { color: colors.green }]}>Active</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.cardDetail, { color: colors.textMuted }]}>{job.location}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[styles.cardBudget, { color: colors.green }]}>{job.budget}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable
              style={styles.messageBtn}
              onPress={() =>
                router.push(
                  `/chat?contractorId=${contractorId}&projectId=${job.id}&clientId=${job.client_id}&viewerRole=contractor` as never
                )
              }
            >
              <Ionicons name="chatbubble-outline" size={13} color={colors.blue} />
              <Text style={[styles.messageBtnText, { color: colors.blue }]}>Message</Text>
            </Pressable>
            <Pressable onPress={onCancel}>
              <Text style={[styles.cancelLink, { color: colors.red }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  }

  function LeadCard({
    lead,
    bidStatus,
    cancelInfo,
    contractorId,
    onInterested,
    onCancel,
    onConfirmCode,
  }: {
    lead: any;
    bidStatus?: string;
    cancelInfo?: { cancelled_by?: string; cancellation_reason?: string };
    contractorId: number;
    onInterested: () => void;
    onCancel: () => void;
    onConfirmCode: (code: string) => void;
  }) {
    const router = useRouter();
    const { colors } = useTheme();
    const [codeInput, setCodeInput] = useState("");
    const isTargeted = lead.target_contractor_id === contractorId;
    const isLocked = bidStatus === 'locked';
    const isConfirmed = bidStatus === 'accepted' || bidStatus === 'confirmed';
    const isPending = bidStatus === 'pending';
    const isCancelled =
      bidStatus === 'cancelled' ||
      bidStatus === 'cancelled_by_client' ||
      bidStatus === 'cancelled_by_contractor';
    const isNotSelected = bidStatus === 'not_selected';
    const wasClientCancelled = isPending && cancelInfo?.cancelled_by === 'client';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          styles.leadCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isTargeted && { borderColor: colors.gold + '59', backgroundColor: colors.gold + '0A' },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.leadAccent, { backgroundColor: isTargeted ? colors.gold : colors.blue }]} />
        <View style={styles.leadContent}>
          {isTargeted && (
            <View style={styles.targetedBadge}>
              <Ionicons name="star" size={10} color={colors.gold} />
              <Text style={[styles.targetedBadgeText, { color: colors.gold }]}>Sent to you directly</Text>
            </View>
          )}
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{lead.title}</Text>
            <Text style={[styles.leadTime, { color: colors.textMuted }]}>{new Date(lead.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.cardDetail, { color: colors.textMuted }]}>{lead.location}</Text>
          </View>

          {isLocked && (
  <View style={[styles.codeEntryWrap, { backgroundColor: colors.gold + '14', borderColor: colors.gold + '40' }]}>
    <Text style={[styles.codeEntryLabel, { color: colors.gold }]}>
      Client shortlisted you! Message them to discuss, then enter the code they share:
    </Text>
    <Pressable
      style={styles.messageBtn}
      onPress={() =>
        router.push(
          `/chat?contractorId=${contractorId}&projectId=${lead.id}&clientId=${lead.client_id}&viewerRole=contractor` as never
        )
      }
    >
      <Ionicons name="chatbubble-outline" size={13} color={colors.blue} />
      <Text style={[styles.messageBtnText, { color: colors.blue }]}>Message Client</Text>
    </Pressable>
    <View style={styles.codeEntryRow}>
      <TextInput
        style={[styles.codeInput, { backgroundColor: colors.surfaceSolid, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="4-digit code"
        placeholderTextColor={colors.textMuted}
        value={codeInput}
        onChangeText={setCodeInput}
        keyboardType="number-pad"
        maxLength={4}
      />
      <Pressable style={[styles.codeSubmitBtn, { backgroundColor: colors.blue }]} onPress={() => onConfirmCode(codeInput)}>
        <Text style={styles.codeSubmitText}>Confirm</Text>
      </Pressable>
    </View>
  </View>
)}

          <View style={styles.leadFooter}>
            <Text style={[styles.cardBudget, { color: colors.green }]}>{lead.budget}</Text>

            {isConfirmed ? (
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <View style={[styles.confirmedBadge, { backgroundColor: colors.green + '26', borderColor: colors.green + '59' }]}>
                  <Text style={[styles.confirmedBadgeText, { color: colors.green }]}>Confirmed</Text>
                </View>
                <Pressable onPress={onCancel}>
                  <Text style={[styles.cancelLink, { color: colors.red }]}>Cancel</Text>
                </Pressable>
              </View>
            ) : isLocked ? null : isPending ? (
              <View style={{ alignItems: "flex-end", gap: 4, maxWidth: 160 }}>
                {wasClientCancelled ? (
                  <>
                    <View style={styles.warningBadge}>
                      <Text style={styles.warningBadgeText}>Client Cancelled</Text>
                    </View>
                    <Text style={styles.cancelledHelperText}>
                      You were confirmed{cancelInfo?.cancellation_reason ? ` — ${cancelInfo.cancellation_reason}` : ''}
                    </Text>
                  </>
                ) : (
                  <View style={[styles.pendingBadge, { backgroundColor: colors.gold + '26', borderColor: colors.gold + '59' }]}>
                    <Text style={[styles.pendingBadgeText, { color: colors.gold }]}>Pending</Text>
                  </View>
                )}
                <Pressable onPress={onCancel}>
                  <Text style={[styles.cancelLink, { color: colors.red }]}>Cancel</Text>
                </Pressable>
              </View>
            ) : isCancelled ? (
              <View style={[styles.cancelledBadge, { backgroundColor: colors.red + '26', borderColor: colors.red + '59' }]}>
                <Text style={[styles.cancelledBadgeText, { color: colors.red }]}>Cancelled</Text>
              </View>
            ) : isNotSelected ? (
              <View style={[styles.cancelledBadge, { backgroundColor: colors.red + '26', borderColor: colors.red + '59' }]}>
                <Text style={[styles.cancelledBadgeText, { color: colors.red }]}>Went to another contractor</Text>
              </View>
            ) : (
              <Pressable style={[styles.interestBtn, { backgroundColor: colors.blueDark }]} onPress={onInterested}>
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
    },
    glowGreen: {
      position: "absolute",
      top: -60,
      right: -40,
      width: 220,
      height: 220,
      borderRadius: 110,
    },
    glowBlue: {
      position: "absolute",
      bottom: 120,
      left: -80,
      width: 260,
      height: 260,
      borderRadius: 130,
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
      fontWeight: "500",
    },
    loginRedirectBtn: {
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
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
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
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 22,
      fontWeight: "800",
      color: "#ffffff",
    },
    avatarImage: { width: 64, height: 64, borderRadius: 32 },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    profileSkill: {
      marginTop: 4,
      fontSize: 14,
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
    },
    ratingCount: {
      fontSize: 13,
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
    },
    sectionAction: {
      fontSize: 14,
      fontWeight: "600",
    },
    targetedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 6,
    },
    targetedBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    addPhotoBtn: {
      width: 90,
      height: 90,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    addPhotoText: {
      fontSize: 11,
      marginTop: 4,
      fontWeight: "500",
    },
    portfolioThumb: {
      width: 90,
      height: 90,
      borderRadius: 14,
      marginRight: 10,
    },
    card: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
    },
    leadCard: {
      flexDirection: "row",
      overflow: "hidden",
      padding: 0,
    },
    leadAccent: {
      width: 4,
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
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "700",
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
    },
    cardBudget: {
      marginTop: 10,
      fontSize: 16,
      fontWeight: "700",
    },
    leadTime: {
      fontSize: 12,
      fontWeight: "500",
    },
    leadFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    },
    interestBtn: {
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
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    pendingBadgeText: {
      fontSize: 13,
      fontWeight: "700",
    },
    warningBadge: {
      backgroundColor: "rgba(249, 115, 22, 0.15)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(249, 115, 22, 0.35)",
    },
    warningBadgeText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#f97316",
    },
    cancelledHelperText: {
      fontSize: 11,
      color: "#f97316",
      textAlign: "right",
      fontWeight: "500",
    },
    confirmedBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    confirmedBadgeText: {
      fontSize: 13,
      fontWeight: "700",
    },
    cancelledBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    cancelledBadgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    cancelLink: {
      fontSize: 11,
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
    },
    codeEntryWrap: {
      marginTop: 12,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },
    codeEntryLabel: {
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 8,
    },
    codeEntryRow: {
      flexDirection: "row",
      gap: 8,
    },
    codeInput: {
      flex: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      borderWidth: 1,
    },
    codeSubmitBtn: {
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
      borderTopWidth: 1,
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
    },
    tabLabelActive: {},
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    modalCard: {
      width: "100%",
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
    },
    reasonOption: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    reasonOptionText: {
      fontSize: 14,
      fontWeight: "600",
    },
    modalDismissBtn: {
      marginTop: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    modalDismissBtnText: {
      fontSize: 14,
      fontWeight: "600",
    },
  });