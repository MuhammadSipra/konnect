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

export default function ChatScreen() {
  const router = useRouter();
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#0f172a", "#020617", "#0a0f1a"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#f8fafc" />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerName} numberOfLines={1}>
                {otherName}
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* Persistent project bar — OLX-style, tap for full details, stays visible while scrolling */}
          {project ? (
            <Pressable style={styles.projectBar} onPress={() => setShowProjectInfo(true)}>
              <Ionicons name="construct-outline" size={15} color="#22c55e" />
              <Text style={styles.projectBarText} numberOfLines={1}>
                {project.title}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#64748b" />
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
              <Text style={styles.emptyText}>No messages yet. Say hi!</Text>
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
                        sent ? styles.bubbleSent : styles.bubbleReceived,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          sent ? styles.messageTextSent : styles.messageTextReceived,
                        ]}
                      >
                        {msg.content}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          sent ? styles.messageTimeSent : styles.messageTimeReceived,
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
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#64748b"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !input.trim() && styles.sendBtnDisabled,
                pressed && input.trim() && styles.pressed,
              ]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={input.trim() ? "#ffffff" : "#64748b"}
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
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalKicker}>Project Details</Text>
              <Pressable onPress={() => setShowProjectInfo(false)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </Pressable>
            </View>

            {project ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalProjectTitle}>{project.title}</Text>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Category</Text>
                  <Text style={styles.modalValue}>{project.category}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Budget</Text>
                  <Text style={styles.modalValue}>{project.budget}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Timeline</Text>
                  <Text style={styles.modalValue}>{project.timeline}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Location</Text>
                  <Text style={styles.modalValue}>{project.location}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Posted</Text>
                  <Text style={styles.modalValue}>
                    {new Date(project.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {viewerRole === 'client' && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Confirmation Code</Text>
                    <Text style={styles.modalValueCode}>{project.confirmation_code}</Text>
                  </View>
                )}

                <Text style={styles.modalDescLabel}>Description</Text>
                <Text style={styles.modalDesc}>{project.description}</Text>
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>Loading...</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  flex: {
    flex: 1,
  },
  glowGreen: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  glowBlue: {
    position: "absolute",
    bottom: 80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 40,
  },
  projectBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(34, 197, 94, 0.2)",
  },
  projectBarText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#22c55e",
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    marginTop: 40,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  messageRowSent: {
    justifyContent: "flex-end",
  },
  messageRowReceived: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleSent: {
    backgroundColor: "#22c55e",
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextSent: {
    color: "#ffffff",
    fontWeight: "500",
  },
  messageTextReceived: {
    color: "#e2e8f0",
    fontWeight: "500",
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: "flex-end",
  },
  messageTimeSent: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  messageTimeReceived: {
    color: "#64748b",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "75%",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalKicker: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalProjectTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  modalLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  modalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f8fafc",
  },
  modalValueCode: {
    fontSize: 16,
    fontWeight: "800",
    color: "#22c55e",
    letterSpacing: 2,
  },
  modalDescLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 21,
    paddingBottom: 20,
  },
});