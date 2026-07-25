import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
  const [projectTitle, setProjectTitle] = useState("");
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
    const loadHeaderInfo = async () => {
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', otherId)
        .single();
      if (otherProfile) setOtherName(otherProfile.name);

      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();
      if (project) setProjectTitle(project.title);
    };

    if (otherId && projectId) {
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
            {projectTitle ? (
              <View style={styles.projectTag}>
                <Ionicons name="construct-outline" size={14} color="#22c55e" />
                <Text style={styles.projectTagText}>{projectTitle}</Text>
              </View>
            ) : null}

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
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 10,
  },
  projectTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
    marginBottom: 8,
  },
  projectTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22c55e",
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
});
