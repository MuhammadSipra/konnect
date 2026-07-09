import { useState, useRef } from "react";
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

type Message = {
  id: string;
  text: string;
  time: string;
  sent: boolean;
};

const SAMPLE_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Hi Rajesh! I saw your profile. Are you available for a kitchen renovation?",
    time: "10:12 AM",
    sent: false,
  },
  {
    id: "2",
    text: "Yes, I'm available! I'd love to help with your kitchen project. What's the location?",
    time: "10:14 AM",
    sent: true,
  },
  {
    id: "3",
    text: "It's in Andheri West. Budget is around ₹85,000 for full renovation.",
    time: "10:15 AM",
    sent: false,
  },
  {
    id: "4",
    text: "That works. I can visit this weekend for a site inspection and share a detailed quote.",
    time: "10:18 AM",
    sent: true,
  },
  {
    id: "5",
    text: "Saturday morning works for me. Can you come around 10 AM?",
    time: "10:20 AM",
    sent: false,
  },
  {
    id: "6",
    text: "Done! I'll be there at 10 AM on Saturday. See you then! 👍",
    time: "10:22 AM",
    sent: true,
  },
];

export default function ChatScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const contactName = name ?? "Priya Sharma";
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [input, setInput] = useState("");

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sent: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
                {contactName}
              </Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
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
            <View style={styles.projectTag}>
              <Ionicons name="construct-outline" size={14} color="#22c55e" />
              <Text style={styles.projectTagText}>Kitchen Renovation · Andheri West</Text>
            </View>

            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  msg.sent ? styles.messageRowSent : styles.messageRowReceived,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    msg.sent ? styles.bubbleSent : styles.bubbleReceived,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.sent ? styles.messageTextSent : styles.messageTextReceived,
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      msg.sent ? styles.messageTimeSent : styles.messageTimeReceived,
                    ]}
                  >
                    {msg.time}
                  </Text>
                </View>
              </View>
            ))}
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
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  onlineText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#22c55e",
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