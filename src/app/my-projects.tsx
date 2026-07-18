import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function MyProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getMyProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', 1)
        .order('created_at', { ascending: false });

      console.log('MY PROJECTS:', data, 'ERROR:', error);
      if (data) setProjects(data);
      setLoading(false);
    };
    getMyProjects();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#0f172a", "#020617", "#0a0f1a"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowBlue} />
      <View style={styles.glowGreen} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>My Projects</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.centerWrap}>
            <Ionicons name="folder-open-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>No projects posted yet</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {projects.map((project) => (
              <Pressable
                key={project.id}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => router.push(`/project-detail?id=${project.id}` as never)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{project.category}</Text>
                  </View>
                  <Text style={styles.postedTime}>
                    {new Date(project.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={styles.cardTitle}>{project.title}</Text>

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.infoText}>{project.location}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.infoText}>{project.timeline}</Text>
                </View>

                <Text style={styles.cardBudget}>{project.budget}</Text>
              </Pressable>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  glowBlue: {
    position: "absolute",
    top: -60,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  glowGreen: {
    position: "absolute",
    bottom: 120,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
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
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fbbf24",
  },
  postedTime: {
    fontSize: 12,
    color: "#64748b",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  cardBudget: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#22c55e",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
