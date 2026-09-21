import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
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
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";

export default function ChatScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const { contractorId, clientId, projectId, viewerRole } = useLocalSearchParams<{
    contractorId?: string;
    clientId?: string;
    projectId?: string;
    viewerRole?: string;
  }>();
  const scrollRef = useRef<ScrollView>(null);

  const myId = viewerRole === "client" ? Number(clientId) : Number(contractorId);
  const otherId = viewerRole === "client" ? Number(contractorId) : Number(clientId);

  const [otherName, setOtherName] = useState("Chat");
  const [project, setProject] = useState<any>(null);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order('created_at', { ascending: true });

    console.log('MESSAGES:', data, 'ERROR:', error);
    if (data) setMessages(data);
  };

  useEffect(() => {
    const markAsRead = async () => {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('project_id', projectId)
        .eq('sender_id', otherId)
        .eq('receiver_id', myId)
        .eq('is_read', false);
    };

    const loadHeaderInfo = async () => {
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', otherId)
        .single();
      if (otherProfile) setOtherName(otherProfile.name);

      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (projectData) setProject(projectData);
    };

    if (otherId && projectId) {
      markAsRead();
      loadHeaderInfo();
      loadMessages();
    }

    // simple polling every 3 seconds until we wire up Supabase Realtime
    const interval = setInterval(() => {
      if (otherId && projectId) loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [otherId, projectId]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !myId || !otherId) return;

    setInput("");

    const { error } = await supabase.from('messages').insert({
      project_id: Number(projectId),
      sender_id: myId,
      receiver_id: otherId,
      content: trimmed,
    });

    if (error) {
      console.log('SEND MESSAGE ERROR:', error.message);
      return;
    }

    await loadMessages();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? "light-content" : "dark-content"} />

      <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowGreen, { backgroundColor: colors.glowGreenBg }]} />
      <View style={[styles.glowBlue, { backgroundColor: colors.glowBlueBg }]} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
                {otherName}
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* Persistent project bar — OLX-style, tap for full details, stays visible while scrolling */}
          {project ? (
            <Pressable style={[styles.projectBar, { backgroundColor: colors.green + '14', borderBottomColor: colors.green + '33' }]} onPress={() => setShowProjectInfo(true)}>
              <Ionicons name="construct-outline" size={15} color={colors.green} />
              <Text style={[styles.projectBarText, { color: colors.green }]} numberOfLines={1}>
                {project.title}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            {messages.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No messages yet. Say hi!</Text>
            ) : (
              messages.map((msg) => {
                const sent = msg.sender_id === myId;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      sent ? styles.messageRowSent : styles.messageRowReceived,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        sent
                          ? { backgroundColor: colors.green }
                          : { backgroundColor: colors.surfaceSolid, borderWidth: 1, borderColor: colors.border },
                        sent ? styles.bubbleSent : styles.bubbleReceived,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          sent ? { color: "#ffffff" } : { color: colors.textPrimary },
                        ]}
                      >
                        {msg.content}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          sent ? { color: "rgba(255,255,255,0.75)" } : { color: colors.textMuted },
                        ]}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSolid, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                input.trim() ? { backgroundColor: colors.green } : { backgroundColor: colors.surfaceSolid, borderWidth: 1, borderColor: colors.border },
                pressed && input.trim() && styles.pressed,
              ]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={input.trim() ? "#ffffff" : colors.textMuted}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Full Project Info — OLX-style bottom sheet */}
      <Modal
        visible={showProjectInfo}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProjectInfo(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowProjectInfo(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalKicker, { color: colors.textMuted }]}>Project Details</Text>
              <Pressable onPress={() => setShowProjectInfo(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {project ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalProjectTitle, { color: colors.textPrimary }]}>{project.title}</Text>

                <View style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Category</Text>
                  <Text style={[styles.modalValue, { color: colors.textPrimary }]}>{project.category}</Text>
                </View>
                <View style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Budget</Text>
                  <Text style={[styles.modalValue, { color: colors.textPrimary }]}>{project.budget}</Text>
                </View>
                <View style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Timeline</Text>
                  <Text style={[styles.modalValue, { color: colors.textPrimary }]}>{project.timeline}</Text>
                </View>
                <View style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Location</Text>
                  <Text style={[styles.modalValue, { color: colors.textPrimary }]}>{project.location}</Text>
                </View>
                <View style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Posted</Text>
                  <Text style={[styles.modalValue, { color: colors.textPrimary }]}>
                    {new Date(project.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {viewerRole === 'client' && (
                  <View style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Confirmation Code</Text>
                    <Text style={[styles.modalValueCode, { color: colors.green }]}>{project.confirmation_code}</Text>
                  </View>
                )}

                <Text style={[styles.modalDescLabel, { color: colors.textMuted }]}>Description</Text>
                <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>{project.description}</Text>
              </ScrollView>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading...</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  glowGreen: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110 },
  glowBlue: { position: "absolute", bottom: 80, left: -80, width: 260, height: 260, borderRadius: 130 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerName: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  headerSpacer: { width: 40 },
  projectBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  projectBarText: { flex: 1, fontSize: 13, fontWeight: "600" },
  messagesScroll: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 10 },
  emptyText: { textAlign: "center", fontSize: 14, marginTop: 40 },
  messageRow: { flexDirection: "row", marginBottom: 4 },
  messageRowSent: { justifyContent: "flex-end" },
  messageRowReceived: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleSent: { borderBottomRightRadius: 4 },
  bubbleReceived: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  messageTime: { fontSize: 10, marginTop: 6, alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "75%", borderWidth: 1 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalKicker: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  modalProjectTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16 },
  modalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1 },
  modalLabel: { fontSize: 14 },
  modalValue: { fontSize: 14, fontWeight: "600" },
  modalValueCode: { fontSize: 16, fontWeight: "800", letterSpacing: 2 },
  modalDescLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  modalDesc: { fontSize: 14, lineHeight: 21, paddingBottom: 20 },
});