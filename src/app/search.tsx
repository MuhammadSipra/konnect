import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const RECENT = ["Kitchen renovation", "Interior designer", "Electrician Mumbai", "Civil contractor"];
const POPULAR = ["Full home renovation", "Modular kitchen", "Office interior", "Bathroom tiling", "Painting", "Plumbing"];

const RESULTS = [
  { id: "1", name: "Rajesh Kumar", skill: "Civil Contractor · Full Project", rating: 4.8, reviews: 127, distance: "1.2 km", initials: "RK", color: "#22c55e" },
  { id: "2", name: "Amit Patel", skill: "Interior Designer", rating: 4.9, reviews: 89, distance: "2.4 km", initials: "AP", color: "#3b82f6" },
  { id: "3", name: "Suresh Reddy", skill: "Electrician & Plumber", rating: 4.7, reviews: 203, distance: "3.1 km", initials: "SR", color: "#a855f7" },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contractors, services..."
              placeholderTextColor="#64748b"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => setSearched(true)}
              autoFocus
            />
            {query.length > 0 && (
              <Pressable onPress={() => { setQuery(""); setSearched(false); }}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </Pressable>
            )}
          </View>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!searched ? (
            <>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <View style={styles.tagsWrap}>
                {RECENT.map((r) => (
                  <Pressable key={r} style={styles.tag} onPress={() => { setQuery(r); setSearched(true); }}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.tagText}>{r}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.sectionTitle}>Popular Searches</Text>
              <View style={styles.tagsWrap}>
                {POPULAR.map((p) => (
                  <Pressable key={p} style={[styles.tag, styles.tagPopular]} onPress={() => { setQuery(p); setSearched(true); }}>
                    <Text style={styles.tagText}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.resultCount}>{RESULTS.length} contractors found</Text>
              {RESULTS.map((c) => (
                <Pressable key={c.id} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                  <LinearGradient colors={[c.color, c.color + "cc"]} style={styles.avatar}>
                    <Text style={styles.avatarText}>{c.initials}</Text>
                  </LinearGradient>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName}>{c.name}</Text>
                    <Text style={styles.cardSkill}>{c.skill}</Text>
                    <View style={styles.cardMeta}>
                      <Ionicons name="star" size={13} color="#fbbf24" />
                      <Text style={styles.ratingText}>{c.rating}</Text>
                      <Text style={styles.reviewText}>({c.reviews})</Text>
                      <View style={styles.dot} />
                      <Ionicons name="location-outline" size={13} color="#64748b" />
                      <Text style={styles.distanceText}>{c.distance}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#475569" />
                </Pressable>
              ))}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30,41,59,0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(30,41,59,0.7)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#1e293b" },
  searchInput: { flex: 1, fontSize: 15, color: "#f8fafc", padding: 0 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#f1f5f9", marginBottom: 12, marginTop: 8 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#1e293b" },
  tagPopular: { backgroundColor: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)" },
  tagText: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  resultCount: { fontSize: 14, color: "#64748b", marginBottom: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1e293b", gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#f8fafc" },
  cardSkill: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#fbbf24" },
  reviewText: { fontSize: 12, color: "#64748b" },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#475569" },
  distanceText: { fontSize: 12, color: "#64748b" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});