import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
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

export default function HelpSupportScreen() {
  const router = useRouter();

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
      <View style={styles.root}>
        <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => setNewModalOpen(true)}>
            <Ionicons name="add" size={22} color="#f8fafc" />
          </Pressable>
        </View>

        {tickets.length === 0 ? (
          <View style={styles.centerWrap}>
            <Ionicons name="help-buoy-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>No support tickets yet</Text>
            <Pressable style={styles.newTicketBtnWrap} onPress={() => setNewModalOpen(true)}>
              <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.newTicketBtn}>
                <Text style={styles.newTicketBtnText}>Raise a Ticket</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {tickets.map((t) => (
              <Pressable key={t.id} style={styles.ticketCard} onPress={() => openThread(t)}>
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketSubject}>{t.subject}</Text>
                  <View style={[styles.statusBadge, t.status === 'resolved' && styles.statusBadgeResolved]}>
                    <Text style={[styles.statusText, t.status === 'resolved' && styles.statusTextResolved]}>
                      {t.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ticketDate}>{new Date(t.created_at).toLocaleDateString()}</Text>
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
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Raise a Support Ticket</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Subject"
              placeholderTextColor="#64748b"
              value={subject}
              onChangeText={setSubject}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Describe your issue..."
              placeholderTextColor="#64748b"
              value={firstMessage}
              onChangeText={setFirstMessage}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setNewModalOpen(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={handleCreateTicket} disabled={submitting}>
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
        <View style={styles.root}>
          <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={styles.header}>
                <Pressable
                  style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                  onPress={() => setOpenTicket(null)}
                >
                  <Ionicons name="arrow-back" size={22} color="#f8fafc" />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>{openTicket?.subject}</Text>
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
                    <View style={[styles.bubble, m.sender_type === 'user' ? styles.bubbleSent : styles.bubbleReceived]}>
                      {m.sender_type !== 'user' && <Text style={styles.adminLabel}>Konnect Support</Text>}
                      <Text style={m.sender_type === 'user' ? styles.messageTextSent : styles.messageTextReceived}>
                        {m.message}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.inputBar}>
                <TextInput
                  style={styles.input}
                  placeholder="Type a reply..."
                  placeholderTextColor="#64748b"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                />
                <Pressable style={styles.sendBtn} onPress={sendReply} disabled={!replyText.trim()}>
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
  root: { flex: 1, backgroundColor: "#020617" },
  glowGreen: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(34, 197, 94, 0.1)" },
  glowBlue: { position: "absolute", bottom: 120, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(59, 130, 246, 0.08)" },
  safe: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, color: "#64748b", fontWeight: "500" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30, 41, 59, 0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#f8fafc" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  newTicketBtnWrap: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  newTicketBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  newTicketBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  ticketCard: { backgroundColor: "rgba(30, 41, 59, 0.6)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1e293b" },
  ticketTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  ticketSubject: { flex: 1, fontSize: 15, fontWeight: "700", color: "#f8fafc", marginRight: 8 },
  ticketDate: { fontSize: 12, color: "#64748b" },
  statusBadge: { backgroundColor: "rgba(251, 191, 36, 0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "rgba(251, 191, 36, 0.3)" },
  statusBadgeResolved: { backgroundColor: "rgba(34, 197, 94, 0.15)", borderColor: "rgba(34, 197, 94, 0.3)" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#fbbf24", textTransform: "uppercase" },
  statusTextResolved: { color: "#22c55e" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", backgroundColor: "#0f172a", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "#1e293b" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc", marginBottom: 16 },
  modalInput: { backgroundColor: "rgba(30,41,59,0.7)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#f8fafc", borderWidth: 1, borderColor: "#1e293b", marginBottom: 14 },
  modalTextArea: { minHeight: 100, textAlignVertical: "top" },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(30,41,59,0.7)", borderWidth: 1, borderColor: "#1e293b" },
  modalCancelBtnText: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#3b82f6" },
  modalConfirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  threadContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 10 },
  messageRow: { flexDirection: "row", marginBottom: 4 },
  messageRowSent: { justifyContent: "flex-end" },
  messageRowReceived: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleSent: { backgroundColor: "#3b82f6", borderBottomRightRadius: 4 },
  bubbleReceived: { backgroundColor: "rgba(30, 41, 59, 0.85)", borderWidth: 1, borderColor: "#1e293b", borderBottomLeftRadius: 4 },
  adminLabel: { fontSize: 11, fontWeight: "700", color: "#22c55e", marginBottom: 4 },
  messageTextSent: { color: "#ffffff", fontSize: 15, lineHeight: 21, fontWeight: "500" },
  messageTextReceived: { color: "#e2e8f0", fontSize: 15, lineHeight: 21, fontWeight: "500" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#1e293b", backgroundColor: "rgba(15, 23, 42, 0.95)" },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: "rgba(30, 41, 59, 0.7)", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: "#f8fafc", borderWidth: 1, borderColor: "#1e293b" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center" },
});
