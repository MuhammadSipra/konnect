import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';

export default function PhotoViewerModal({
  visible,
  photos,
  index,
  onClose,
}: {
  visible: boolean;
  photos: string[];
  index: number;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <ImageViewer
        imageUrls={photos.map((url) => ({ url }))}
        index={index}
        onCancel={onClose}
        enableSwipeDown
        onSwipeDown={onClose}
        backgroundColor="#000000"
        saveToLocalByLongPress={false}
        renderHeader={() => (
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        )}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});