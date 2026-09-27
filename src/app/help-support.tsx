import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentProfileId, getCurrentRole } from "../lib/currentProfile";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";

export default function HelpSupportScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();

  const [userId, setUserId] = useState<number | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [openTicket, setOpenTicket] = useState<any>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");

  const resolveIdentity = async (): Promise<{ id: number; role: string } | null> => {
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
  };

  const loadTickets = async (id: number) => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    if (data) setTickets(data);
  };

  useEffect(() => {
    const init = async () => {
      const identity = await resolveIdentity();
      if (!identity) {
        setLoading(false);
        return;
      }
      setUserId(identity.id);
      setUserType(identity.role);
      await loadTickets(identity.id);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      router.back();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const handleCreateTicket = async () => {
    if (!userId || !userType || !subject.trim() || !firstMessage.trim() || submitting) return;
    setSubmitting(true);

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({ user_id: userId, user_type: userType, subject: subject.trim(), status: 'open' })
      .select()
      .single();

    if (error || !ticket) {
      setSubmitting(false);
      return;
    }

    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'user',
      message: firstMessage.trim(),
    });

    setSubject("");
    setFirstMessage("");
    setSubmitting(false);
    setNewModalOpen(false);
    await loadTickets(userId);
  };

  const openThread = async (ticket: any) => {
    setOpenTicket(ticket);
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    if (data) setThreadMessages(data);
  };

  const sendReply = async () => {
    if (!openTicket || !replyText.trim()) return;

    await supabase.from('support_messages').insert({
      ticket_id: openTicket.id,
      sender_type: 'user',
      message: replyText.trim(),
    });

    if (openTicket.status === 'resolved') {
      await supabase.from('support_tickets').update({ status: 'open' }).eq('id', openTicket.id);
    }

    setReplyText("");
    await openThread(openTicket);
    if (userId) await loadTickets(userId);
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

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />
      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Help & Support</Text>
          <Pressable style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} onPress={() => setNewModalOpen(true)}>
            <Ionicons name="add" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        {tickets.length === 0 ? (
          <View style={styles.centerWrap}>
            <Ionicons name="help-buoy-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No support tickets yet</Text>
            <Pressable style={styles.newTicketBtnWrap} onPress={() => setNewModalOpen(true)}>
              <LinearGradient colors={[colors.blue, colors.blueDark]} style={styles.newTicketBtn}>
                <Text style={styles.newTicketBtnText}>Raise a Ticket</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {tickets.map((t) => (
              <Pressable key={t.id} style={[styles.ticketCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => openThread(t)}>
                <View style={styles.ticketTop}>
                  <Text style={[styles.ticketSubject, { color: colors.textPrimary }]}>{t.subject}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.gold + '26', borderColor: colors.gold + '4D' }, t.status === 'resolved' && { backgroundColor: colors.green + '26', borderColor: colors.green + '4D' }]}>
                    <Text style={[styles.statusText, { color: colors.gold }, t.status === 'resolved' && { color: colors.green }]}>
                      {t.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.ticketDate, { color: colors.textMuted }]}>{new Date(t.created_at).toLocaleDateString()}</Text>
              </Pressable>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      {/* New ticket modal */}
      <Modal visible={newModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Raise a Support Ticket</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Subject"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe your issue..."
              placeholderTextColor={colors.textMuted}
              value={firstMessage}
              onChangeText={setFirstMessage}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalCancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setNewModalOpen(false)}>
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirmBtn, { backgroundColor: colors.blue }]} onPress={handleCreateTicket} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Thread modal */}
      <Modal visible={openTicket !== null} animationType="slide">
        <View style={[styles.root, { backgroundColor: colors.bg }]}>
          <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={styles.header}>
                <Pressable
                  style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
                  onPress={() => setOpenTicket(null)}
                >
                  <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{openTicket?.subject}</Text>
                <View style={styles.backBtn} />
              </View>

              <ScrollView style={styles.scroll} contentContainerStyle={styles.threadContent}>
                {threadMessages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.messageRow,
                      m.sender_type === 'user' ? styles.messageRowSent : styles.messageRowReceived,
                    ]}
                  >
                    <View style={[styles.bubble, m.sender_type === 'user' ? { backgroundColor: colors.blue } : { backgroundColor: colors.surfaceSolid, borderWidth: 1, borderColor: colors.border }]}>
                      {m.sender_type !== 'user' && <Text style={[styles.adminLabel, { color: colors.green }]}>Konnect Support</Text>}
                      <Text style={m.sender_type === 'user' ? styles.messageTextSent : [styles.messageTextReceived, { color: colors.textPrimary }]}>
                        {m.message}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSolid, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Type a reply..."
                  placeholderTextColor={colors.textMuted}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                />
                <Pressable style={[styles.sendBtn, { backgroundColor: colors.blue }]} onPress={sendReply} disabled={!replyText.trim()}>
                  <Ionicons name="send" size={18} color="#ffffff" />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glowGreen: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110 },
  glowBlue: { position: "absolute", bottom: 120, left: -80, width: 260, height: 260, borderRadius: 130 },
  safe: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, fontWeight: "500" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  newTicketBtnWrap: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  newTicketBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  newTicketBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  ticketCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  ticketTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  ticketSubject: { flex: 1, fontSize: 15, fontWeight: "700", marginRight: 8 },
  ticketDate: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", borderRadius: 20, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1, marginBottom: 14 },
  modalTextArea: { minHeight: 100, textAlignVertical: "top" },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  modalCancelBtnText: { fontSize: 14, fontWeight: "600" },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalConfirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  threadContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 10 },
  messageRow: { flexDirection: "row", marginBottom: 4 },
  messageRowSent: { justifyContent: "flex-end" },
  messageRowReceived: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  adminLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  messageTextSent: { color: "#ffffff", fontSize: 15, lineHeight: 21, fontWeight: "500" },
  messageTextReceived: { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});