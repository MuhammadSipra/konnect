import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentProfileId, getCurrentRole } from '../lib/currentProfile';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 40 - 12) / 2;

export default function PortfolioAllScreen() {
  const router = useRouter();
  const { contractorId } = useLocalSearchParams<{ contractorId?: string }>();

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const targetId = contractorId ? Number(contractorId) : getCurrentProfileId();
  const isOwner = getCurrentRole() === 'contractor' && targetId === getCurrentProfileId();

  const loadPhotos = async () => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('portfolio_photos')
      .select('*')
      .eq('contractor_id', targetId)
      .order('created_at', { ascending: false });
    setPhotos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadPhotos();
  }, [targetId]);

  const pickAndUpload = async (source: 'camera' | 'gallery') => {
    if (!targetId) return;

    let result;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow camera access to take a photo.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo access to upload portfolio photos.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
    }

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `portfolio/${targetId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, arrayBuffer, { contentType: blob.type || 'image/jpeg' });

      if (uploadError) {
        Alert.alert("Upload Error", uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

      await supabase.from('portfolio_photos').insert({
        contractor_id: targetId,
        photo_url: urlData.publicUrl,
      });

      await loadPhotos();
    } catch (err) {
      Alert.alert("Error", "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Camera", onPress: () => pickAndUpload('camera') },
      { text: "Gallery", onPress: () => pickAndUpload('gallery') },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDelete = (photo: any) => {
    Alert.alert("Delete Photo", "Remove this photo from your portfolio?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from('portfolio_photos').delete().eq('id', photo.id);
          loadPhotos();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0f172a", "#020617", "#0a0f1a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </Pressable>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <View style={styles.iconBtn} />
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {photos.length === 0 ? (
              <View style={styles.centerWrap}>
                <Ionicons name="images-outline" size={40} color="#475569" />
                <Text style={styles.emptyText}>No portfolio photos yet.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {photos.map((photo) => (
                  <Pressable
                    key={photo.id}
                    onLongPress={() => isOwner && handleDelete(photo)}
                    style={[styles.gridItemWrap, { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE }]}
                  >
                    <Image source={{ uri: photo.photo_url }} style={styles.gridItem} />
                    {isOwner && (
                      <Pressable style={styles.deleteBadge} onPress={() => handleDelete(photo)}>
                        <Ionicons name="trash-outline" size={14} color="#fff" />
                      </Pressable>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
            <View style={{ height: isOwner ? 100 : 40 }} />
          </ScrollView>
        )}

        {isOwner && (
          <View style={styles.uploadBarWrap}>
            <SafeAreaView edges={["bottom"]}>
              <Pressable style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed]} onPress={handleAddPhoto} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.uploadBtnText}>Upload Photo</Text>
                  </>
                )}
              </Pressable>
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(30,41,59,0.8)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1e293b" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, color: "#64748b", fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItemWrap: { borderRadius: 14, overflow: "hidden", backgroundColor: "#1e293b" },
  gridItem: { width: "100%", height: "100%" },
  deleteBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBarWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#22c55e",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  uploadBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});