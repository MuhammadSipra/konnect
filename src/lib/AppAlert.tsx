import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

let showFn: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

export const AppAlert = {
  show(title: string, message?: string, buttons?: AlertButton[]) {
    showFn?.(title, message, buttons);
  },
};

export function AppAlertHost() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | undefined>('');
  const [buttons, setButtons] = useState<AlertButton[]>([{ text: 'OK' }]);

  useEffect(() => {
    showFn = (t, m, b) => {
      setTitle(t);
      setMessage(m);
      setButtons(b && b.length > 0 ? b : [{ text: 'OK' }]);
      setVisible(true);
    };
    return () => {
      showFn = null;
    };
  }, []);

  const handlePress = (btn: AlertButton) => {
    setVisible(false);
    btn.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.green + '22' }]}>
            <Ionicons name="information-circle" size={24} color={colors.green} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}
          <View style={styles.btnRow}>
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.btn,
                    isCancel && { backgroundColor: colors.border },
                    isDestructive && { backgroundColor: colors.red + '18', borderWidth: 1, borderColor: colors.red + '40' },
                    !isCancel && !isDestructive && { backgroundColor: colors.green },
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isCancel && { color: colors.textSecondary },
                      isDestructive && { color: colors.red },
                      !isCancel && !isDestructive && { color: '#ffffff' },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  card: { width: '100%', borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
});